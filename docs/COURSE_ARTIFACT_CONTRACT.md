# Course artifact contract

How a Claude-generated HTML artifact becomes a progress-tracking course at
`https://bennorris.com/courses/<slug>/`.

`docs/` is in the Jekyll `exclude` list, so this file is not published.

## Publishing

```bash
bin/publish-course ~/Downloads/artifact.html "Course Title"
bin/publish-course ~/Downloads/artifact.html --slug my-course
bin/publish-course ~/Downloads/reading.html  --slug my-reading --no-store
git add courses/<slug>/index.html && git commit && git push
```

Re-running is safe, so this is also the retrofit path for an artifact published
before the store existed.

`--no-store` is for static reading material with no state worth keeping. It
skips the store entirely rather than showing a "saved on this device" badge on a
page that saves nothing.

## What the tool does

1. Wraps bare fragments in a document shell (some artifacts start straight at
   `<title>`, with no `<html>` or `<head>`).
2. Adds `<meta charset="utf-8">` when missing — without it, UTF-8 punctuation
   renders as mojibake anywhere the server does not supply the charset header.
3. Injects one deferred `<script src="/assets/js/course-store.js">` tag with the
   course slug.
4. Retags the artifact's own **inline** scripts as
   `type="text/course-deferred"`. External `src=` scripts are left alone.

Everything else ships byte-for-byte. No port, no restyling.

## What the store provides at runtime

`assets/js/course-store.js` installs both seams before any artifact code runs:

- **`window.localStorage`** — replaced. Same API, but reads and writes go
  through a per-course namespace (`cs:<slug>:<key>`) and sync to Supabase.
- **`window.storage`** — the Claude Artifacts runtime storage API:
  `get(key)` and `set(key, value)` resolve to `{key, value}`, and `get` rejects
  with `Error('not found')` for an absent key.

An artifact can use either. It does not need to know sync exists.

### Why inline scripts are deferred

`localStorage.getItem` is synchronous; the network is not. An artifact reading
its progress at init would always read stale local data. So the store hydrates
first, then re-executes the deferred scripts in document order and re-dispatches
`DOMContentLoaded` so listeners registered by those scripts still fire.

### Failure behaviour

Every failure degrades to local-only progress rather than a broken page: no
session, no network, an unreachable CDN, or a Supabase outage. A watchdog
guarantees the artifact boots even if the store never initialises.

## Writing a new artifact so it just works

Nothing special is required — plain `localStorage` is enough. What matters:

- **Persist through `localStorage` or `window.storage`.** State kept only in a
  JS variable cannot be intercepted and will not survive a reload.
- **Use one stable key**, versioned if the shape may change
  (`my-course:state:v1`). Namespacing across courses is handled for you.
- **Emit a full document** with `<head>` and `<meta charset="utf-8">`.
- **Keep code in inline `<script>` or external `src=`**, not inline event
  handler attributes — `onclick="..."` runs during parse, before hydration.

## Backend

One table, `public.course_state`, keyed `(user_id, course_slug, key)`, with RLS
restricting every row to its owner. Adding a course requires no migration and no
schema change — that is deliberate, since each artifact invents its own keys.

Access is invite-only: public signup is disabled on the Supabase project, and
cohort members are invited from the dashboard.

**Static hosting cannot gate content.** Course HTML is a public file; anyone with
the URL can read it. Signing in gates *saved progress*, not access. Locking the
material itself would require a server rendering it behind auth.
