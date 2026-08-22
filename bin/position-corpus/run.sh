#!/usr/bin/env bash
# Build a position corpus for the seeds course, end to end.
#
#   ./run.sh OUT_DIR MONTH [MONTH...]
#
# Example (what produced the shipped corpus):
#   ./run.sh ~/corpus-work 2013-01 2013-02 2013-03
#
# Requires: stockfish (brew install stockfish), python-chess, zstd, curl.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:?usage: run.sh OUT_DIR MONTH [MONTH...]}"; shift
MONTHS=("$@")
[ ${#MONTHS[@]} -gt 0 ] || { echo "give at least one month, e.g. 2013-01"; exit 1; }

WORKERS="${WORKERS:-$(sysctl -n hw.ncpu 2>/dev/null || nproc)}"
QUIET_TARGET="${QUIET_TARGET:-1500}"
TACTICAL_TARGET="${TACTICAL_TARGET:-600}"
# Margin over target, so the leak audit has room to re-draw the quiet half.
STOP_QUIET="${STOP_QUIET:-6000}"
STOP_TACTICAL="${STOP_TACTICAL:-1200}"

mkdir -p "$OUT_DIR"
cd "$OUT_DIR"

for m in "${MONTHS[@]}"; do
  echo "== harvesting $m"
  curl -s --max-time 1800 "https://database.lichess.org/standard/lichess_db_standard_rated_$m.pgn.zst" \
    | zstd -dc | python3 "$HERE/harvest.py" --month "$m" > "cand_$m.jsonl"
done

echo "== merging, deduplicating across months, shuffling"
python3 - "${MONTHS[@]}" <<'PY'
import json, random, sys
seen, out = set(), []
for m in sys.argv[1:]:
    for line in open(f"cand_{m}.jsonl"):
        e = json.loads(line)
        k = " ".join(e["fen"].split(" ")[:4])
        if k not in seen:
            seen.add(k); out.append(e)
random.Random(20260822).shuffle(out)   # so an early stop is unbiased
with open("all_candidates.jsonl", "w") as fh:
    for e in out:
        fh.write(json.dumps(e, separators=(",", ":")) + "\n")
print(f"   {len(out)} candidates from {len({e['game'] for e in out})} games")
PY

echo "== certifying with Stockfish on $WORKERS workers (this is the slow part)"
python3 "$HERE/certify.py" --workers "$WORKERS" \
  --stop-quiet "$STOP_QUIET" --stop-tactical "$STOP_TACTICAL" \
  < all_candidates.jsonl > certified.jsonl

echo "== assembling and auditing"
python3 "$HERE/assemble.py" --certified certified.jsonl --out positions.json \
  --month "$(IFS=' to '; echo "${MONTHS[0]} to ${MONTHS[-1]}")" \
  --quiet-target "$QUIET_TARGET" --tactical-target "$TACTICAL_TARGET"
