-- RLS isolation test for public.users / public.files.
-- Run as the postgres role (SQL editor, psql, or Supabase MCP execute_sql).
-- Everything runs in one transaction and is rolled back; nothing is persisted.
-- Any failed assertion raises an exception and aborts the script.

begin;

-- ---------------------------------------------------------------------------
-- Setup (as postgres): two auth users, one file owned by user A.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'rls-test-a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'rls-test-b@example.com');

do $$
begin
  if (select count(*) from public.users
      where user_id in ('00000000-0000-0000-0000-00000000000a',
                        '00000000-0000-0000-0000-00000000000b')) <> 2 then
    raise exception 'FAIL: trigger did not create public.users rows';
  end if;
end $$;

insert into public.files (user_id, s3_url, s3_key, original_name, content_type, size_bytes)
values ('00000000-0000-0000-0000-00000000000a',
        'https://example-bucket.s3.amazonaws.com/a/test.txt',
        'rls-test/a/test.txt', 'test.txt', 'text/plain', 42);

-- ---------------------------------------------------------------------------
-- Act as user B.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
declare
  n int;
begin
  -- Acceptance criterion: B cannot read A's files.
  select count(*) into n from public.files;
  if n <> 0 then
    raise exception 'FAIL: user B can see % files row(s) (expected 0)', n;
  end if;

  select count(*) into n from public.users
  where user_id = '00000000-0000-0000-0000-00000000000a';
  if n <> 0 then
    raise exception 'FAIL: user B can see user A''s users row';
  end if;

  select count(*) into n from public.users;
  if n <> 1 then
    raise exception 'FAIL: user B sees % users row(s) (expected only their own)', n;
  end if;

  -- B cannot insert a file owned by A.
  begin
    insert into public.files (user_id, s3_url, s3_key, original_name, content_type, size_bytes)
    values ('00000000-0000-0000-0000-00000000000a',
            'https://example-bucket.s3.amazonaws.com/a/evil.txt',
            'rls-test/a/evil.txt', 'evil.txt', 'text/plain', 1);
    raise exception 'FAIL: user B inserted a file for user A';
  exception
    when insufficient_privilege then null;  -- 42501, expected
  end;

  -- B cannot delete A's file.
  delete from public.files where user_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: user B deleted % of user A''s files', n;
  end if;

  -- B can insert their own file.
  insert into public.files (user_id, s3_url, s3_key, original_name, content_type, size_bytes)
  values ('00000000-0000-0000-0000-00000000000b',
          'https://example-bucket.s3.amazonaws.com/b/own.txt',
          'rls-test/b/own.txt', 'own.txt', 'text/plain', 7);

  -- No update grant or policy: updates are rejected, even on B's own rows.
  begin
    update public.files set original_name = 'renamed.txt';
    raise exception 'FAIL: update on files was permitted';
  exception
    when insufficient_privilege then null;  -- 42501, expected
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Act as user A.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare
  n int;
begin
  select count(*) into n from public.files;
  if n <> 1 then
    raise exception 'FAIL: user A sees % files row(s) (expected 1)', n;
  end if;

  select count(*) into n from public.users
  where user_id = '00000000-0000-0000-0000-00000000000a';
  if n <> 1 then
    raise exception 'FAIL: user A cannot see their own users row';
  end if;
end $$;

select 'ALL RLS TESTS PASSED' as result;

rollback;
