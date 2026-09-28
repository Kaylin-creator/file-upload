# file-upload

## Database

Schema lives in `supabase/migrations/`. Passwords are handled by Supabase Auth; `public.users` is populated by a trigger on `auth.users`.

- **Apply:** `supabase db push` (linked project) or `supabase db reset` (local), or paste the migration into the SQL editor.
- **RLS test:** run `supabase/tests/rls_files_isolation.sql` as `postgres` (SQL editor or `psql`). It prints `ALL RLS TESTS PASSED` and rolls back.
- **Types:** `types/database.ts` mirrors the schema. Regenerate with `supabase gen types typescript --linked > types/database.ts` after schema changes.
