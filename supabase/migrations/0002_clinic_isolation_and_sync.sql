-- DocCentral: per-clinic data isolation + server support for two-way sync.
--
-- Run once in the Supabase SQL editor, after 0001_init_doccentral.sql.
-- Idempotent: safe to re-run.
--
-- 1. Isolation. Every row carries clinic_id; a signed-in user can only see or
--    change rows of clinics they belong to (a live row in public.users with
--    their auth id). Replaces 0001's "any authenticated user can do anything".
--    The only way to become a member is to create the clinic yourself, or to
--    be added by an existing member — you cannot add yourself to someone
--    else's clinic. Hard deletes are not allowed through the API (the app only
--    soft-deletes).
-- 2. Sync. server_updated_at is stamped by the server on every write so
--    devices can pull "what changed since my last pull" without trusting their
--    own clocks; an update carrying an older updated_at than the stored row is
--    ignored, so the newest write wins regardless of which device pushes first.
--
-- Existing rows: if the project holds exactly one clinic, every existing row
-- is assigned to it. With several clinics, rows without clinic_id stay
-- invisible until assigned manually.

-- ---------------------------------------------------------------- columns
alter table public.clinics add column if not exists created_by uuid default auth.uid();

do $$
declare t text;
begin
  foreach t in array array[
    'user_roles','patients',
    'appointments','appointment_cancellations','appointment_planned_treatments',
    'visits','performed_treatments','planned_treatments',
    'invoices','invoice_items','payments','invoice_voids',
    'inventory_items','restock_events','stock_adjustments',
    'attachments','day_closeouts'
  ] loop
    execute format('alter table public.%I add column if not exists clinic_id uuid', t);
  end loop;

  foreach t in array array[
    'clinics','users','roles','user_roles','patients',
    'appointments','appointment_cancellations','appointment_planned_treatments',
    'visits','performed_treatments','planned_treatments',
    'invoices','invoice_items','payments','invoice_voids',
    'inventory_items','restock_events','stock_adjustments',
    'attachments','day_closeouts'
  ] loop
    execute format(
      'alter table public.%I add column if not exists server_updated_at timestamptz not null default clock_timestamp()', t);
    execute format(
      'create index if not exists %I on public.%I (server_updated_at, id)', t || '_server_updated_at_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- backfill
do $$
declare
  only_clinic uuid;
  t text;
begin
  if (select count(*) from public.clinics) = 1 then
    select id into only_clinic from public.clinics;
    foreach t in array array[
      'user_roles','patients',
      'appointments','appointment_cancellations','appointment_planned_treatments',
      'visits','performed_treatments','planned_treatments',
      'invoices','invoice_items','payments','invoice_voids',
      'inventory_items','restock_events','stock_adjustments',
      'attachments','day_closeouts'
    ] loop
      execute format('update public.%I set clinic_id = $1 where clinic_id is null', t) using only_clinic;
    end loop;
  end if;

  -- Clinics created before this migration: the owner is the creator.
  update public.clinics c set created_by = u.auth_user_id::uuid
  from public.users u
  where c.created_by is null and u.clinic_id = c.id and u.is_clinic_owner = 1
    and u.auth_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
end $$;

-- ---------------------------------------------------------------- membership
-- SECURITY DEFINER so policies on public.users can call it without recursing
-- into users' own RLS.
create or replace function public.is_clinic_member(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.clinic_id = cid
      and u.auth_user_id = auth.uid()::text
      and u.deleted_at is null
  );
$$;
revoke all on function public.is_clinic_member(uuid) from public;
grant execute on function public.is_clinic_member(uuid) to authenticated;

-- ---------------------------------------------------------------- sync guard
create or replace function public.dc_sync_guard()
returns trigger
language plpgsql
as $$
begin
  -- Last write wins: ignore an update older than what is stored.
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.server_updated_at := clock_timestamp();
  new.sync_status := 'synced';
  return new;
end;
$$;

-- ---------------------------------------------------------------- policies
do $$
declare t text;
begin
  foreach t in array array[
    'clinics','users','roles','user_roles','patients',
    'appointments','appointment_cancellations','appointment_planned_treatments',
    'visits','performed_treatments','planned_treatments',
    'invoices','invoice_items','payments','invoice_voids',
    'inventory_items','restock_events','stock_adjustments',
    'attachments','day_closeouts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists authenticated_all on public.%I', t);
    execute format('drop policy if exists dc_select on public.%I', t);
    execute format('drop policy if exists dc_insert on public.%I', t);
    execute format('drop policy if exists dc_update on public.%I', t);

    execute format('drop trigger if exists dc_sync_guard on public.%I', t);
    execute format(
      'create trigger dc_sync_guard before insert or update on public.%I
         for each row execute function public.dc_sync_guard()', t);

    if t = 'clinics' then
      execute 'create policy dc_select on public.clinics for select to authenticated
                 using (public.is_clinic_member(id) or created_by = auth.uid())';
      execute 'create policy dc_insert on public.clinics for insert to authenticated
                 with check (created_by = auth.uid())';
      execute 'create policy dc_update on public.clinics for update to authenticated
                 using (public.is_clinic_member(id) or created_by = auth.uid())
                 with check (public.is_clinic_member(id) or created_by = auth.uid())';
    elsif t = 'users' then
      -- Members see their clinic's users; everyone sees their own rows. The
      -- latter is required for the owner's first upsert (INSERT .. ON CONFLICT
      -- checks the new row against SELECT policies too) and lets a device look
      -- up the signed-in account's membership.
      execute 'create policy dc_select on public.users for select to authenticated
                 using (public.is_clinic_member(clinic_id) or auth_user_id = auth.uid()::text)';
      -- Members add staff; a clinic''s creator adds their own (first) user row.
      execute 'create policy dc_insert on public.users for insert to authenticated
                 with check (
                   public.is_clinic_member(clinic_id)
                   or (auth_user_id = auth.uid()::text
                       and exists (select 1 from public.clinics c
                                   where c.id = clinic_id and c.created_by = auth.uid())))';
      execute 'create policy dc_update on public.users for update to authenticated
                 using (public.is_clinic_member(clinic_id))
                 with check (public.is_clinic_member(clinic_id))';
    else
      execute format('create policy dc_select on public.%I for select to authenticated
                        using (public.is_clinic_member(clinic_id))', t);
      execute format('create policy dc_insert on public.%I for insert to authenticated
                        with check (public.is_clinic_member(clinic_id))', t);
      execute format('create policy dc_update on public.%I for update to authenticated
                        using (public.is_clinic_member(clinic_id))
                        with check (public.is_clinic_member(clinic_id))', t);
    end if;
  end loop;
end $$;
