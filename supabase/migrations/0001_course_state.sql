-- =============================================================================
-- Course progress persistence
-- =============================================================================
-- Backs the self-contained course artifacts under /courses/<slug>/.
--
-- One row per (user, course, storage key). `value` is text rather than jsonb
-- because these rows mirror browser localStorage entries, and localStorage
-- values are always strings -- some artifacts store JSON, others store bare
-- numbers or flags, and jsonb would reject the latter at write time.
--
-- Deliberately schemaless in the shape of a course's progress: every artifact
-- invents its own keys, so adding a course must never require a migration.
-- =============================================================================

create table public.course_state (
  user_id     uuid not null references auth.users (id) on delete cascade,
  course_slug text not null,
  key         text not null,
  value       text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, course_slug, key)
);

-- No secondary index on (user_id, course_slug): it is a leading prefix of the
-- primary key, so the PK index already serves per-course lookups.

alter table public.course_state enable row level security;

create policy course_state_owner on public.course_state
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- "Automatically expose new tables" is off on this project, so privileges are
-- granted by hand. Only `authenticated` is granted: the `anon` role cannot
-- reach this table at all, independent of the RLS policy above.
--
-- The revokes are not redundant. Supabase's default privileges on the public
-- schema hand anon, authenticated and service_role a baseline that includes
-- TRUNCATE -- and TRUNCATE bypasses RLS, so any role holding it could wipe
-- every user's progress rather than just its own rows. PostgREST does not
-- expose TRUNCATE today, which makes this hardening rather than a live fix, but
-- the grant has no business existing either way.
revoke all on table public.course_state from anon;
revoke all on table public.course_state from authenticated;
grant select, insert, update, delete on table public.course_state to authenticated;

-- =============================================================================
-- updated_at maintenance
-- =============================================================================
-- The column default covers INSERT. Upserts land as ON CONFLICT DO UPDATE, so
-- they need this trigger to refresh the timestamp.
--
-- `set search_path = ''` is required to satisfy Supabase's
-- function_search_path_mutable linter. The body touches no tables, so an empty
-- search path is safe.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger course_state_touch
  before update on public.course_state
  for each row
  execute function public.touch_updated_at();
