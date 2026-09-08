# Supabase

The backend for `/courses/<slug>/` and `/resources/<slug>/`: one table of saved
state, and one table saying who may read whose. `assets/js/course-store.js` is
the only thing on the site that talks to it.

Project **Courses**, ref `haetugdidypkmgpmtyxj`. The URL and publishable key are
in `course-store.js` — they are public by design, and every rule that matters is
enforced by row-level security rather than by keeping a key secret.

## Applying a migration

```sh
bin/apply-migration                 # what exists, and what is applied
bin/apply-migration --dry-run 0003  # print the SQL, run nothing
bin/apply-migration 0003            # apply one
bin/apply-migration --all           # apply everything pending, in order
```

With no arguments it only reports, so it is safe to run to find out where things
stand.

There is **no `supabase` CLI here, no `psql`, no `config.toml`, no linked project
and no `.env`** — don't go looking. `bin/apply-migration` uses the Management API
with the personal access token at `~/.supabase/access-token` (or
`$SUPABASE_ACCESS_TOKEN`). Create one at
<https://supabase.com/dashboard/account/tokens>.

Each migration runs with its bookkeeping row in a single transaction, so a
failure part-way leaves nothing behind. What has been applied is recorded in
`supabase_migrations.schema_migrations` — the same table the Supabase CLI keeps,
so adopting the CLI later would not replay what is already done.

### Rules

- **Migrations are never edited after they run.** The script compares the stored
  copy against the file and reports `APPLIED*` if they differ. Editing an old
  file changes the record, not the schema; write a new migration instead.
- **Numeric prefix orders them.** `0003_what_it_does.sql`.
- **New tables need explicit grants.** "Automatically expose new tables" is off
  on this project. Follow the pattern in `0001`: `revoke all` from `anon` and
  `authenticated`, then grant back only what is needed. The revokes are not
  decorative — Supabase's default privileges include `TRUNCATE`, which bypasses
  RLS entirely.
- **Prefer an additive policy over widening an existing one.** Postgres ORs
  permissive policies together, which is how `0002` let one account read
  another's rows without touching the policy that protects all 17 courses.

## Testing RLS before trusting it

A policy that looks right and a policy that is right are different things, and
the difference is invisible until someone reads something they shouldn't. Probe
it as the actual roles, inside a transaction you roll back:

```sql
begin;
insert into auth.users (id, email) values ('1111...', 'probe@example.invalid');
-- ... rows, shares, whatever the policy reads ...

set local role authenticated;
set local request.jwt.claims = '{"sub":"1111...","role":"authenticated"}';
select ... ;  -- what can this principal actually see?

reset role;
rollback;
```

Two traps worth knowing:

- **A row count taken while impersonating is itself RLS-filtered**, so it cannot
  prove a write was blocked — "0 rows remaining" may just mean you can no longer
  see them. Assert from outside the impersonation.
- `read_only: true` on an API query blocks `SET ROLE`, so impersonation probes
  have to be a read-write request wrapped in `begin; ... rollback;`.

## What is here

| Migration | What it does |
|---|---|
| `0001_course_state.sql` | `course_state`, one row per (user, slug, key). Owner-only RLS. |
| `0002_state_share.sql` | `state_share` + an additive SELECT policy, so a named reader can read named keys of one slug. Backs `/resources/accountability/`. |

Sharing is granted by inserting a `state_share` row — the SQL is at the bottom of
`0002`. It is narrow on three axes (who, which slug, which keys) so that, for the
check-in, finished entries can be shared while the half-written draft is not.

To see what is currently shared:

```sql
select o.email as writes, r.email as reads, s.course_slug, s.shared_keys
from public.state_share s
join auth.users o on o.id = s.owner_id
join auth.users r on r.id = s.reader_id;
```

Revoking is deleting the row.

## Accounts

Sign-in is email + password and `course-store.js` offers no sign-up or password
reset, so accounts are made by hand in Authentication → Users. That is a
deliberate limit, not an oversight: nobody should be able to create an account on
this project from the open web.
