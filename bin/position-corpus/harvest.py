#!/usr/bin/env python3
"""Harvest candidate positions from a Lichess PGN stream.

Reads PGN on stdin, writes one JSON candidate per line on stdout.
Applies every game- and position-level filter that does not need an engine.
The engine-dependent filter (forced recapture) lives in certify.py, because
it needs the best move.

Usage:
  curl -s <url> | zstd -dc | harvest.py --month 2013-01 > candidates.jsonl
"""
import argparse
import json
import random
import sys

import chess
import chess.pgn

VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}

ELO_MIN, ELO_MAX = 1200, 1800
MIN_TC_BASE = 180
MIN_GAME_PLIES = 30
PLY_LO, PLY_HI = 16, 60
MAX_PER_GAME = 3
MIN_PLY_SEPARATION = 10
MIN_PIECES = 12
MAX_MATERIAL = 1

# The position filters above are what the seeds course needed: quiet, materially
# level, middlegame, never in check. They are the defaults, so the certified
# corpus stays reproducible. A drill corpus wants the opposite - the positions
# those filters removed - so each is overridable from the command line, and
# `--relaxed` turns the whole set off at once. See docs/CORPUS.md in the glossary
# project for why, and for what each one unlocks.
LIMITS = dict(ply_lo=PLY_LO, ply_hi=PLY_HI, per_game=MAX_PER_GAME,
              separation=MIN_PLY_SEPARATION, min_pieces=MIN_PIECES,
              max_material=MAX_MATERIAL, allow_check=False, include_final=False)


def tc_base(tc):
    if not tc or tc == "-":
        return None
    try:
        return int(tc.split("+")[0])
    except ValueError:
        return None


def game_id(site):
    return site.rstrip("/").rsplit("/", 1)[-1] if site else ""


def elo(headers, key):
    try:
        return int(headers.get(key, ""))
    except ValueError:
        return None


def game_passes(h):
    w, b = elo(h, "WhiteElo"), elo(h, "BlackElo")
    if w is None or b is None:
        return False
    if not (ELO_MIN <= w <= ELO_MAX and ELO_MIN <= b <= ELO_MAX):
        return False
    base = tc_base(h.get("TimeControl"))
    if base is None or base < MIN_TC_BASE:
        return False
    if h.get("Termination") != "Normal":
        return False
    return True


def material(board):
    total = 0
    for piece_type, value in VALUES.items():
        total += value * len(board.pieces(piece_type, chess.WHITE))
        total -= value * len(board.pieces(piece_type, chess.BLACK))
    return total


def eligible_positions(game, limits=None):
    """Every position in the game that passes the engine-free position filters."""
    lim = limits or LIMITS
    board = game.board()
    out = []
    ply = 0
    for move in game.mainline_moves():
        was_capture = board.is_capture(move)
        to_square = move.to_square
        board.push(move)
        ply += 1
        if ply < lim["ply_lo"]:
            continue
        if ply > lim["ply_hi"]:
            break
        if board.is_check() and not lim["allow_check"]:
            continue
        if chess.popcount(board.occupied) < lim["min_pieces"]:
            continue
        mat = material(board)
        if abs(mat) > lim["max_material"]:
            continue
        out.append(
            {
                "fen": board.fen(),
                "ply": ply,
                "material": mat,
                "pieces": chess.popcount(board.occupied),
                "prev_capture_square": to_square if was_capture else -1,
            }
        )
    if lim["include_final"] and (board.is_checkmate() or board.is_stalemate()):
        # The last position of the game, when it ends in mate or stalemate. Walking
        # the mainline never yields these as candidates in the ordinary way, so a
        # corpus built without this contains no mates at all.
        out.append({
            "fen": board.fen(), "ply": ply, "material": material(board),
            "pieces": chess.popcount(board.occupied),
            "prev_capture_square": -1, "terminal": "mate" if board.is_checkmate() else "stalemate",
        })
    return out, ply


def pick(positions, rng, limits=None):
    """Up to per_game positions, well separated, chosen without ply bias."""
    lim = limits or LIMITS
    # A terminal position is always kept: it is the whole reason for asking.
    chosen = [p for p in positions if p.get("terminal")]
    rest = [p for p in positions if not p.get("terminal")]
    for candidate in rng.sample(rest, len(rest)):
        if all(abs(candidate["ply"] - c["ply"]) >= lim["separation"] for c in chosen):
            chosen.append(candidate)
            if len(chosen) >= lim["per_game"]:
                break
    return chosen


def dedup_key(fen):
    return " ".join(fen.split(" ")[:4])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", required=True, help="e.g. 2013-01, recorded on each candidate")
    ap.add_argument("--seed", type=int, default=20260822)
    ap.add_argument("--max-candidates", type=int, default=0, help="0 = no limit")
    ap.add_argument("--progress-every", type=int, default=20000)
    ap.add_argument("--relaxed", action="store_true",
                    help="drop the seeds-course position filters: keep checks, any "
                         "material, any piece count, the whole game, and terminal "
                         "positions. For building a drill corpus.")
    ap.add_argument("--ply-hi", type=int)
    ap.add_argument("--per-game", type=int)
    ap.add_argument("--min-pieces", type=int)
    ap.add_argument("--max-material", type=int)
    ap.add_argument("--allow-check", action="store_true")
    ap.add_argument("--include-final", action="store_true")
    args = ap.parse_args()

    limits = dict(LIMITS)
    if args.relaxed:
        limits.update(ply_hi=10000, min_pieces=3, max_material=99,
                      allow_check=True, include_final=True, per_game=4)
    for name, value in (("ply_hi", args.ply_hi), ("per_game", args.per_game),
                        ("min_pieces", args.min_pieces), ("max_material", args.max_material)):
        if value is not None:
            limits[name] = value
    if args.allow_check:
        limits["allow_check"] = True
    if args.include_final:
        limits["include_final"] = True
    print(f"limits: {limits}", file=sys.stderr)

    rng = random.Random(args.seed)
    seen = set()
    games_read = games_kept = emitted = 0

    while True:
        headers = chess.pgn.read_headers(sys.stdin)
        if headers is None:
            break
        games_read += 1
        if not game_passes(headers):
            chess.pgn.skip_game(sys.stdin)
        else:
            game = chess.pgn.read_game(sys.stdin)
            if game is None:
                break
            positions, total_plies = eligible_positions(game, limits)
            if total_plies >= MIN_GAME_PLIES and positions:
                games_kept += 1
                gid = game_id(headers.get("Site", ""))
                elos = [elo(headers, "WhiteElo"), elo(headers, "BlackElo")]
                for pos in pick(positions, rng, limits):
                    key = dedup_key(pos["fen"])
                    if key in seen:
                        continue
                    seen.add(key)
                    pos.update(game=gid, elo=elos, month=args.month)
                    sys.stdout.write(json.dumps(pos, separators=(",", ":")) + "\n")
                    emitted += 1
        if args.progress_every and games_read % args.progress_every == 0:
            print(
                f"  read {games_read} games, kept {games_kept}, emitted {emitted} candidates",
                file=sys.stderr,
                flush=True,
            )
        if args.max_candidates and emitted >= args.max_candidates:
            break

    print(
        f"harvest done: read {games_read} games, kept {games_kept}, emitted {emitted} candidates",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
