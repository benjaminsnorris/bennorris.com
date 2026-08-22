#!/usr/bin/env python3
"""Certify candidate positions with Stockfish and label them quiet / tactical.

Reads candidates.jsonl on stdin (from harvest.py), writes certified positions
on stdout as JSONL. Discards are counted, not emitted.

Labelling, from the side to move's point of view:
  |second| <= SECOND_BAND and gap <  QUIET     -> quiet
  |second| <= SECOND_BAND and gap >= TACTICAL  -> tactical
  anything else                                -> discard

Also discards forced recaptures: the previous move was a capture and the best
move recaptures on that same square.
"""
import argparse
import json
import multiprocessing as mp
import os
import sys

import chess
import chess.engine

MATE_SCORE = 30000
_engine = None
_opts = None


def worker_init(opts):
    global _engine, _opts
    _opts = opts
    _engine = chess.engine.SimpleEngine.popen_uci(opts["engine_path"])
    _engine.configure({"Threads": 1, "Hash": 32})


def analyse(candidate):
    board = chess.Board(candidate["fen"])
    try:
        # game=fen forces a ucinewgame before each position. Without it the
        # engine's hash table carries over from whatever this worker analysed
        # last, so the same position returns different evaluations depending on
        # history -- enough to move a borderline |second| across the band. That
        # makes labels unreproducible, which check 6 in the brief exists to
        # catch. Clearing the hash costs a little speed and buys determinism.
        infos = _engine.analyse(
            board,
            chess.engine.Limit(depth=_opts["depth"]),
            multipv=_opts["multipv"],
            game=candidate["fen"],
        )
    except chess.engine.EngineError:
        return None
    if len(infos) < 2:
        return None  # no second-best move to band; cannot certify

    best = infos[0]["score"].relative.score(mate_score=MATE_SCORE)
    second = infos[1]["score"].relative.score(mate_score=MATE_SCORE)
    gap = best - second

    best_move = infos[0].get("pv", [None])[0]
    if best_move is None:
        return None
    if candidate["prev_capture_square"] >= 0 and best_move.to_square == candidate["prev_capture_square"]:
        return {"discard": "recapture"}

    if abs(second) > _opts["second_band"]:
        return {"discard": "second_band"}
    if gap < _opts["quiet"]:
        label = "quiet"
    elif gap >= _opts["tactical"]:
        label = "tactical"
    else:
        return {"discard": "ambiguous_gap"}

    return {
        "fen": candidate["fen"],
        "label": label,
        "best": best,
        "second": second,
        "gap": gap,
        "ply": candidate["ply"],
        "elo": candidate["elo"],
        "material": candidate["material"],
        "pieces": candidate["pieces"],
        "game": candidate["game"],
        "month": candidate["month"],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", default="/opt/homebrew/bin/stockfish")
    ap.add_argument("--depth", type=int, default=14)
    ap.add_argument("--multipv", type=int, default=3)
    ap.add_argument("--quiet-gap", type=int, default=75)
    ap.add_argument("--tactical-gap", type=int, default=300)
    ap.add_argument("--second-band", type=int, default=100)
    ap.add_argument("--workers", type=int, default=os.cpu_count())
    ap.add_argument("--stop-quiet", type=int, default=0, help="stop once this many quiet found (0 = never)")
    ap.add_argument("--stop-tactical", type=int, default=0)
    ap.add_argument("--progress-every", type=int, default=2000)
    args = ap.parse_args()

    opts = {
        "engine_path": args.engine,
        "depth": args.depth,
        "multipv": args.multipv,
        "quiet": args.quiet_gap,
        "tactical": args.tactical_gap,
        "second_band": args.second_band,
    }

    candidates = (json.loads(line) for line in sys.stdin if line.strip())
    counts = {"quiet": 0, "tactical": 0, "recapture": 0, "second_band": 0, "ambiguous_gap": 0, "failed": 0}
    done = 0

    with mp.Pool(args.workers, initializer=worker_init, initargs=(opts,)) as pool:
        for result in pool.imap_unordered(analyse, candidates, chunksize=16):
            done += 1
            if result is None:
                counts["failed"] += 1
            elif "discard" in result:
                counts[result["discard"]] += 1
            else:
                counts[result["label"]] += 1
                sys.stdout.write(json.dumps(result, separators=(",", ":")) + "\n")
            if args.progress_every and done % args.progress_every == 0:
                print(f"  certified {done}: {counts}", file=sys.stderr, flush=True)
            if (
                args.stop_quiet
                and args.stop_tactical
                and counts["quiet"] >= args.stop_quiet
                and counts["tactical"] >= args.stop_tactical
            ):
                print("  targets reached, stopping", file=sys.stderr, flush=True)
                pool.terminate()
                break

    print(f"certify done: analysed {done}, {counts}", file=sys.stderr)


if __name__ == "__main__":
    main()
