-- DocCentral: in-app bug reports ("Report a problem").
--
-- Run once in the Supabase SQL editor, after 0002. Idempotent: safe to re-run.
--
-- Signed-in users can file reports; nobody can read, change or delete them
-- through the API — not even the reporter. Read them in the Supabase
-- dashboard (Table editor → bug_reports, Storage → bug-reports), which uses
-- the service role.
--
-- Attachments go to the private "bug-reports" storage bucket, under a folder
-- named after the reporter's auth id: <auth uid>/<report id>/<file>.
-- Device information and logs are only present when the user chose to
-- include them.

create table if not exists public.bug_reports (
  id uuid primary key,
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  reporter_auth_id uuid not null default auth.uid(),
  clinic_id uuid,
  description text not null check (char_length(description) between 1 and 10000),
  app_version text check (char_length(app_version) <= 50),
  language text check (char_length(language) <= 10),
  diagnostics jsonb check (diagnostics is null or pg_column_size(diagnostics) <= 65536),
  logs text check (logs is null or char_length(logs) <= 300000),
  attachments jsonb not null default '[]'::jsonb
);

alter table public.bug_reports enable row level security;

-- Insert only. No select/update/delete policy, and no privileges for them.
revoke all on public.bug_reports from anon, authenticated;
grant insert on public.bug_reports to authenticated;

drop policy if exists bug_reports_insert on public.bug_reports;
create policy bug_reports_insert on public.bug_reports
  for insert to authenticated
  with check (
    reporter_auth_id = auth.uid()
    and (clinic_id is null or public.is_clinic_member(clinic_id))
  );

-- ---------------------------------------------------------------- storage
do $$
begin
  if to_regclass('storage.buckets') is null then
    return; -- no Supabase Storage (e.g. a plain Postgres used for tests)
  end if;

  insert into storage.buckets (id, name, public, file_size_limit)
  values ('bug-reports', 'bug-reports', false, 10485760)
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

  -- Upload only, into your own folder. No read, overwrite or delete.
  execute 'drop policy if exists bug_reports_upload on storage.objects';
  execute $p$
    create policy bug_reports_upload on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'bug-reports'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;
end $$;
