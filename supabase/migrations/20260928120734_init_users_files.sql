-- Users and files schema.
-- Credentials live in auth.users (Supabase Auth); public.users is a profile row
-- mirrored from it by trigger. public.files stores S3 object metadata.

-- ---------------------------------------------------------------------------
-- public.users
-- ---------------------------------------------------------------------------
create table public.users (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Mirror new auth users into public.users.
-- email is NOT NULL, so sign-ups without an email (phone / anonymous auth)
-- will be rejected. The app only supports email auth.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- public.files
-- ---------------------------------------------------------------------------
create table public.files (
  document_id   uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users (user_id) on delete cascade,
  s3_url        text        not null,
  -- The object key is the stable identifier; s3_url breaks if bucket/region changes.
  s3_key        text        not null unique,
  original_name text        not null,
  content_type  text        not null,
  size_bytes    bigint      not null check (size_bytes > 0),
  created_at    timestamptz not null default now()
);

create index files_user_id_created_at_idx on public.files (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- (select auth.uid()) is evaluated once per statement instead of per row.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.files enable row level security;

create policy "users: select own row"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "files: select own"
  on public.files for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "files: insert own"
  on public.files for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "files: delete own"
  on public.files for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No update policy: file rows are immutable from the client.

-- Anonymous (unauthenticated) requests get no access at all.
revoke all on table public.users, public.files from anon;
