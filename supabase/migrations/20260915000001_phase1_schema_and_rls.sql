-- ==============================================================================
-- CLC CRM — Phase 1 Migration: Schema, Auth Trigger, and Row Level Security
-- References:
--   - docs/CLC-CRM-Technical-Specification.md (Section 4 & Section 5)
--   - AGENTS.md (Non-negotiables: RLS mandatory on every table, employee isolation)
-- ==============================================================================

-- 1. EXTENSIONS (gen_random_uuid() is native in Postgres 13+; wrap optional extensions safely)
do $$ begin
  create extension if not exists "pgcrypto";
exception when others then null;
end $$;

do $$ begin
  create extension if not exists "uuid-ossp";
exception when others then null;
end $$;


-- 2. CUSTOM ENUMS
do $$ begin
  create type user_role as enum ('admin', 'employee');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type lead_status as enum ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type activity_type as enum ('visit', 'email', 'call', 'meeting', 'other');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type related_entity as enum ('lead', 'customer');
exception
  when duplicate_object then null;
end $$;

-- 3. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. DISTRICTS (reference table)
create table if not exists public.districts (
  id serial primary key,
  city text not null default 'Riyadh',
  name_en text not null,
  name_ar text not null,
  latitude numeric not null,
  longitude numeric not null,
  unique (city, name_en)
);

create index if not exists idx_districts_city on public.districts(city);

-- 5. LEADS
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  source text,                     -- referral, website, cold call, exhibition...
  status lead_status not null default 'new',
  estimated_value numeric,         -- estimated project/contract value
  project_type text,               -- e.g. residential, commercial, infrastructure
  district_id integer references public.districts(id),
  assigned_to uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_assigned on public.leads(assigned_to);
create index if not exists idx_leads_district on public.leads(district_id);

-- 6. CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  district_id integer references public.districts(id),
  converted_from_lead_id uuid references public.leads(id),
  assigned_to uuid references public.profiles(id),
  customer_since date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_assigned on public.customers(assigned_to);
create index if not exists idx_customers_district on public.customers(district_id);

-- 7. ACTIVITIES (the daily field activities)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  related_entity_type related_entity not null,
  related_entity_id uuid not null,          -- lead_id or customer_id
  activity_type activity_type not null,
  description text,
  activity_date timestamptz not null default now(),
  latitude numeric,                          -- captured automatically for 'visit'
  longitude numeric,
  attachment_url text,                       -- Supabase Storage path (photo, email screenshot)
  follow_up_date date,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_employee_date on public.activities(employee_id, activity_date);
create index if not exists idx_activities_entity on public.activities(related_entity_type, related_entity_id);

-- 8. HELPER FUNCTIONS & TRIGGERS

-- 8a. Nearest-district lookup (used to auto-suggest a district when a visit is GPS-tagged)
create or replace function public.nearest_district(lat numeric, lng numeric, p_city text default 'Riyadh')
returns integer as $$
  select id
  from public.districts
  where city = p_city
  order by sqrt(power(latitude - lat, 2) + power(longitude - lng, 2))
  limit 1;
$$ language sql stable;

-- 8b. Helper to check if current user is admin without recursion
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = coalesce(user_id, auth.uid()) and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

-- 8c. Auto-update timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
  before update on public.leads
  for each row execute function public.handle_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.handle_updated_at();

-- 8d. Auth signup trigger: creates a profiles row on auth.users insert, defaulting role to 'employee'
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'employee'::user_role)
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = coalesce(excluded.phone, profiles.phone);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on every table
alter table public.districts enable row level security;
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.activities enable row level security;

-- ------------------------------------------------------------------------------
-- 9a. DISTRICTS POLICIES
-- Reference table: all authenticated users can read, no direct edits from app
-- ------------------------------------------------------------------------------
drop policy if exists "districts_select_all" on public.districts;
create policy "districts_select_all" on public.districts
  for select using (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 9b. PROFILES POLICIES
-- Authenticated users can view team profiles.
-- Admins can update/manage all profiles; users can update their own personal info (non-role).
-- ------------------------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (
    id = auth.uid() or is_admin()
  )
  with check (
    is_admin() or (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
  );

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert with check (is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete using (is_admin());

-- ------------------------------------------------------------------------------
-- 9c. LEADS POLICIES
-- Employees see and update only their assigned leads; Admins see and edit all.
-- Employees can create leads assigned to themselves; Admins can assign to anyone.
-- ------------------------------------------------------------------------------
drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads
  for select using (
    assigned_to = auth.uid()
    or is_admin()
  );

drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads
  for insert with check (
    assigned_to = auth.uid()
    or is_admin()
  );

drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads
  for update using (
    assigned_to = auth.uid()
    or is_admin()
  )
  with check (
    assigned_to = auth.uid()
    or is_admin()
  );

drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads
  for delete using (
    is_admin()
  );

-- ------------------------------------------------------------------------------
-- 9d. CUSTOMERS POLICIES
-- Same pattern: Employees see only their assigned customers; Admins see and edit all.
-- ------------------------------------------------------------------------------
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers
  for select using (
    assigned_to = auth.uid()
    or is_admin()
  );

drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers
  for insert with check (
    assigned_to = auth.uid()
    or is_admin()
  );

drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers
  for update using (
    assigned_to = auth.uid()
    or is_admin()
  )
  with check (
    assigned_to = auth.uid()
    or is_admin()
  );

drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers
  for delete using (
    is_admin()
  );

-- ------------------------------------------------------------------------------
-- 9e. ACTIVITIES POLICIES
-- Strict field employee isolation:
-- - An employee only ever logs activities against their own employee_id
-- - An employee only ever views their own activities
-- - Admins see all activities and can log on behalf of the company
-- ------------------------------------------------------------------------------
drop policy if exists "activities_insert" on public.activities;
create policy "activities_insert" on public.activities
  for insert with check (
    employee_id = auth.uid()
    or is_admin()
  );

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select using (
    employee_id = auth.uid()
    or is_admin()
  );

drop policy if exists "activities_update" on public.activities;
create policy "activities_update" on public.activities
  for update using (
    employee_id = auth.uid()
    or is_admin()
  )
  with check (
    employee_id = auth.uid()
    or is_admin()
  );

drop policy if exists "activities_delete" on public.activities;
create policy "activities_delete" on public.activities
  for delete using (
    is_admin()
  );
