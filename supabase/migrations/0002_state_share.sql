-- =============================================================================
-- Read-only pairing for course_state
-- =============================================================================
-- 0001 gave every row exactly one reader: the account that wrote it. That is
-- right for course progress, and wrong for /resources/accountability/, where
-- the whole point is that someone else reads what you saved.
--
-- Rather than loosen the owner policy (which would widen all 17 courses at
-- once), this adds a second, purely additive SELECT policy. Postgres ORs
-- permissive policies together, so course_state_owner is untouched: no reader
-- gains INSERT, UPDATE or DELETE anywhere, and nothing is shared until a row
-- in state_share says so.
--
-- The grant is deliberately narrow on all three axes -- who, which slug, and
-- which keys -- because the interesting case is a slug where some keys are
-- meant to be read and others are not. The accountability check-in keeps
-- finished entries under `checkin:entries` and the half-written one under
-- `checkin:draft`; sharing the first without the second is the difference
-- between "he reads what I decided to say" and "he watches me type". Naming
-- the keys makes that a database guarantee rather than a promise the reader
-- page happens to keep.
-- =============================================================================

create table public.state_share (
  owner_id    uuid   not null references auth.users (id) on delete cascade,
  reader_id   uuid   not null references auth.users (id) on delete cascade,
  course_slug text   not null,
  -- Keys of (owner_id, course_slug) the reader may SELECT. No wildcard: an
  -- empty array shares nothing, which is the safe way for a half-finished row
  -- to fail.
  shared_keys text[] not null,
  -- What the reader sees this share called. auth.users is not readable by the
  -- `authenticated` role, so a reader cannot resolve owner_id to an email --
  -- without this the reader page could only offer a bare UUID.
  owner_label text,
  created_at  timestamptz not null default now(),
  primary key (owner_id, reader_id, course_slug),
  -- A share that names no keys is a mistake, not a revocation. Revoking is
  -- deleting the row.
  constraint state_share_keys_present check (cardinality(shared_keys) > 0),
  -- Sharing with yourself is already covered by course_state_owner, and would
  -- make the reader page list the owner's own entries back at them.
  constraint state_share_not_self check (owner_id <> reader_id)
);

-- The reader page walks the (reader_id) direction, which is not a prefix of the
-- primary key, so it needs its own index.
create index state_share_reader on public.state_share (reader_id, course_slug);

alter table public.state_share enable row level security;

-- The owner manages their own shares and can see them, so a share can always
-- be revoked by the person whose data it exposes.
create policy state_share_owner on public.state_share
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- The reader may read the rows that name them, and only those: this is what
-- lets the reader page discover what it has been given without being told.
-- SELECT only -- a reader cannot grant themselves anything.
create policy state_share_reader_select on public.state_share
  for select
  to authenticated
  using (reader_id = auth.uid());

-- Same reasoning as 0001: "expose new tables" is off, TRUNCATE bypasses RLS
-- and has no business being granted, so privileges are set by hand and anon is
-- shut out of the table entirely.
revoke all on table public.state_share from anon;
revoke all on table public.state_share from authenticated;
grant select, insert, update, delete on table public.state_share to authenticated;

-- =============================================================================
-- The additive read policy on course_state
-- =============================================================================
-- The EXISTS subquery is itself subject to state_share's RLS, evaluated as the
-- calling user. state_share_reader_select admits exactly the rows where
-- reader_id = auth.uid(), which is the only row this predicate needs -- so no
-- SECURITY DEFINER function and no privilege escalation path.

create policy course_state_shared_select on public.course_state
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.state_share s
      where s.owner_id = course_state.user_id
        and s.reader_id = auth.uid()
        and s.course_slug = course_state.course_slug
        and course_state.key = any (s.shared_keys)
    )
  );

-- =============================================================================
-- Granting a share
-- =============================================================================
-- Both accounts must already exist (Authentication -> Users -> Add user). Run
-- this in the SQL editor, which runs as a superuser and so is not filtered by
-- the policies above:
--
--   insert into public.state_share
--     (owner_id, reader_id, course_slug, shared_keys, owner_label)
--   select
--     owner.id, reader.id, 'accountability',
--     array['checkin:entries'], 'Check-ins'
--   from auth.users owner, auth.users reader
--   where owner.email  = 'her@example.com'
--     and reader.email = 'ben@example.com';
--
-- To revoke:
--
--   delete from public.state_share
--   where course_slug = 'accountability'
--     and owner_id = (select id from auth.users where email = 'her@example.com');
