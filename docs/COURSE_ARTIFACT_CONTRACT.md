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

The store's own keys live in the **real** `localStorage` under a separate
`bn-course:` prefix — the Supabase session (`bn-course:auth`), the user the local
mirror belongs to (`bn-course:owner`), and the panel's open/shut preference
(`bn-course:ui`). They are deliberately outside the synced `cs:` namespace: the
session must not be filed per course, and it must never be uploaded to
`course_state` as if it were progress.

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

## Signing in

A collapsed 36px dot sits in the bottom-right corner, in a shadow root so the
artifact's CSS and the panel's cannot reach each other. Its colour is the whole
status — grey local-only, green synced, amber sync unavailable — and clicking it
opens the panel. That choice is remembered per device in `bn-course:ui`, so a
learner who opens it once keeps it open and one who dismisses it keeps it shut.

Auth is **email and password** (`signInWithPassword`), not a magic link. There is
no email round-trip, so nothing depends on the project's redirect-URL allow list.

Sign-in is shared across every course: the session is stored under one fixed key
rather than the per-project default, so signing in on one course signs you in on
all of them.

Signing in succeeds → the store merges the cloud copy, pushes anything earned
while signed out, and **reloads the page**. The artifact read its state at init;
rewriting that state underneath a running artifact would leave the page
disagreeing with the store.

### Accounts

Invite-only, with no self-serve signup. Create each cohort member in the Supabase
dashboard (Authentication → Users → Add user) with a password and *Auto Confirm
User* on, then hand them the credentials. There is no "forgot password" flow on
the page — reset it from the dashboard.

### When two devices disagree

Every course keeps its entire state under a single key (`state`, mostly), so the
old "remote wins on conflict" rule was not a merge — it replaced one device's
whole blob with another's. Sign in on your thin browser first and your good
browser's work was gone.

Divergence is now held rather than resolved. When a key exists on both sides with
different values, the store:

1. writes the local copy to `bn-course:presync:<slug>:<key>` before touching
   anything,
2. leaves the artifact booting on the **local** value — nothing is overwritten,
3. holds the remote value aside and refuses to upload that key, so ongoing work
   cannot settle the conflict as "local wins" behind your back,
4. forces the panel open (the one case that overrides the collapse preference —
   a dot cannot ask a question) and offers three answers.

**Merge them** unions the two structurally. It works because every course uses
the same idiom: a version scalar plus id-keyed maps of monotonic progress. Rules
are: objects recurse; arrays keep the longer run (they are append-only logs, and
concatenating would double-count a replay); booleans OR together, so done stays
done; numbers take the max, which is right for timestamps, counts and best
scores; `null` and `''` are treated as "unanswered" and yield; everything else,
including free text and type mismatches, keeps this device's value.

Two things it deliberately cannot do: represent an undo (a box you unchecked here
loses to one still checked there), and reconcile free text typed two ways. That
is why it is offered rather than imposed, and why the backup is written first.
Merging is only offered when both sides parse as JSON objects.

**Keep this device** uploads the local copy and needs no reload. **Use the saved
copy** applies the remote value and reloads, since the artifact read its state at
init.

Recovery, from the console on the course page:

```js
CourseStore.backups()      // every pre-overwrite copy this browser holds
CourseStore.restore('state')  // put one back, and queue it for upload
```

### Two people, one browser

`bn-course:owner` stamps the local mirror with the user_id it belongs to. Progress
made before anyone signed in is unowned, so it is pushed up on first sign-in.
Progress owned by a *different* user_id is discarded at sign-in rather than
grafted onto the new account — it is safe, since it already synced under its own
owner and returns when that person signs back in.

## Backend

One table, `public.course_state`, keyed `(user_id, course_slug, key)`, with RLS
restricting every row to its owner. Adding a course requires no migration and no
schema change — that is deliberate, since each artifact invents its own keys.

Access is invite-only: public signup is disabled on the Supabase project, and
cohort members are invited from the dashboard.

### Free-tier pausing

A Supabase project on the free plan pauses after about a week with no API
activity, and a paused project's hostname stops resolving entirely. The store
fails open, so the only symptom is every course quietly showing "Saved on this
device only" — which is exactly how this went unnoticed once already.

Signed-out visitors generate **no** Supabase traffic at all: `getSession()` reads
local storage and returns nothing, so no request is ever made. Course traffic
alone therefore does not keep the project alive.

**Static hosting cannot gate content.** Course HTML is a public file; anyone with
the URL can read it. Signing in gates *saved progress*, not access. Locking the
material itself would require a server rendering it behind auth.
