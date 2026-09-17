# Gaps

Something worth doing with the scattered minutes. A shell that routes a moment to an activity, plus the modules it routes to.

Design rationale: `MODULE-CONTRACT.md` for the interface, `interstitial-time-spec.md` for why the constraints are what they are.

---

## Deploying to bennorris.com

Drop this folder into the GitHub Pages repo and push:

```
bennorris.com/
└── gaps/          ← this folder
```

Live at `bennorris.com/gaps/`. No build step — everything is native ES modules, which GitHub Pages serves correctly as-is.

**Bump `VERSION` in `sw.js` on every deploy.** Otherwise the service worker keeps serving the cached old version and your changes appear not to have shipped. It's the one piece of manual bookkeeping here.

Add it to your phone's home screen once (Share → Add to Home Screen). It opens without browser chrome and works offline, which matters because the slots this is built for are exactly where signal is worst.

## Running it locally

ES modules don't work from `file://` — opening `index.html` directly will fail. Serve it:

```
cd gaps
python3 -m http.server 8000
```

Then `http://localhost:8000`. Unregister the service worker in devtools when testing changes, or you'll be debugging a cached copy.

---

## Layout

```
index.html               markup and nothing else
app.js                   imports modules, registers them, starts
style.css                tokens and shared classes
shell/
  shell.js               moments, routing, rail
  store.js               storage adapter
  merge.js               reconciling two devices; pure functions, tested
  log.js                 the event log
  sync.js                optional Supabase tier, same account as the courses
modules/
  ask.js                 one question, one short answer
  memorize.js            a passage in lines, spaced review
data/
  ask-decks.json         130 questions across 7 decks
  memorize-seeds.json    public-domain scripture, verified
sw.js                    offline cache
manifest.webmanifest     home-screen install
```

Content lives in `data/`, not in code. Editing questions or seed passages doesn't mean touching JavaScript.

## Adding a module

1. Write `modules/yours.js` exporting an object that satisfies `MODULE-CONTRACT.md`.
2. Add two lines to `app.js`:

```js
import { Yours } from "./modules/yours.js";
register(Yours);
```

3. Add the module file and any data files to `ASSETS` in `sw.js`, and bump `VERSION`.

That's the whole integration. If your module's `shapes` differ from the others, the moment picker will start behaving differently on its own — that's the routing working.

## Storage

`shell/store.js` tries three backends in order and presents one interface:

1. `window.storage` — the Claude artifact API, when running inside an artifact
2. `localStorage` — the real backend on bennorris.com
3. memory — private browsing or storage denied; `Store.ok` goes false and the shell shows "session only"

Keys are namespaced with `gaps:`. A module built and tested inside a Claude artifact drops in here unchanged.

Data is local first and works signed out, offline, forever. `copy(await gaps.export())` in the console dumps everything as markdown if you want it somewhere durable.

Signing in adds a fourth tier. **Sign in** on the shape picker uses the same account as the courses on bennorris.com — the same Supabase project, the same `course_state` table, and the same session key (`bn-course:auth`), so signing in on either signs you in on both. Gaps stores under slug `gaps`; the table is deliberately schemaless in the shape of a course's progress, so this needed no migration. Accounts are made by hand in the Supabase dashboard — there is no sign-up.

Sync is `shell/sync.js` plus about forty lines of `shell.js`, because the hard part was already done: it reuses `mergeAll` from `merge.js`, the same reconciliation the Import button runs, with Supabase in place of the file. Conflict rules are argued in that file's header and proved in `tests/test-merge.js`; nothing about them is re-decided for the network.

Three things worth knowing:

- It is **not** `/assets/js/course-store.js`, which is how the courses sync. That works by shadowing `localStorage` and syncing key by key, asking you to pick a side on any divergence — which would discard the semantic merge, and "which copy of your log?" is not an answerable question. Its shim exists because artifacts read storage synchronously at init; `Store` here is already async, so there is nothing to defer.
- The boot sync is **not awaited**. This app is for the two minutes outside the vet's, and the service worker is cache-first for the same reason. A merge that lands mid-session is held and applied at the next picker, because writing it under a running module would leave the screen disagreeing with the store.
- `device-id` and `shell-state` are never uploaded. Sharing a device id would make two devices look like one in the log, and `lastShape` is about where you physically are.

One known edge, left deliberately: `state.due` is the only thing Gaps ever deletes (a puzzle leaves the review queue when you re-solve it cleanly), and `mergeChess` unions dues on purpose — "keeping it is the conservative side: the puzzle resurfaces". Under continuous sync that means a cleanly-solved puzzle can come back, because the copy you merge against still records the original miss. It costs a repetition, not correctness.

## Status

**Ask** and **Memorize** are live. **Chess** is being built separately against the same contract.

Nothing here has been tested against a real week of use. The spec's own warning applies: building more modules is more fun than finding out whether the habit takes.
