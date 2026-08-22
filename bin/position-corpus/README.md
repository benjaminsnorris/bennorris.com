# position-corpus

Builds `positions.json` — ordinary chess positions from real games, engine-checked
and labelled `quiet` or `tactical` — for the board-vision / seeds course.

The point of the corpus: **after filtering, the only difference between a quiet
item and a tactical one is the engine's verdict.** Not material, not piece count,
not how far into the game it is. Puzzle databases cannot supply this (a puzzle is
by definition a position where something exists, and Lichess puzzle positions sit
just after the opponent's blunder, so the solver is usually behind on material).
Both halves here come from the same games through identical filters.

## Running it

```sh
brew install stockfish
python3 -m pip install --user chess

bin/position-corpus/run.sh ~/corpus-work 2013-01 2013-02 2013-03
```

The output lands at `~/corpus-work/positions.json`. Overridable by env var:
`WORKERS`, `QUIET_TARGET`, `TACTICAL_TARGET`, `STOP_QUIET`, `STOP_TACTICAL`.

Three stages, each usable on its own:

| Stage | Script | In → Out |
|---|---|---|
| Harvest | `harvest.py` | PGN on stdin → candidate positions (JSONL) |
| Certify | `certify.py` | candidates → engine-labelled positions (JSONL) |
| Assemble | `assemble.py` | labelled positions → `positions.json` + audit report |

The slow stage is certification: about **20 positions/second** on 10 cores at
depth 14 with multipv 3. The tactical label is the binding constraint — only
**~1.2%** of filtered candidates certify as tactical, against ~34% quiet. Budget
roughly 100,000 candidates read per 1,200 tactical positions banked.

## What comes out

`positions.json`, one object with a header and a `positions` array:

```json
{
  "source": "Lichess open database (CC0), standard rated, 2013-01 to 2013-03",
  "engine": "Stockfish 18, depth 14, multipv 3",
  "thresholds": { "quiet": 75, "tactical": 300, "second_band": 100 },
  "generated": "2026-08-22",
  "positions": [ ... ]
}
```

| Field | Meaning |
|---|---|
| `fen` | the position |
| `label` | `quiet` or `tactical` |
| `best` | engine evaluation of the best move, centipawns, side to move's point of view |
| `second` | same for the second-best move |
| `gap` | `best - second` |
| `ply` | half-moves played before this position (16–60) |
| `elo` | `[WhiteElo, BlackElo]` of the source game |
| `material` | **White minus Black**, in pawns, signed (P1 N3 B3 R5 Q9) |
| `pieces` | total on the board, kings included |
| `game` | Lichess game ID — needed for the per-game caps and any leak audit |

Mates score ±(30000 − distance), so a mate-in-3 best move gives `best = 29997`
and a large `gap`. Those are legitimately tactical.

The corpus is CC0 (Lichess open database), so there is no licensing constraint
on what gets built from it.

## Filters (applied to every position, regardless of label)

Games: both players rated 1200–1800; `TimeControl` base ≥ 180s (no bullet);
`Termination` `Normal`; at least 30 plies.

Positions: plies 16–60; side to move not in check; ≥ 12 pieces; material
imbalance ≤ 1 pawn; at most 3 per game, ≥ 10 plies apart, chosen at random
among eligible plies rather than taking the earliest; deduplicated on the FEN's
first four fields, across months as well as within them.

Discarded after analysis: **forced recaptures** — the previous move was a capture
and the best move recaptures on that square. These produce a large engine gap
without containing a tactic, and would otherwise flood the tactical label.

## Labelling

Stockfish, depth 14, multipv 3, from the side to move's point of view. Mates
score ±(30000 − distance). `gap = best − second`.

Both labels require `|second| ≤ 100`. That band is what keeps the corpus honest:
`second` is what you get by playing a sensible move, so banding it near level
means the position was balanced *before* the tactic is considered. It excludes
already-lost positions (every move loses, so the gap is small and a gap-only
test would call them quiet) and already-won ones (several moves win, small gap,
also falsely quiet).

- `|second| ≤ 100` and `gap < 75` → `quiet`
- `|second| ≤ 100` and `gap ≥ 300` → `tactical`
- anything else → discarded

Traps score as quiet. That is correct — a move that only wins if the opponent
errs is not a tactic. Don't "fix" it.

Seeds (loose pieces, alignments, back rank) are deliberately **not** computed
here; the course build computes them from the FEN, and a second implementation
would be a second thing to keep correct.

## What `assemble.py` verifies before it will ship

It prints seven checks and refuses to call the file shippable if any fails:

1. total count and the split by label
2. every FEN parses and is legal (`chess.Board(fen).is_valid()`)
3. no two entries share the first four FEN fields
4. distribution of `ply` and `elo`, and the count of distinct source games —
   fewer than 300 games means the corpus is too narrow, and the fix is more
   games, not more positions per game
5. **the leak audit** (below)
6. 50 random entries re-analysed from scratch, labels must still hold
7. file size under about 3 MB

The leak audit is the one that matters most. For each surface feature —
material, pieces, ply, side to move, castling rights, `|second|` — it fits the
best possible single-threshold classifier and reports the balanced accuracy it
achieves at telling quiet from tactical. **Anything above 55% is a failure, not
a note.** The corpus is meant to be separable by exactly one thing, and it is
not on that list. A learner who could score well by counting material would
never have to scan a position, which is the exact reflex the course exists to
break.

Check 6 is not redundant with check 5. It caught a real defect that a single
pass could not see — see `RUN-LOG.md`.

## Doing more work on this

Read `RUN-LOG.md` first: it records what was actually built, the measured
yields, and where the artifacts live.

**Before re-certifying anything, check the preserved pool.**
`~/Developer/position-corpus-work/certified-2013-01-to-03.jsonl.gz` holds 36,248
certified positions (35,048 quiet, 1,200 tactical) — about 80 minutes of engine time. The shipped corpus spends only 2,100 of them.

| If you need to… | Do this |
|---|---|
| more quiet positions (up to ~35,000) | draw from the preserved pool — free, no engine time |
| more tactical positions | the pool has only 1,200; beyond that, read more months |
| a bigger corpus generally | `run.sh <dir> 2013-04 2013-05 …` with a higher `STOP_TACTICAL`. Budget ~80 min of engine time per 1,200 tactical |
| to change any threshold (`quiet`, `tactical`, `second_band`) | the pool is invalid — thresholds are baked into it at certification. Re-certify from candidates |
| a different rating band or time control | re-harvest; those are game filters in `harvest.py` |
| to re-draw the same targets differently | re-run `assemble.py` against the pool with a different `--seed`, then re-read the audit |

```sh
# draw a fresh corpus from the preserved pool, no engine time except the re-check
gzip -dc ~/Developer/position-corpus-work/certified-2013-01-to-03.jsonl.gz > certified.jsonl
python3 assemble.py --certified certified.jsonl --out positions.json \
  --month "2013-01 to 2013-03" --engine-name "Stockfish 18"
```

Two boundaries worth not crossing:

- **`gaps/data/chess-puzzles.json` (the `puzzles.json` of the brief, n=768) must
  not supply scored items.** It is fine for worked examples in teaching
  sections, where nothing is being discriminated. As scored items it leaks: 0%
  of its positions have the side to move ahead on material, 52% are down two
  pawns or more, 47% are past move 30. "I am down material" would mean
  *tactical* every time.
- **Do not compute seeds here.** The course build computes them from the FEN.

## Notes on this repo

`bin` is in the `exclude:` list in `_config.yml`, so nothing in this directory
reaches the built site. The GitHub Pages workflow runs a plain
`bundle exec jekyll build` against that same config, so the exclusion holds
there too. Keep new files here rather than under a directory Jekyll renders.

Building the site locally currently fails on a bundler version mismatch (system
Ruby 2.6 vs. the 4.0.7 pinned in `Gemfile.lock`) — unrelated to this pipeline,
but it means the exclusion above was verified by config and precedent rather
than by an observed local build.

## Notes on choices this pipeline makes

- **Balanced accuracy in the leak audit.** The corpus is 1500/600, so a
  classifier that always guesses "quiet" scores 71% on plain accuracy without
  looking at anything. The audit reports balanced accuracy (mean of the two
  per-class rates), where chance is 50% and the 55% ceiling means what it says.
- **`material` has two conventions.** The stored field is White minus Black, as
  the output spec requires. The leak audit converts it to the side to move's
  point of view, as the audit spec requires. Same number, different sign for
  Black to move.
- **Stratified re-draw.** If a surface feature separates the labels above the
  ceiling, `assemble.py` re-draws the quiet half stratified on that feature and
  re-audits. Because both halves come from the same games through the same
  filters, this removes a nuisance correlate; it cannot import an artifact from
  another source, which is what matching against a puzzle database would do.
- **Every analysis clears the engine hash** (`game=fen`, which makes python-chess
  send `ucinewgame`). Without it the hash carries over between positions in a
  worker and the same position evaluates differently depending on what that
  worker looked at before it — measured at 33 centipawns on a borderline
  position, enough to move `|second|` across the band and flip a label. Labels
  then fail to reproduce, which is what check 6 is for. Do not remove this for
  speed.
- **Candidates are shuffled before certification**, so stopping early once the
  targets are met does not bias the corpus toward the first games read.
