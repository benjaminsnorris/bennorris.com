# Module contract

How a module plugs into the shell in `ask.html`. Written so a module built in a different session drops in without renegotiation.

Background on why these constraints exist: `interstitial-time-spec.md`, sections 2, 3, and 5.

---

## The shape of the thing

The shell owns routing, storage, the top rail, and the card element. Modules own everything inside the card.

**Routing.** The person is asked where they are — `screen`, `walking`, `scrap`, or `meeting` — and the shell picks randomly among the modules that fit. Not a pure randomizer: slot shape is the primary constraint from the parent spec, and serving a chess puzzle on a dog walk is worse than serving nothing.

`meeting` is a shape rather than a topic because the parent spec (§4c) allows that slot only for content about the meeting itself. Making it something the person selects means meeting content can never be served to someone who isn't in one — the rule is enforced structurally rather than by convention.

**Two rules the shell enforces, so a module can't quietly break the spec:**

1. **Never ask a question whose answer can't change the outcome.** The shape picker renders only when shape changes which module runs, or when a module declares `usesShape: true`. A module that ignores shape adds no question.
2. **A session ends when the module says it's done.** The shell offers exactly one quiet continuation. No streaks, no counters that reward volume, no automatic next item.

The picker remembers the last moment and highlights it, and offers "Just ask me" to go straight through with that remembered choice — so the common case is a confirming tap, not a decision.

---

## Manifest

```js
{
  id: "ask",                    // stable, also the storage namespace
  name: "Ask",
  shapes: ["screen","walking","scrap","meeting"],
  arousal: "restoring",         // "restoring" | "neutral" | "activating"
  unit: "one question",         // what a single session consists of, in plain words
  usesShape: true,              // does ctx.shape change what this serves?
  needs: { screen: true, hands: "free", private: false }
}
```

`shapes` is the routing key — be honest. A module that technically works one-handed in a checkout line but is miserable there should not claim `scrap`.

`usesShape` says whether `ctx.shape` changes what the module serves. Ask sets it true: it weights its question decks by moment — craft and writing at a screen, faith and family while walking, noticing in a quick gap, and the meeting deck exclusively in a meeting. Declaring it false when shape is ignored keeps the picker from appearing for no reason.

`arousal` is declared but not yet consumed. It exists because accumulating and restoring pull against each other (spec §3), and a future router may want to avoid activating modules late at night. Declare it accurately now so that logic doesn't need a migration later.

---

## Methods

```js
async mount(ctx)          // render into ctx.el; the shell has already cleared it
unmount()                 // drop references; the shell handles DOM teardown
summary()                 // { count, label } for the rail, e.g. { count: 14, label: "answered" }
exportMarkdown()          // everything this module has accumulated, as markdown
```

`ctx` provides:

| | |
|---|---|
| `ctx.el` | the card element |
| `ctx.shape` | the moment the person selected, or `null` if none was asked |
| `ctx.store` | `load(key)` / `save(key, value)`, both async; `ctx.store.ok` is false when persistence is unavailable |
| `ctx.setRail(views)` | `[{ label, open }]` — renders buttons in the top rail |
| `ctx.done()` | call when a session genuinely completes; refreshes the rail count |
| `ctx.refresh()` | recompute the rail count without ending a session |

Register with `register(Module)` before `start()`.

---

## Requirements

A module must:

- **End.** Have a definite stopping point and a screen that says so. One continuation offered, quietly.
- **Cost nothing to resume.** No partial state to restore, no "where you left off." Interruption mid-action must lose at most the current item.
- **Survive absent storage.** `ctx.store.save` returning `false` is normal, not exceptional — it happens in the Claude mobile app. Never lose the person's input to a failed write; show what happened and offer a way to copy the work out. The shell appends "session only" to the rail automatically.
- **Batch persistence.** One key, one read on mount, one write per completion. Values under 5MB.
- **Stay quiet.** No timers, no streaks, no escalating feedback, no notifications. These are the mechanics that turn three minutes into fifteen.
- **Leave a trace.** Whatever accumulates must be visible and exportable as markdown.

A module must not:

- Use `localStorage` or `sessionStorage` — they don't work in Claude artifacts
- Reach into the work queue: no email, no tasks, no messages (spec §4b ranks discharging last)
- Render its own rail or reposition the card
- Offer unbounded continuation

---

## Design

Match `ask.html`. Tokens are defined once in `:root` with a paired dark value switched by `prefers-color-scheme`; use `var(--token)` and never a literal hex. Available: `--ground --card --ink --moss --on-moss --muted --faint --line --ghost --off --on-off --wash`.

Type: **Newsreader** 300 for display, **IBM Plex Mono** 11px / .14em / uppercase for utility labels. Keep every text pairing at WCAG AA — the small mono labels fail first.

Reusable classes: `.deck` `.question` `.foot` `.save` `.skip` `.again` `.pick` `.picktitle` `.scroll` `.entry` `.empty` `.done`.

Voice: plain, active, sentence case. Errors say what happened and how to fix it. Empty states invite action.

---

## Adding a module

1. Write the manifest, being honest about `shapes`.
2. Implement `mount` / `unmount` / `summary` / `exportMarkdown`.
3. `register(YourModule);` before `start()`.
4. Check the shape picker now appears if your `shapes` differ from Ask's — that's the routing working, not a bug.

The router is tested for: a lone module that ignores shape (no question asked), a lone module that uses shape (question appears), a screen-only module added alongside (question appears, walking still routes to Ask), and even rotation across three modules with no back-to-back repeats. Deck weighting is verified per moment over 4,000 draws.

**Every answer records the moment it was given in.** That's deliberate — the parent spec's untested question is which slots this actually serves, and after two weeks the archive answers it from real data rather than guesswork.

---

## What the second implementation changed

Memorize was built against this contract as a test of it, and the contract held with one addition: `ctx.shape` and `usesShape` were already in place, and Memorize declares `usesShape: false` without the shell needing to care. Two things worth knowing for the next module:

- **`summary()` is a trace, not a score.** Memorize reports lines *held*, not lines reviewed, so the rail count can't be inflated by activity. Report the thing that took effort to earn.
- **A module may have nothing to serve.** Memorize has a resting state for when no line is due, offering optional practice that explicitly doesn't advance progress. If your module can run dry, design that screen rather than serving filler.

## Status

**Ask** — one question, one short answer. Registered. `shapes: all four`, `usesShape: true`.

**Memorize** — a passage broken into lines, served three at a time with escalating occlusion and spaced review. Registered. `shapes: ["screen","walking","scrap"]`, `usesShape: false`. Seeded with public-domain scripture verified against churchofjesuschrist.org. **Chess** is being designed separately — see `chess-motifs-app/BRIEF.md`; it will declare `shapes: ["screen"]` and `arousal: "activating"`, which is what makes the shape picker start earning its place. **Recall** and **Loop** are specified but unbuilt (spec §6).

Nothing here has been tested against a real week of use. The shell is deliberately thin for that reason — it should be shaped by two real modules, not by anticipation of them.
