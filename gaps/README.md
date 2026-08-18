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

Data is local to the device and never leaves it. There's no sync — two devices means two sets of answers. `copy(await gaps.export())` in the console dumps everything as markdown if you want it somewhere durable.

## Status

**Ask** and **Memorize** are live. **Chess** is being built separately against the same contract.

Nothing here has been tested against a real week of use. The spec's own warning applies: building more modules is more fun than finding out whether the habit takes.
