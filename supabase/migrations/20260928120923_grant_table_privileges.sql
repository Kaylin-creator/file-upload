-- Newer Supabase projects do not auto-grant DML on new public tables to the
-- API roles, so grant exactly what the RLS policies cover.
-- Revoke first: TRUNCATE is not subject to RLS.
revoke all on table public.users, public.files from anon, authenticated, service_role;

grant select on table public.users to authenticated, service_role;
grant select, insert, delete on table public.files to authenticated, service_role;
