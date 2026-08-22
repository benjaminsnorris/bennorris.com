#!/usr/bin/env python3
"""Sample the final corpus from certified positions, audit it, write positions.json.

Runs the seven pre-flight checks from the brief, including the leak audit. If a
surface feature separates the two labels better than the allowed ceiling, the
quiet half is re-drawn stratified on that feature and the audit re-run. Both
halves come from the same games through the same filters, so stratifying only
removes a nuisance correlate; it cannot import an artifact from elsewhere.

Accuracy in the leak audit is BALANCED accuracy (mean of the two per-class
rates). Plain accuracy is the wrong measure here: the corpus is 1500/600, so a
classifier that guesses "quiet" every time would score 71% without looking at
anything. Balanced accuracy puts chance at 50%, which is what the 55% ceiling
is written against.
"""
import argparse
import json
import os
import random
import statistics
import sys
from collections import Counter

import chess
import chess.engine

MATE_SCORE = 30000
LEAK_CEILING = 0.55
OUT_FIELDS = ["fen", "label", "best", "second", "gap", "ply", "elo", "material", "pieces", "game"]


# ---------------------------------------------------------------- features

def side_to_move_white(entry):
    return entry["fen"].split(" ")[1] == "w"


def features(entry):
    stm_white = side_to_move_white(entry)
    return {
        "material (side to move's point of view)": entry["material"] if stm_white else -entry["material"],
        "pieces": entry["pieces"],
        "ply": entry["ply"],
        "side to move is White": 1 if stm_white else 0,
        "castling rights present": 0 if entry["fen"].split(" ")[2] == "-" else 1,
        "|second|": abs(entry["second"]),
    }


def best_threshold_accuracy(values, labels):
    """Best balanced accuracy achievable by one threshold, either direction."""
    n_q = labels.count("quiet")
    n_t = labels.count("tactical")
    if not n_q or not n_t:
        return 0.0, None
    best = (0.0, None)
    pairs = sorted(zip(values, labels))
    thresholds = sorted({v for v in values})
    for t in thresholds:
        # predict tactical when value <= t
        tp = sum(1 for v, l in pairs if v <= t and l == "tactical")
        fp = sum(1 for v, l in pairs if v <= t and l == "quiet")
        for direction, hit_t, hit_q in (
            ("<=", tp, n_q - fp),
            (">", n_t - tp, fp),
        ):
            acc = 0.5 * (hit_t / n_t + hit_q / n_q)
            if acc > best[0]:
                best = (acc, f"{direction} {t}")
    return best


# ---------------------------------------------------------------- sampling

def binner(name):
    if name == "ply":
        return lambda v: v // 5
    if name == "|second|":
        return lambda v: v // 20
    if name == "pieces":
        return lambda v: v // 2
    return lambda v: v


def sample_corpus(quiet_pool, tactical_pool, n_quiet, n_tactical, strat, rng):
    tactical = rng.sample(tactical_pool, min(n_tactical, len(tactical_pool)))
    if not strat:
        return rng.sample(quiet_pool, min(n_quiet, len(quiet_pool))), tactical

    bins = {name: binner(name) for name in strat}

    def key(entry):
        f = features(entry)
        return tuple(bins[name](f[name]) for name in strat)

    want = Counter(key(e) for e in tactical)
    scale = n_quiet / max(1, len(tactical))
    buckets = {}
    for entry in quiet_pool:
        buckets.setdefault(key(entry), []).append(entry)

    chosen, leftovers = [], []
    for k, bucket in buckets.items():
        rng.shuffle(bucket)
        take = min(len(bucket), round(want.get(k, 0) * scale))
        chosen.extend(bucket[:take])
        leftovers.extend(bucket[take:])
    rng.shuffle(leftovers)
    if len(chosen) > n_quiet:
        rng.shuffle(chosen)
        chosen = chosen[:n_quiet]
    else:
        chosen.extend(leftovers[: n_quiet - len(chosen)])
    return chosen, tactical


# ---------------------------------------------------------------- audit

def leak_audit(corpus):
    labels = [e["label"] for e in corpus]
    rows = []
    names = list(features(corpus[0]).keys())
    for name in names:
        values = [features(e)[name] for e in corpus]
        acc, rule = best_threshold_accuracy(values, labels)
        rows.append((name, acc, rule))
    return rows


def recheck(corpus, engine_path, depth, multipv, n, thresholds, rng):
    sample = rng.sample(corpus, min(n, len(corpus)))
    engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    engine.configure({"Threads": 1, "Hash": 32})
    mismatches = []
    for entry in sample:
        board = chess.Board(entry["fen"])
        # game=fen -> ucinewgame, matching certify.py. See the note there.
        infos = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=multipv, game=entry["fen"])
        best = infos[0]["score"].relative.score(mate_score=MATE_SCORE)
        second = infos[1]["score"].relative.score(mate_score=MATE_SCORE)
        gap = best - second
        if abs(second) > thresholds["second_band"]:
            label = "discard"
        elif gap < thresholds["quiet"]:
            label = "quiet"
        elif gap >= thresholds["tactical"]:
            label = "tactical"
        else:
            label = "discard"
        if label != entry["label"]:
            mismatches.append((entry["fen"], entry["label"], label, entry["gap"], gap))
    engine.quit()
    return len(sample), mismatches


def histogram(values, width=10):
    lo, hi = min(values), max(values)
    step = max(1, (hi - lo + 1) // width)
    counts = Counter((v - lo) // step for v in values)
    lines = []
    for b in sorted(counts):
        a, z = lo + b * step, lo + (b + 1) * step - 1
        lines.append(f"    {a:>5}-{z:<5} {counts[b]:>5}  {'#' * max(1, counts[b] * 40 // max(counts.values()))}")
    return "\n".join(lines)


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--certified", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--month", required=True)
    ap.add_argument("--engine", default="/opt/homebrew/bin/stockfish")
    ap.add_argument("--engine-name", default="Stockfish 18")
    ap.add_argument("--depth", type=int, default=14)
    ap.add_argument("--multipv", type=int, default=3)
    ap.add_argument("--quiet-target", type=int, default=1500)
    ap.add_argument("--tactical-target", type=int, default=600)
    ap.add_argument("--quiet-gap", type=int, default=75)
    ap.add_argument("--tactical-gap", type=int, default=300)
    ap.add_argument("--second-band", type=int, default=100)
    ap.add_argument("--recheck", type=int, default=50)
    ap.add_argument("--seed", type=int, default=20260822)
    ap.add_argument("--generated", default="2026-08-22")
    args = ap.parse_args()

    thresholds = {"quiet": args.quiet_gap, "tactical": args.tactical_gap, "second_band": args.second_band}
    rng = random.Random(args.seed)

    pools = {"quiet": [], "tactical": []}
    with open(args.certified) as fh:
        for line in fh:
            if line.strip():
                e = json.loads(line)
                pools[e["label"]].append(e)
    print(f"certified pool: {len(pools['quiet'])} quiet, {len(pools['tactical'])} tactical")

    shortfall = []
    if len(pools["quiet"]) < args.quiet_target:
        shortfall.append(f"quiet {len(pools['quiet'])}/{args.quiet_target}")
    if len(pools["tactical"]) < args.tactical_target:
        shortfall.append(f"tactical {len(pools['tactical'])}/{args.tactical_target}")
    if shortfall:
        print("FAIL: pool short of target — read more games. " + ", ".join(shortfall))
        return 1

    # Draw, audit, and re-draw stratified on any leaking feature.
    strat, rounds = [], []
    for attempt in range(4):
        quiet, tactical = sample_corpus(
            pools["quiet"], pools["tactical"], args.quiet_target, args.tactical_target, strat, rng
        )
        corpus = quiet + tactical
        rows = leak_audit(corpus)
        worst = max(rows, key=lambda r: r[1])
        rounds.append((list(strat), worst))
        if worst[1] <= LEAK_CEILING:
            break
        if worst[0] in strat:
            break
        strat.append(worst[0])
        print(f"  leak audit round {attempt + 1}: '{worst[0]}' at {worst[1]:.1%} — re-drawing stratified on it")

    rng.shuffle(corpus)
    failures = []

    print("\n" + "=" * 72)
    print(f"1. TOTAL AND SPLIT")
    counts = Counter(e["label"] for e in corpus)
    print(f"   {len(corpus)} positions: {counts['quiet']} quiet, {counts['tactical']} tactical")

    print("\n2. FEN LEGALITY")
    bad = [e["fen"] for e in corpus if not chess.Board(e["fen"]).is_valid()]
    print(f"   {len(corpus) - len(bad)}/{len(corpus)} parse and are legal under chess.Board(fen).is_valid()")
    if bad:
        failures.append(f"{len(bad)} illegal FENs")
        print(f"   FAIL: {bad[:3]}")

    print("\n3. DUPLICATES (first four FEN fields)")
    keys = Counter(" ".join(e["fen"].split(" ")[:4]) for e in corpus)
    dups = [k for k, c in keys.items() if c > 1]
    print(f"   {len(keys)} distinct keys for {len(corpus)} positions — {len(dups)} duplicated")
    if dups:
        failures.append(f"{len(dups)} duplicate positions")

    print("\n4. COMPOSITION")
    plies = [e["ply"] for e in corpus]
    elos = [x for e in corpus for x in e["elo"]]
    games = {e["game"] for e in corpus}
    print(f"   ply     min {min(plies)} / median {statistics.median(plies)} / max {max(plies)}")
    print(histogram(plies))
    print(f"   elo     min {min(elos)} / median {statistics.median(elos)} / max {max(elos)}")
    print(histogram(elos))
    print(f"   distinct source games: {len(games)}")
    if len(games) < 300:
        failures.append(f"only {len(games)} source games (<300)")
        print("   FAIL: corpus is too narrow — needs more games, not more positions per game")
    per_game = Counter(e["game"] for e in corpus)
    print(f"   positions per game: max {max(per_game.values())}, mean {len(corpus) / len(games):.2f}")

    print("\n5. LEAK AUDIT (best single-threshold classifier, balanced accuracy, ceiling 55%)")
    rows = leak_audit(corpus)
    for name, acc, rule in sorted(rows, key=lambda r: -r[1]):
        flag = "FAIL" if acc > LEAK_CEILING else "ok  "
        print(f"   {flag}  {acc:6.1%}  {name}   (rule: tactical if {rule})")
        if acc > LEAK_CEILING:
            failures.append(f"leak: {name} separates at {acc:.1%}")
    if strat:
        print(f"   quiet half drawn stratified on: {', '.join(strat)}")

    print(f"\n6. INDEPENDENT RE-ANALYSIS OF {args.recheck} RANDOM ENTRIES")
    n, mismatches = recheck(corpus, args.engine, args.depth, args.multipv, args.recheck, thresholds, rng)
    print(f"   {n - len(mismatches)}/{n} re-analysed entries kept their recorded label")
    for fen, was, now, g0, g1 in mismatches[:5]:
        print(f"   MISMATCH {was} -> {now}  gap {g0} -> {g1}  {fen}")
    if mismatches:
        failures.append(f"{len(mismatches)}/{n} labels did not reproduce")

    payload = {
        "source": f"Lichess open database (CC0), standard rated, {args.month}",
        "engine": f"{args.engine_name}, depth {args.depth}, multipv {args.multipv}",
        "thresholds": {"quiet": args.quiet_gap, "tactical": args.tactical_gap, "second_band": args.second_band},
        "generated": args.generated,
        "positions": [{k: e[k] for k in OUT_FIELDS} for e in corpus],
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"), ensure_ascii=False)

    size = os.path.getsize(args.out)
    print(f"\n7. FILE SIZE\n   {args.out} — {size / 1e6:.2f} MB")
    if size > 3e6:
        failures.append(f"file is {size / 1e6:.2f} MB (over ~3MB)")

    print("\n" + "=" * 72)
    if failures:
        print("RESULT: NOT SHIPPABLE — " + "; ".join(failures))
        return 1
    print("RESULT: all seven checks pass.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
