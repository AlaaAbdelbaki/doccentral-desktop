-- DocCentral cloud mirror schema.
-- Generated from the app entities (same tables/columns as the local SQLite DB,
-- which itself mirrors the Flutter app's Drift schema).
--
-- Run this once in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- Notes:
-- * Idempotent: safe to re-run (create table if not exists / drop policy if exists).
-- * No foreign keys on purpose — the offline-first push syncs table by table
--   with last-write-wins and must never be rejected for ordering reasons.
-- * RLS: any authenticated clinic user gets full access. Tighten to per-clinic
--   policies before onboarding a second clinic.

create table if not exists public.clinics (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  name text not null,
  address text,
  phone text,
  email text,
  invoice_footer text,
  logo_path text,
  locale text not null default 'fr-TN',
  currency text not null default 'TND'
);

create table if not exists public.users (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  clinic_id uuid not null,
  first_name text not null,
  last_name text not null default '',
  email text not null,
  auth_user_id text not null,
  is_clinic_owner integer not null default 0
);

create table if not exists public.roles (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  clinic_id uuid not null,
  name text not null
);

create table if not exists public.user_roles (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  user_id uuid not null,
  role_id uuid not null
);

create table if not exists public.patients (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  first_name text not null,
  last_name text not null,
  date_of_birth timestamptz not null,
  phone text not null,
  email text,
  history_notes text
);

create table if not exists public.appointments (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  patient_id uuid not null,
  assigned_user_id uuid not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled',
  reason text,
  notes text,
  rescheduled_to_appointment_id uuid
);

create table if not exists public.appointment_cancellations (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  appointment_id uuid not null,
  actor_user_id uuid not null,
  reason text not null,
  notes text
);

create table if not exists public.appointment_planned_treatments (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  appointment_id uuid not null,
  planned_treatment_id uuid not null
);

create table if not exists public.visits (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  appointment_id uuid not null,
  patient_id uuid not null,
  dentist_id uuid not null,
  status text not null default 'checked_in',
  started_at timestamptz not null,
  in_progress_at timestamptz,
  diagnosis text,
  clinical_notes text,
  ended_at timestamptz
);

create table if not exists public.performed_treatments (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  visit_id uuid not null,
  tooth_number text not null,
  procedure_name text not null,
  unit_price numeric not null,
  quantity integer not null,
  recorded_by_user_id uuid not null
);

create table if not exists public.planned_treatments (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  patient_id uuid not null,
  procedure_name text not null,
  tooth_number text not null,
  estimated_unit_price numeric not null,
  sequence_number integer not null,
  target_date timestamptz,
  status text not null default 'planned'
);

create table if not exists public.invoices (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  patient_id uuid not null,
  visit_id uuid not null,
  total_amount numeric not null,
  status text not null default 'draft',
  created_by_user_id uuid not null
);

create table if not exists public.invoice_items (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  invoice_id uuid not null,
  description text not null,
  tooth_number text,
  quantity integer not null,
  unit_price numeric not null,
  total_price numeric not null,
  adjustment_type text
);

create table if not exists public.payments (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  invoice_id uuid not null,
  amount numeric not null,
  method text not null default 'cash',
  payment_date timestamptz not null,
  notes text,
  recorded_by_user_id uuid not null
);

create table if not exists public.invoice_voids (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  invoice_id uuid not null,
  actor_user_id uuid not null,
  reason text not null
);

create table if not exists public.inventory_items (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  name text not null,
  category text not null,
  unit text not null,
  on_hand_quantity integer not null,
  low_stock_threshold integer not null
);

create table if not exists public.restock_events (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  inventory_item_id uuid not null,
  quantity_added integer not null,
  restock_date timestamptz not null,
  supplier text,
  notes text,
  actor_user_id uuid not null
);

create table if not exists public.stock_adjustments (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  inventory_item_id uuid not null,
  old_quantity integer not null,
  new_quantity integer not null,
  delta integer not null,
  reason text not null,
  actor_user_id uuid not null
);

create table if not exists public.attachments (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  target_type text not null,
  target_id uuid not null,
  file_name text not null,
  storage_path text not null,
  file_size_bytes bigint not null,
  uploaded_by_user_id uuid not null
);

create table if not exists public.day_closeouts (
  id uuid primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  closeout_date timestamptz not null,
  expected_cash numeric not null,
  counted_cash numeric not null,
  delta numeric not null,
  notes text,
  actor_user_id uuid not null,
  reopened_at timestamptz
);

-- Row Level Security: full access for any authenticated user (single-clinic MVP).
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
    execute format(
      'create policy authenticated_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
