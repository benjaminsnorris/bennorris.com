# Run log

What was actually built, with the measured numbers. If the code here changes,
add a new entry rather than editing an old one — the point of this file is to be
able to tell whether a `positions.json` in hand matches the code in the repo.

---

## 2026-08-22 — first corpus (shipped)

**Output:** `positions.json`, 2,100 positions (1,500 quiet / 600 tactical), 0.40 MB.
Delivered to `~/Downloads/positions.json`; archived copy at
`~/Developer/position-corpus-work/positions-2026-08-22.json`.

**Command:**

```sh
# equivalent to: run.sh <workdir> 2013-01 2013-02 2013-03
# with WORKERS=10, STOP_QUIET=6000, STOP_TACTICAL=1200
```

Random seed `20260822` throughout (position choice within a game, candidate
shuffle, corpus draw, re-check sample). Same seed + same inputs reproduces the
same corpus.

**Environment:** macOS on Apple silicon, 10 cores. Stockfish 18 (Homebrew, at
`/opt/homebrew/bin/stockfish`), python-chess 1.11.2, Python 3.14. Note the brief
called for Stockfish 16 and an `apt-get` install path; Homebrew ships 18 and the
`engine` field in the output records what actually ran.

### Measured yields

| Stage | Number |
|---|---|
| Months read | 2013-01, 2013-02, 2013-03 |
| Games read | 201,965 |
| Games passing the game filters | 70,794 (35%) |
| Candidate positions harvested | 170,505 |
| …after dedup across months | 170,396 (only 109 cross-month collisions) |
| Positions engine-certified | 102,303 (stopped on target, pool not exhausted) |
| → quiet | 35,048 (34.3%) |
| → tactical | **1,200 (1.17%)** |
| → discarded, `\|second\|` out of band | 53,141 (51.9%) |
| → discarded, forced recapture | 8,591 (8.4%) |
| → discarded, gap between 75 and 300 | 4,323 (4.2%) |
| Engine failures | 0 |

Wall clock: harvest ~3 min for all three months; certification 80m46s on 10 cores (21 positions/second); assembly and audit ~30 s (plus ~40 s for the 50-position re-check).

**One month is not enough.** 2013-01 alone yields ~600 tactical positions —
exactly the target with zero slack and no room to re-draw after a failed audit.
Three months were read rather than lowering the target.

### Final audit result — all seven checks passed

Distinct source games: **2,074**, at 1.01 positions per game (max 2). Ply spread
evenly over 16–60, median 36. Elo inside 1200–1800, median 1534.

Leak audit, best single-threshold balanced accuracy (ceiling 55%):

| Feature | Accuracy |
|---|---|
| castling rights present | 53.4% |
| ply | 52.0% |
| `\|second\|` | 51.4% |
| side to move | 50.2% |
| pieces | 50.0% |
| material (mover's view) | 50.0% |

Re-analysis of 50 random entries: **50/50** labels reproduced.

### The first draw failed the leak audit

Drawn uniformly, `pieces` separated the two labels at **64.7%** and material at
**57.2%**. Tactical positions genuinely carry slightly fewer pieces. The quiet
half was therefore re-drawn to match the tactical half's distribution on those
two features, which brought both to 50.0%. `assemble.py` does this automatically
and prints which features it stratified on.

This is safe here and would not be safe against a puzzle database: both halves
come from the same games through the same filters, so matching them cancels a
nuisance correlation rather than importing an artifact from another source.

### The bug that check 6 caught

The first full certification run **failed check 6 at 44/50**. Every one of the
six mismatches flipped to `discard` with the gap barely moving (8→7, 47→49,
470→458), which pointed at the `|second| ≤ 100` band rather than at the gap.

Cause: each worker reused one Stockfish process across many positions without
clearing its hash table, so a position's evaluation depended on what that worker
had analysed before it. Measured on one of the failures — the same position
scored `second = -85` analysed cold and `-52` analysed after two others, a 33
centipawn drift, enough to cross the band and flip the label.

Fix: pass `game=fen` to `engine.analyse`, which makes python-chess send
`ucinewgame` before each position. Verified bit-identical cold vs. warm. The
whole certification was then re-run from scratch; the numbers above are from the
deterministic run. **Do not remove this for speed.**

### Preserved artifacts

`~/Developer/position-corpus-work/`:

| File | What it is |
|---|---|
| `certified-2013-01-to-03.jsonl.gz` | **The 36,248 certified positions** (35,048 quiet + 1,200 tactical), 1.7 MB gzipped |
| `positions-2026-08-22.json` | copy of the shipped corpus |
| `certify-*.log`, `harvest-*.log` | stage logs with the running counts |

The certified pool is the expensive artifact — about 80 minutes of engine time,
of which the shipped corpus spends only 2,100 positions. **Draw from it before
re-certifying anything.** Candidates were not preserved; they regenerate in ~3
minutes.

Not preserved: the non-deterministic first certification run. It was deleted on
purpose — its labels do not reproduce and it must not be drawn from.

---

## 2026-08-25 — endgame corpus for the glossary's square-of-the-pawn drill

**Output:** `positions-endgame.json`, 1,592 positions, 0.26 MB, in the glossary
repo at `~/Developer/chess-glossary/data/`. No engine, so nothing to preserve
beyond the candidate file.

**Command:**

```sh
curl -s https://database.lichess.org/standard/lichess_db_standard_rated_2013-01.pgn.zst \
  | zstd -dc | harvest.py --month 2013-01 --relaxed --max-pieces 8 --seed 20260825 \
  > cand_endgame_2013-01.jsonl
python3 ~/Developer/chess-glossary/src/build_endgame_corpus.py cand_endgame_2013-01.jsonl
```

`--max-pieces` was added to `harvest.py` for this run. It is the mirror of
`--min-pieces` and exists for the opposite reason: the seeds course needed a floor
of 12 to stay out of the endgame, and the glossary's endgame drills need a ceiling
to stay in it. `0` means no bound, so the default behaviour and both existing
corpora are unchanged. The terminal-position branch respects the bound too, or a
mate with twenty men on the board would slip past it.

### Measured yields

| Stage | Number |
|---|---|
| Month read | 2013-01 |
| Games read | 60,666 |
| Games passing the game filters | 3,766 (6.2%) |
| Candidate positions (at most 8 men) | 8,480 |
| dropped, not exactly one passed pawn | 5,877 |
| dropped, the pawn's path blocked | 1,011 (265 of them by the pawn's own king) |
| **Written** | **1,592**, from 1,253 games at 1.27 per game |

Men on the board: 3 (112), 4 (261), 5 (258), 6 (196), 7 (321), 8 (444).

Wall clock: **22 seconds**, download included. Which is the point — the
realisation behind the drill corpus applies again here, more strongly: a drill
needs a position and a predicate answer, so no certification is required and an
endgame corpus costs seconds rather than the 81 minutes of Stockfish the certified
corpus cost.

### Why the two extra filters, and what they are worth

The piece bound alone is not enough for the drill this feeds. The square rule
counts one pawn's steps against one king's, so:

- **exactly one passed pawn**, or "can the king catch the pawn" does not name a
  pawn and the item cannot be answered;
- **that pawn's path empty**, or "steps to promote" is not a count of anything. A
  pawn with its own king in front of it needs more moves than the rule assumes,
  and 1,011 positions were dropped for it.

Base rate on the result: **43.2%**, the best-balanced of the glossary's thirteen
drills. The full write-up, including the two errors that nearly shipped as an
answer key, is in `docs/CORPUS.md` section D in the glossary repo.

### Preserved artifacts

`~/Developer/position-corpus-work/cand_endgame_2013-01.jsonl` (8,480 candidates)
and `harvest-endgame-2013-01.log`. Regenerating them costs 22 seconds, so neither
is precious.
