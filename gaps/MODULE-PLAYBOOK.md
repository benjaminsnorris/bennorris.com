# Module playbook

For a session brainstorming and building new modules for **Gaps** — the app that routes a scattered few minutes to something worth doing.

Read alongside `MODULE-CONTRACT.md` (the interface) and `interstitial-time-spec.md` (why the constraints exist). This file is the process: how to generate candidates that fit, how to filter them, and how to build and test one.

---

## 1. Who and what

Ben is a product lead with ADHD who wants his scattered 2–10 minute gaps to amount to something. Six recurring slots, which collapse into four moments the app knows about:

| Moment | Slots | Length | Constraints |
|---|---|---|---|
| `screen` | Bathroom, before a call | 3–7 min | Private, hands free, can type |
| `walking` | Dog walk, work break | 5–10 min | Eyes up, alone, largest block |
| `scrap` | Standing in line | 2 min | One hand, public, interruptible |
| `meeting` | A dull meeting | 3–5 min | Covert, partial attention |

He ranked what "productive" should mean: **accumulating** first, **restoring** second, **noticing** third, **discharging** last.

---

## 2. The filter — apply before proposing anything

**Invariant.** True regardless of what gets built:

- Zero resume cost — nothing to remember, no place you left off
- Finite by construction — a hard bottom, never a feed
- Survives interruption mid-action
- Decision-free entry — the shell picks; choosing happens *after*
- No login, no setup

**From the ranking.** Change these only if Ben reranks:

- Compounds, but through a low-engagement channel
- Leaves a visible, exportable trace
- Never touches the work queue — no email, tasks, or messages
- Meeting content is about the meeting, or doesn't exist

**Findings worth keeping:**

- Accumulating and restoring pull against each other. Engaging is what turns 3 minutes into 15. The `walking` moment is where the tension dissolves, since walking is already regulating.
- `walking` is the largest block and the worst-served by phone defaults. Design there first.
- Almost nothing compounds in `scrap`. Expect one low-stakes default, possibly analog.
- Invisible accumulation feels pointless and gets abandoned. The trace is not an afterthought.

---

## 3. Where new ideas actually come from

Two rules carry most of the filtering weight, and **relaxing exactly one, deliberately, is the most productive move** — more productive than reranking the four meanings of "productive."

- **"Visible trace"** rules out everything self-improving-but-invisible: mobility work, language drills, mental math, breath work. Relax it, or invent a trace, and that category opens. (Chess did this: the trace became a board of 64 motifs.)
- **"Zero resume cost"** rules out anything serialized: reading in fragments, working through a course, a long argument. Relax it to *the system remembers your place, you don't* and serialized things become viable. (Memorize did this.)

Candidates already generated and still unbuilt:

| Idea | Mechanic | Compounds by | Fits |
|---|---|---|---|
| **Recall** | Serves a card from something already learned; reconstruct before revealing | Consolidating | screen, walking |
| **Loop** | You leave an open question at the end of a focus block; served back in the next gap | Tying gaps to live work | screen, walking |
| **Commonplace** | No prompt — capture one sentence worth keeping | Collecting rather than generating | all four |
| **One photograph** | Take one picture, no editing, no sharing | Noticing | walking, scrap |
| **Question bank** | Collect good questions instead of answering them | Feeds 1:1s and interviews | all four |

Loop is the most interesting unbuilt one, because it links the gaps to live work rather than running parallel to it. It needs a capture point at the end of a focus block, which is a new surface outside the app.

**Two acknowledged gaps.** Ben asked for analog options and the work went app-first — that's never been revisited. And `scrap` has no purpose-built answer; the standing guess is a physical card in the pocket carrying the question of the week.

---

## 4. What's built, and what each one taught

**Ask** — one question from a rotating deck, one short answer, hard stop. `shapes: all four`, `usesShape: true`, weights decks by moment. 130 questions in `data/ask-decks.json`.

**Memorize** — a passage split into clause-sized lines, three per session, escalating occlusion (read → first letters → alternating blanks → cue only), spaced review. `shapes: ["screen","walking","scrap"]`. Seeded with public-domain scripture verified against churchofjesuschrist.org.

**Chess** — 32 tactical motifs × 2 difficulty tiers = 64 squares on a progress board. Built separately against the same contract.

Lessons that cost real debugging and shouldn't be relearned:

- **`summary()` must report what was earned, not what was done.** Memorize counts lines *held*, not lines reviewed. A count inflatable by activity turns the trace into a vanity metric.
- **Design the empty state.** Memorize can have nothing due. It says so, says when the next review lands, and offers practice that explicitly doesn't advance progress — rather than serving filler.
- **Spaced repetition has a trap:** succeeding on an early review must not push the next real review further out, and must not advance the level. Otherwise eager practice makes spacing worse and cramming reports mastery.
- **Declare `shapes` completely.** Ask omitted `meeting` for a while; choosing that moment found no eligible module and rendered a blank card. A test harness caught it, not a person.

---

## 5. Building one

The interface is in `MODULE-CONTRACT.md`. In short: a file in `modules/`, exporting an object with a manifest plus `mount(ctx)` / `unmount()` / `summary()` / `exportMarkdown()`.

```js
export const Yours = {
  id: "yours",
  name: "Yours",
  shapes: ["screen", "walking"],   // be honest; this is the routing key
  arousal: "neutral",              // restoring | neutral | activating
  unit: "three cards",             // shown in the module switcher
  usesShape: false,                // does ctx.shape change what you serve?
  needs: { screen: true, hands: "free", private: false },
  async mount(ctx){ … },
  unmount(){ … },
  summary(){ return { count: 0, label: "held" }; },
  exportMarkdown(){ return ""; }
};
```

Wiring it in:

1. `app.js` — one import, one `register(Yours)`
2. `sw.js` — add the module file and any data files to `ASSETS`, bump `VERSION`
3. `style.css` — add rules there, never inline styles

Rules that matter in practice:

- Persist through `ctx.store` only. Never `localStorage` directly — the adapter covers three backends, and `ctx.store.ok` tells you whether the write landed. A failed save must never lose the person's input.
- One storage key, one read on mount, one write per completion.
- **A new storage key needs a merge.** Import (`shell/merge.js`) combines two devices' state additively; a key it doesn't know is adopted-if-absent, otherwise skipped. That's safe but lossy, so a new module ships with a merger for its key and fixtures in `tests/test-merge.mjs` — decided when the schema is designed, not discovered at the first two-device merge.
- Content belongs in `data/*.json`, not in code.
- Colors come from tokens (`var(--moss)`), never literal hex. Both light and dark are defined; check WCAG AA on the small mono labels, which fail first.
- Third-party libraries get **vendored into `vendor/`**, not loaded from a CDN — the service worker only caches same-origin, and offline is the point.
- No timers, no streaks, no automatic next item. These are exactly the mechanics that turn three minutes into fifteen.

---

## 6. Testing without a browser

ES modules don't load from `file://`. To work on it: `cd gaps && python3 -m http.server 8000`.

To exercise a module headlessly, stub the environment and import it. This caught a real routing bug:

```js
// harness.mjs — node harness.mjs
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const els = {};
const mkEl = () => ({ innerHTML:"", className:"", style:{}, dataset:{}, textContent:"",
  addEventListener(){}, appendChild(){}, querySelector:()=>mkEl(), querySelectorAll:()=>[] });
globalThis.document = { getElementById: id => (els[id] ||= mkEl()), createElement: () => mkEl() };
globalThis.window = {};
globalThis.localStorage = (() => { const m = new Map(); return {
  getItem: k => m.has(k) ? m.get(k) : null, setItem: (k,v) => m.set(k,v), removeItem: k => m.delete(k) }; })();
globalThis.fetch = async url => ({ json: async () => JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8')) });

const base = pathToFileURL('/path/to/gaps/').href;
const { Yours } = await import(base + 'modules/yours.js');

const ctx = { el: mkEl(), store: (await import(base + 'shell/store.js')).Store,
              shape: 'walking', setRail(){}, refresh(){}, done(){}, again(){} };
await Yours.mount(ctx);
console.log(Yours.id, Yours.shapes.join(','), JSON.stringify(await Yours.summary()));
```

Also worth doing before shipping:

- Every moment in `SHAPES` routes to at least one module
- Simulate the progression loop over weeks of use — that's how the spaced-repetition bugs surfaced
- Confirm every file in `sw.js`'s `ASSETS` exists and every relative import resolves
- **Run `node tests/test-merge.mjs` after any change to `shell/merge.js` or to a module's state schema.** The merge rules are agreed, not obvious — additive only, higher level + earlier due for spaced rep, Chess's last-5 window from the fresher device, `filled` never unfills, `device-id` never merged — and the tests are their spec. A module that changes its stored shape must extend the fixtures there, or import will silently mishandle the new shape on the next two-device merge. Test files live in `tests/`, import via `../shell/…`, and stay out of `sw.js`'s `ASSETS`.

---

## 7. How to run a session

1. **Don't open with a list of ideas.** Ben's standing instruction from the original design work: build the selection process before generating candidates. The process eliminates most obvious ideas before they're proposed.
2. **Say which rule you're relaxing** (§3) and why. That's where genuinely different ideas come from.
3. **Check the moment coverage.** `walking` is the biggest gap and `scrap` is unserved. A new `screen` module is the least valuable thing you could build.
4. **Get Ben's answers on the loop-shaping decisions before building** — what counts as progress, what ends a session, what happens on failure. Guessing these confidently produces the wrong thing.
5. **Build one path end to end** before generalizing. One motif, one passage, one card.
6. **Push back.** Ben values direct feedback over validation, and will take a well-argued objection seriously.

---

## 8. The thing that's still true

None of this has been tested against a real week of use. The parent spec names that as the likeliest failure mode, and it hasn't changed: building more modules is more fun than finding out whether the habit takes.

Ask now records which moment each answer came from. After a couple of weeks that data answers the actual open question — which slots this serves and which it doesn't — and should shape what gets built next more than any brainstorm will.

If a session's honest recommendation is "use it for two weeks first," give that recommendation.
