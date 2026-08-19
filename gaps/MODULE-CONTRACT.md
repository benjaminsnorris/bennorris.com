# Module contract

How a module plugs into the shell. Written so a module built in a different session drops in without renegotiation.

The shell is `index.html` + `shell/shell.js` + `shell/store.js` + `shell/log.js`. Modules live in `modules/`, content in `data/`, and `app.js` is the one place they're wired together.

Background on why these constraints exist: `interstitial-time-spec.md`, sections 2, 3, and 5. Process for generating and filtering candidates: `MODULE-PLAYBOOK.md`.

---

## The shape of the thing

The shell owns routing, storage, the top rail, and the card element. Modules own everything inside the card.

**Routing.** The person is asked where they are — `screen`, `walking`, `scrap`, or `meeting` — and the shell picks randomly among the modules that fit, preferring the one used least recently and never the same one twice running. Not a pure randomizer: slot shape is the primary constraint from the parent spec, and serving a chess puzzle on a dog walk is worse than serving nothing.

`meeting` is a shape rather than a topic because the parent spec (§4c) allows that slot only for content about the meeting itself. Making it something the person selects means meeting content can never be served to someone who isn't in one — the rule is enforced structurally rather than by convention.

**Three rules the shell enforces, so a module can't quietly break the spec:**

1. **Never ask a question whose answer can't change the outcome.** The shape picker renders only when shape changes which module runs, or when a module declares `usesShape: true`. A module that ignores shape adds no question. The same test governs the activity switcher, which is why it doesn't appear against a one-item list.
2. **A session ends when the module says it's done.** The shell offers exactly one quiet continuation. No streaks, no counters that reward volume, no automatic next item.
3. **There is always a way back to a new gap, in one tap, from any screen.** This is the shell's job rather than a module's, because it used to depend on how many modules happened to fit — see *The rail* below.

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

`unit` is shown in the activity switcher, so write it as the person would say it: "five puzzles," not "session."

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
| `ctx.store` | `load(key)` / `save(key, value)` / `remove(key)`, all async; `ctx.store.ok` is false when persistence is unavailable |
| `ctx.setRail(views)` | `[{ label, open }]` — renders buttons in the top rail |
| `ctx.done()` | **the session is over.** Refreshes the rail count, and tells the shell what to do when the app is reopened. Call it exactly once, when a session genuinely completes |
| `ctx.refresh()` | recompute the rail count without ending a session |
| `ctx.again()` | remount this module from scratch — the one quiet continuation, if you want the shell to run it rather than re-rendering internally |
| `ctx.log(name, detail)` | record an event for later analysis. Module id and moment are attached automatically |

`ctx.done()` carries more weight than it looks like it does. See *Coming back to it*.

Registration happens in `app.js`, which imports each module in a try/catch so one that fails to load drops out of the rotation instead of taking the app down. Anything that failed is listed in `gaps.failed` in the console.

---

## Requirements

A module must:

- **End.** Have a definite stopping point and a screen that says so. One continuation offered, quietly.
- **Cost nothing to resume.** No partial state to restore, no "where you left off." Interruption mid-action must lose at most the current item.
- **Survive absent storage.** `ctx.store.save` returning `false` is normal, not exceptional. Never lose the person's input to a failed write; show what happened and offer a way to copy the work out. The shell appends "session only" to the rail automatically.
- **Batch persistence.** One key, one read on mount, one write per completion. Values under 5MB.
- **Stay quiet.** No timers, no streaks, no escalating feedback, no notifications. These are the mechanics that turn three minutes into fifteen.
- **Leave a trace.** Whatever accumulates must be visible and exportable as markdown.

A module must not:

- Use `localStorage` or `sessionStorage` directly — `Store` covers three backends and reports which one actually took the write
- Reach into the work queue: no email, no tasks, no messages (spec §4b ranks discharging last)
- Render its own rail or reposition the card
- Offer unbounded continuation

---

## Loading data

Content belongs in `data/*.json`, not in code. Every module loads it the same way, at the top of the file:

```js
const DATA = await fetch(new URL("../data/yours.json", import.meta.url)).then(r => r.json());
```

**This is the sharpest edge in the codebase.** That's top-level `await` in a module, so if the file 404s, `.json()` throws on the HTML error page and the import rejects. Before `app.js` isolated its imports, one missing data file took down the entire app — a styled blank card, no error on screen, nothing to suggest which file was at fault. It cost an evening.

What that means in practice:

- **Add every new data file to `ASSETS` in `sw.js`, and confirm it exists before deploying.** The service worker caches each asset independently now, so a missing one is skipped rather than fatal — but it's still a bug, and it's still logged with a `[sw]` prefix rather than shown.
- Data that's large and only sometimes needed can load lazily instead. Chess defers its 150KB puzzle bank to first mount, keeping only the small motif file at the top level.
- If a module is missing from the rotation, check `gaps.failed` first.

---

## Coming back to it

An installed web app is frozen and restored, not reloaded. `app.js` never runs a second time, so the person returns to whatever screen they walked away from — in practice a confirmation card, with no obvious way to start another gap.

The shell handles this on `visibilitychange`, and the rule is deliberately narrow. It resets to the shape picker only when **both** hold:

- The running module called `ctx.done()` — the session was finished, not abandoned
- Nothing is typed in any `textarea` or `input` inside the card

Mid-session state — puzzle three of five, a half-written answer — is never thrown away, however long the gap between visits. There's no elapsed-time threshold anywhere, which is what keeps this a resume rule rather than a timer.

The draft check is a backstop, not the main mechanism. A module may offer its own continuation without telling the shell: Ask's "One more" re-renders internally, so `completed` is still true while a fresh answer is being typed. `ctx.done()` alone would have eaten that text. Nothing in the shell can destroy typed input.

**What this asks of a module:** call `ctx.done()` when the session is genuinely over and not before. Calling it to refresh a count mid-session — use `ctx.refresh()` for that — will make the app reset out from under someone who was still working.

---

## The rail

One line above the card. The shell owns the left side, the module owns the right via `ctx.setRail()`.

The left side is a button showing **the moment**, not the module: `In a meeting ⌄ · 14 answered`. The moment is invisible state that drives routing and Ask's deck weighting, and the module name is redundant when the card is right there. Tapping it opens the shape picker — a new gap, one tap, from any screen.

That button renders whenever a moment can change anything at all, which is the fix for a real dead end: choosing "In a meeting" left only Ask eligible, so the old module-name button never rendered, and there was no route back to the picker at all without a hard reload. A module with a narrow `shapes` list can no longer strand anyone.

**Switching activity lives one level in.** The shape picker's foot carries "Something else," which opens the activity picker for the moment you're already in, and it appears only when more than one module fits. A new gap is the outer loop; switching activity is the inner one.

### Export

The shape picker's foot carries **Export**, which writes the entire store — answers, squares held, lines held, and the log — to a JSON file. It lives there because the picker is the one screen that isn't a session, so reaching for it can't interrupt one.

JSON rather than markdown, deliberately. A readable record is a separate thing to build if it turns out to be wanted, and guessing at its shape now would be guessing.

It tries three routes in order, because `a[download]` is unreliable in an iOS standalone app: the share sheet, then a download, then the clipboard. The button reports which one actually happened rather than claiming a success it can't verify.

This matters more than it looks. The console is unreachable in an installed web app, so before this existed `gaps.export()` was theoretical on the only device holding real data.

---

## The log

`shell/log.js` records what the shell did and what got chosen instead, so a fortnight of real use can settle questions no brainstorm can.

| Event | Fields | The question it answers |
|---|---|---|
| `moment` | `shape`, `via`, `changed` | Are `walking` and `scrap` real moments? `via: "kept"` means the remembered choice was tapped through rather than reconsidered — if that's nearly everything, the picker isn't earning its place |
| `shown` | `module`, `shape`, `by` | Is a module dead weight in a given moment? `by` is `router`, `you`, or `again` |
| `switched` | `from`, `to`, `shape` | The router offered one thing and you took another. The pair is the point — a rejection is worth more than either id alone |
| `completed` | `module`, `shape` | The denominator. Shown-minus-completed is the abandonment rate, and abandonment is what kills a module |
| `deck` | `from`, `to`, `shape` | Ask's `WEIGHTS` table is a guess. Auto-served `faith` on a walk and switched to `craft` means the guess is wrong for that moment |
| `skip` | `deck`, `n`, `shape` | Question quality inside a deck. The two-skip cap makes each one cost something, so it means something |

Timestamps are local with offset — `2026-08-19T14:32:05-06:00` — because the question is what time of day a gap actually happens, and `toISOString()` is UTC, which goes ambiguous the moment you answer something in another timezone.

Events buffer in memory and flush on completion, on hide, and every twenty. An installed web app is frozen without warning, so a write-on-every-event scheme would be slower and a write-at-the-end scheme would lose the tail. Capped at 2000, oldest first — roughly fifty days at ten gaps a day.

**Two rules about what the log is not:**

1. **It never appears in the app.** Not in the rail, not on a card, not in `summary()`. `summary()` reports what was earned; a log is what was done, and surfacing it builds exactly the streak counter the spec refuses.
2. **It is not a score.** It exists to be exported once, read once, and to change what gets built next.

A module calls `ctx.log(name, detail)` for anything the shell can't see from outside. Ask uses two: the deck switch and the skip. Log an event only if a fortnight of it would change a decision — the same test the router applies to questions.

---

`summary()` feeds the count. **It is a trace, not a score.** Memorize reports lines *held*, not lines reviewed. Chess reports squares *held*, not puzzles solved. Report the thing that took effort to earn — a count inflatable by activity turns the trace into a vanity metric.

---

## Design

Tokens are defined once in `:root` in `style.css` with a paired dark value switched by `prefers-color-scheme`. Use `var(--token)`, never a literal hex, never an inline style.

| | |
|---|---|
| Surfaces | `--ground` `--card` `--wash` `--card-shadow` |
| Text | `--ink` `--muted` `--faint` |
| Accent | `--moss` `--on-moss` |
| Lines and disabled | `--line` `--ghost` `--off` `--on-off` |
| Board | `--board-l` `--board-d` `--piece-w` `--piece-b` |
| Alert | `--warn` |
| Type | `--serif` `--mono` |

Type: **Newsreader** 300 for display, **IBM Plex Mono** 11px / .14em / uppercase for utility labels. Keep every text pairing at WCAG AA in both schemes — the small mono labels fail first.

Shared classes: `.card` `.fade` `.scroll` `.foot` `.save` `.skip` `.again` `.pick` `.picktitle` `.deck` `.question` `.entry` `.empty` `.done`. Anything module-specific goes in `style.css` under a comment naming the module, not inline.

Voice: plain, active, sentence case. Errors say what happened and how to fix it. Empty states invite action.

---

## Adding a module

1. Write the manifest, being honest about `shapes`.
2. Implement `mount` / `unmount` / `summary` / `exportMarkdown`.
3. Put content in `data/`, styles in `style.css`.
4. Add one entry to the `MODULES` list in `app.js`.
5. Add `ctx.log()` calls for any choice the shell can't see — a switch, a rejection, a preference override — and nothing else.
6. **Add the module file and every data file to `ASSETS` in `sw.js`, and bump `VERSION`.** Skipping the bump means looking at a cached copy and wondering why nothing shipped. Skipping the ASSETS entry means it works until the first offline gap.
7. Confirm every path in `ASSETS` actually exists.
8. Test it headlessly before deploying — see the playbook. ES modules don't load from `file://`, so serve the folder.
9. Check the shape picker still behaves: if your `shapes` differ from the existing modules', a question may now appear where none did before. That's routing working, not a bug.

The router is tested for: a lone module that ignores shape (no question asked), a lone module that uses shape (question appears), a screen-only module added alongside (question appears, walking still routes elsewhere), even rotation across three modules with no back-to-back repeats, the meeting dead end, the resume rule with and without a pending draft, and every log event including the switch pair and the case where re-picking the running module logs nothing. Deck weighting is verified per moment over 4,000 draws.

**Every Ask answer records the moment it was given in**, and the log records the moments that produced no answer at all. That's deliberate — the parent spec's untested question is which slots this actually serves, and only real data answers it.

---

## What each implementation taught

**Memorize** was built against this contract as a test of it, and the contract held with one addition. Two things worth carrying forward:

- **`summary()` is a trace, not a score.** Report what was earned.
- **A module may have nothing to serve.** Memorize has a resting state for when no line is due, offering optional practice that explicitly doesn't advance progress. If your module can run dry, design that screen rather than serving filler.
- **Spaced repetition has a trap:** succeeding on an early review must not push the next real review further out, and must not advance the level. Otherwise eager practice makes spacing worse and cramming reports mastery.

**Chess** was the first module to declare a narrow `shapes` list, and that surfaced two shell bugs rather than module bugs: the meeting dead end, and the missing data file that blanked the app. A module that fits only one moment is the useful stress test — build one and the routing assumptions get exercised.

- **Lazy-load anything large.** The puzzle bank waits for first mount.
- **Vendor third-party libraries into `vendor/`**, never a CDN. The service worker only caches same-origin, and offline is the point.

---

## Status

| Module | Shapes | `usesShape` | Arousal | Unit | Trace |
|---|---|---|---|---|---|
| **Ask** | all four | `true` | restoring | one question | answers kept |
| **Memorize** | screen, walking, scrap | `false` | neutral | three lines | lines held |
| **Chess** | screen | `false` | activating | five puzzles | squares held |

Ask weights 130 questions across seven decks by moment. Memorize is seeded with public-domain scripture verified against churchofjesuschrist.org. Chess is 32 tactical motifs × 2 tiers = 64 squares, on puzzles extracted from the Lichess open database (CC0).

**Recall** and **Loop** are specified but unbuilt (spec §6, playbook §3).

---

## The open question

None of this has been tested against a real week of use, which the parent spec names as the likeliest failure mode. The shell is deliberately thin for that reason.

Ask records the moment behind every answer, and the log now records the rest: when gaps happen, which picks get rejected, which sessions get abandoned. After a couple of weeks that data should shape what gets built next more than any brainstorm will — in particular whether `walking` and `scrap` are served at all, or whether this is a screen app that asks a question it doesn't need to.

Nothing has been analysed yet, and no analysis tooling exists. That's intentional: what the file needs to show is itself a question the fortnight answers.
