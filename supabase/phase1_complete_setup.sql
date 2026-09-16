-- ==============================================================================
-- CLC CRM — Phase 1: Complete Setup Script (Schema, Seed, Functions, Triggers, RLS)
-- Paste and execute this entire script in your Supabase Dashboard SQL Editor
-- or run it via Supabase CLI.
-- ==============================================================================

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
    (
      assigned_to = auth.uid()
      or is_admin()
    )
    and (created_at >= (now() - interval '24 hours'))
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
    (
      assigned_to = auth.uid()
      or is_admin()
    )
    and (created_at >= (now() - interval '24 hours'))
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


-- ==============================================================================
-- RIYADH DISTRICTS SEED DATA (187 LOCATIONS)
-- ==============================================================================

-- ============================================================
-- Riyadh Districts — reference data + schema wiring
-- Source: riyadh.json (187 locations)
-- ============================================================

-- 1. Reference table
create table if not exists districts (
  id serial primary key,
  city text not null default 'Riyadh',
  name_en text not null,
  name_ar text not null,
  latitude numeric not null,
  longitude numeric not null,
  unique (city, name_en)
);

create index if not exists idx_districts_city on districts(city);

-- 2. Link leads & customers to a district
alter table leads add column if not exists district_id integer references districts(id);
alter table customers add column if not exists district_id integer references districts(id);
create index if not exists idx_leads_district on leads(district_id);
create index if not exists idx_customers_district on customers(district_id);

-- 3. Seed data — 187 Riyadh locations (districts, universities, industrial zones)
insert into districts (city, name_en, name_ar, latitude, longitude)
values
  ('Riyadh', '2nd Industrial City', 'المدينة الصناعية الثانية', 24.5443775469654, 46.89813181872875),
  ('Riyadh', 'Imam Muhammed Bin Saud Islamic University', 'جامعة الامام محمد بن سعود الاسلامية', 24.8161636730616, 46.70485394168685),
  ('Riyadh', 'King Saud University', 'جامعة الملك سعود', 24.724004653227247, 46.624481099103),
  ('Riyadh', 'Ohod District', 'حي احد', 24.4899208331222, 46.63499879238),
  ('Riyadh', 'Ishbiliyah District', 'حي اشبيلية', 24.792801833415353, 46.792184083976395),
  ('Riyadh', 'Al Ezdihar District', 'حي الازدهار', 24.78060508232575, 46.7174732328575),
  ('Riyadh', 'Al Iskan District', 'حي الاسكان', 24.5739300011678, 46.84775127530045),
  ('Riyadh', 'Al Andalus District', 'حي الاندلس', 24.7434819057786, 46.78860811434375),
  ('Riyadh', 'Al Badeah District', 'حي البديعة', 24.61618009442305, 46.68089417066125),
  ('Riyadh', 'Al Bariyah District', 'حي البرية', 24.547295879224748, 46.93807058332645),
  ('Riyadh', 'Al Butaiha District', 'حي البطيحا', 24.62186836150305, 46.72010919409445),
  ('Riyadh', 'Al Bayan District', 'حي البيان', 24.87233843584215, 46.86383212203615),
  ('Riyadh', 'Al Tadamon District', 'حي التضامن', 25.12414033703045, 47.0872922596526),
  ('Riyadh', 'Al Taawun District', 'حي التعاون', 24.773041377829202, 46.69952030309665),
  ('Riyadh', 'Al Jarradiyah District', 'حي الجرادية', 24.61870976763095, 46.69908536642325),
  ('Riyadh', 'Al Jazeerah District', 'حي الجزيرة', 24.66467216841085, 46.796423922769904),
  ('Riyadh', 'Al Janadriyah District', 'حي الجنادرية', 24.866099807544, 46.924457383912156),
  ('Riyadh', 'Al Haer District', 'حي الحائر', 24.4150380465843, 46.8881549006652),
  ('Riyadh', 'Al Hazm District', 'حي الحزم', 24.538411276798698, 46.64625189564785),
  ('Riyadh', 'Al Hamra District', 'حي الحمراء', 24.7755121269434, 46.753545407450105),
  ('Riyadh', 'Al Khalidiyah District', 'حي الخالدية', 24.6232965573533, 46.75331789066005),
  ('Riyadh', 'Al Khuzama District', 'حي الخزامى', 24.7097900673778, 46.609486086377004),
  ('Riyadh', 'Al Khaleej District', 'حي الخليج', 24.77675743365695, 46.8029839182787),
  ('Riyadh', 'Al Khair District', 'حي الخير', 25.05691918143135, 46.427969752665845),
  ('Riyadh', 'Al Dar Al Baida District', 'حي الدار البيضاء', 24.56496829224325, 46.79228144089825),
  ('Riyadh', 'Al Danah District', 'حي الدانة', 25.082199434093653, 47.230450533850956),
  ('Riyadh', 'Al Dahou District', 'حي الدحو', 24.6295143265849, 46.7141861800323),
  ('Riyadh', 'Al Duraihemiyah District', 'حي الدريهمية', 24.58947103464505, 46.6953271681632),
  ('Riyadh', 'Al Difaa District', 'حي الدفاع', 24.5860130288533, 46.832414552668354),
  ('Riyadh', 'Al Dubiyah District', 'حي الدوبية', 24.6218009840959, 46.7121685620506),
  ('Riyadh', 'Al Dirah District', 'حي الديرة', 24.630576806708852, 46.71082736687405),
  ('Riyadh', 'Al Raed District', 'حي الرائد', 24.70734925048205, 46.6386453349467),
  ('Riyadh', 'Al Rayah District', 'حي الراية', 25.04187278053145, 47.20343888263065),
  ('Riyadh', 'Al Rabwah District', 'حي الربوة', 24.693765294168898, 46.75453483182145),
  ('Riyadh', 'Al Rabie District', 'حي الربيع', 24.79470661223435, 46.66067459185665),
  ('Riyadh', 'Al Rihab District', 'حي الرحاب', 25.0938198625188, 47.2702129012795),
  ('Riyadh', 'Al Rahmaniyah District', 'حي الرحمانية', 24.7160903269508, 46.6594190253035),
  ('Riyadh', 'Al Risalah District', 'حي الرسالة', 25.04856042027495, 47.23984156252825),
  ('Riyadh', 'Al Rafeah District', 'حي الرفيعة', 24.637832402673702, 46.66037328868065),
  ('Riyadh', 'Al Rimal District', 'حي الرمال', 24.96390412624085, 46.7593319076992),
  ('Riyadh', 'Al Rimayah District', 'حي الرماية', 24.770429327526998, 46.873648148631105),
  ('Riyadh', 'Al Rawabi District', 'حي الروابي', 24.69608355905875, 46.79151632966955),
  ('Riyadh', 'Al Rawdah District', 'حي الروضة', 24.7338276692895, 46.7679144040874),
  ('Riyadh', 'Al Rayan District', 'حي الريان', 24.711310936826848, 46.778243088126004),
  ('Riyadh', 'Al Zaher District', 'حي الزاهر', 25.04742618631215, 47.0680663846394),
  ('Riyadh', 'Al Zahra District', 'حي الزهراء', 24.687059024064247, 46.7320432782066),
  ('Riyadh', 'Al Zahrah District', 'حي الزهرة', 24.5786526188313, 46.64575228387435),
  ('Riyadh', 'Al Zahour District', 'حي الزهور', 25.0775580049252, 47.20001362086765),
  ('Riyadh', 'Al Sahab District', 'حي السحاب', 24.93920614689185, 46.966102179048704),
  ('Riyadh', 'Al Sidrah District', 'حي السدرة', 24.44928733922375, 46.88042787708885),
  ('Riyadh', 'Al Saadah District', 'حي السعادة', 24.697591166686998, 46.8366281795423),
  ('Riyadh', 'Diplomatic Quarter', 'حي السفارات', 24.68037149806085, 46.621552194610004),
  ('Riyadh', 'Al Salam District', 'حي السلام', 24.70776932696165, 46.8111998950405),
  ('Riyadh', 'Al Sulay District', 'حي السلي', 24.654058706220248, 46.85279718921165),
  ('Riyadh', 'Al Sulaimaniyah District', 'حي السليمانية', 24.69839682801205, 46.699995301092),
  ('Riyadh', 'Al Suwaidi District', 'حي السويدي', 24.59077661054195, 46.679689824376055),
  ('Riyadh', 'West Suwaidi District', 'حي السويدي الغربي', 24.574423148313898, 46.62474040284965),
  ('Riyadh', 'Al Sharafiyah District', 'حي الشرفية', 24.6603830310133, 46.66868412763865),
  ('Riyadh', 'Al Sholah District', 'حي الشعلة', 25.071238822625048, 47.1399182118257),
  ('Riyadh', 'Al Shifa District', 'حي الشفا', 24.565087716593, 46.69858224474444),
  ('Riyadh', 'Al Shumaisi District', 'حي الشميسي', 24.62415941925505, 46.699389796295804),
  ('Riyadh', 'Al Shohda District', 'حي الشهداء', 24.7881690960157, 46.73543004522125),
  ('Riyadh', 'Al Salhiyah District', 'حي الصالحية', 24.63436747756835, 46.733994340356546),
  ('Riyadh', 'Al Sahafah District', 'حي الصحافة', 24.79642166136115, 46.6376523927872),
  ('Riyadh', 'Al Safa District', 'حي الصفا', 24.6668609873924, 46.7664509759442),
  ('Riyadh', 'Al Sinaiyah District', 'حي الصناعية', 24.6421702483313, 46.747529483787304),
  ('Riyadh', 'Al Dhubbat District', 'حي الضباط', 24.6800014189446, 46.7235535611358),
  ('Riyadh', 'Al Arid District', 'حي العارض', 24.8982943940027, 46.60240817645515),
  ('Riyadh', 'Al Uraija District', 'حي العريجاء', 24.62593670930095, 46.656423578769946),
  ('Riyadh', 'West Oraija District', 'حي العريجاء الغربي', 24.5977810137454, 46.5999084910036),
  ('Riyadh', 'Middle Oraija District', 'حي العريجاء الوسطى', 24.60577725427915, 46.6408516832037),
  ('Riyadh', 'Al Aziziyah District', 'حي العزيزية', 24.586872013821, 46.77306162114865),
  ('Riyadh', 'Al Aqeeq District', 'حي العقيق', 24.7736098096288, 46.62998228686265),
  ('Riyadh', 'Al Ula District', 'حي العلا', 25.019997497232502, 47.1373832208349),
  ('Riyadh', 'Al Olaya District', 'حي العليا', 24.692336980601752, 46.68349266249455),
  ('Riyadh', 'Al Ammajiyah District', 'حي العماجية', 24.4414563781123, 46.97782432027145),
  ('Riyadh', 'Al Amal District', 'حي العمل', 24.645724712571948, 46.72441882159025),
  ('Riyadh', 'Al Awaly District', 'حي العوالي', 24.55976226323295, 46.61760432368885),
  ('Riyadh', 'Al Oud District', 'حي العود', 24.62668608222805, 46.726373251683555),
  ('Riyadh', 'Al Ghadeer District', 'حي الغدير', 24.7736416090207, 46.6545874252989),
  ('Riyadh', 'Al Ghannamiyah District', 'حي الغنامية', 24.4760451655819, 46.820959167671006),
  ('Riyadh', 'Al Fakhiriyah District', 'حي الفاخرية', 24.6419725861003, 46.6827980076781),
  ('Riyadh', 'Al Farooq District', 'حي الفاروق', 24.6537671486584, 46.77326113000465),
  ('Riyadh', 'Al Fursan District', 'حي الفرسان', 25.004226125700647, 47.1799400575417),
  ('Riyadh', 'Al Falah District', 'حي الفلاح', 24.79704204016805, 46.709209873046746),
  ('Riyadh', 'Al Futah District', 'حي الفوطة', 24.64217056826915, 46.71045837812845),
  ('Riyadh', 'Al Fayha District', 'حي الفيحاء', 24.6818827674266, 46.811511943789654),
  ('Riyadh', 'Al Faisaliyah District', 'حي الفيصلية', 24.634373767658303, 46.78168255106115),
  ('Riyadh', 'Al Qadisiyah District', 'حي القادسية', 24.8197305350861, 46.82396314233285),
  ('Riyadh', 'Al Quds District', 'حي القدس', 24.753868959690948, 46.7544135954104),
  ('Riyadh', 'Al Qura District', 'حي القرى', 24.62816898443275, 46.7156435160465),
  ('Riyadh', 'Al Qairawan District', 'حي القيروان', 24.873450134131453, 46.5552308563955),
  ('Riyadh', 'Al Mutamarat District', 'حي المؤتمرات', 24.669859145307598, 46.68697127903535),
  ('Riyadh', 'Al Majd District', 'حي المجد', 25.06397487219365, 47.280928333374106),
  ('Riyadh', 'Al Muhammadiyah District', 'حي المحمدية', 24.732528155717603, 46.64885085929215),
  ('Riyadh', 'Al Murabba District', 'حي المربع', 24.662884283105548, 46.70701524970345),
  ('Riyadh', 'Al Marjan District', 'حي المرجان', 24.9314698788586, 46.87627100561765),
  ('Riyadh', 'Al Mursalat District', 'حي المرسلات', 24.748864589818247, 46.6899002158718),
  ('Riyadh', 'Al Marqab District', 'حي المرقب', 24.634901040410803, 46.7264928531254),
  ('Riyadh', 'Al Marwah District', 'حي المروة', 24.54081913385015, 46.67573975986075),
  ('Riyadh', 'Al Muruj District', 'حي المروج', 24.757227897290598, 46.66197230088635),
  ('Riyadh', 'Al Mishael District', 'حي المشاعل', 24.61589760722115, 46.868709975574504),
  ('Riyadh', 'Al Mashriq District', 'حي المشرق', 24.982238113651, 47.0513514940929),
  ('Riyadh', 'Al Masani District', 'حي المصانع', 24.552363472683, 46.744107438016954),
  ('Riyadh', 'Al Misfat District', 'حي المصفاة', 24.479509620297748, 46.91288960825),
  ('Riyadh', 'Al Maseef District', 'حي المصيف', 24.76546938950645, 46.68152874776675),
  ('Riyadh', 'Al Mathar District', 'حي المعذر', 24.66604457371175, 46.6687606885297),
  ('Riyadh', 'North Mathar District', 'حي المعذر الشمالي', 24.69164182212665, 46.666244760455456),
  ('Riyadh', 'Al Maizalah District', 'حي المعيزلة', 24.7916610711615, 46.837708492204996),
  ('Riyadh', 'Al Mughrazat District', 'حي المغرزات', 24.7640167703495, 46.7257525115214),
  ('Riyadh', 'Al Malaz District', 'حي الملز', 24.6643379899381, 46.73535070050495),
  ('Riyadh', 'Al Malqa District', 'حي الملقا', 24.8007576935018, 46.59773805054185),
  ('Riyadh', 'King Abdulaziz District', 'حي الملك عبدالعزيز', 24.720995876817298, 46.719721194187855),
  ('Riyadh', 'King Abdullah District', 'حي الملك عبدالله', 24.7324342397707, 46.741432744498354),
  ('Riyadh', 'King Fahd District', 'حي الملك فهد', 24.740613264235, 46.67036736685835),
  ('Riyadh', 'King Faisal District', 'حي الملك فيصل', 24.761686476066153, 46.77467155499925),
  ('Riyadh', 'Al Manakh District', 'حي المناخ', 24.608927177462803, 46.8068700126786),
  ('Riyadh', 'Al Manar District', 'حي المنار', 24.7253635870059, 46.7972684554785),
  ('Riyadh', 'Al Mansurah District', 'حي المنصورة', 24.608133495625403, 46.74685736112405),
  ('Riyadh', 'Mansuriyah District', 'حي المنصورية', 24.518809668795747, 46.8015116263254),
  ('Riyadh', 'Al Mahdiyah District', 'حي المهدية', 24.64711272545005, 46.53647134617765),
  ('Riyadh', 'Al Munisiyah District', 'حي المونسية', 24.83270416595895, 46.7677609487883),
  ('Riyadh', 'Al Nasiriyah District', 'حي الناصرية', 24.6518767520938, 46.680030557856554),
  ('Riyadh', 'Al Nakhbah District', 'حي النخبة', 25.0254343638089, 47.2750603759819),
  ('Riyadh', 'Al Nakheel District', 'حي النخيل', 24.7424194138176, 46.622996141393),
  ('Riyadh', 'Al Nadwah District', 'حي الندوة', 24.79422532676335, 46.875425374254505),
  ('Riyadh', 'Al Nada District', 'حي الندى', 24.80584643174585, 46.682976514250896),
  ('Riyadh', 'Al Narjis District', 'حي النرجس', 24.894786248851197, 46.6452007643126),
  ('Riyadh', 'Al Nuzha District', 'حي النزهة', 24.7564278425737, 46.70789879895695),
  ('Riyadh', 'East Naseem District', 'حي النسيم الشرقي', 24.73900986853885, 46.8450047023119),
  ('Riyadh', 'West Naseem District', 'حي النسيم الغربي', 24.72564556889065, 46.82400217681045),
  ('Riyadh', 'Al Nadheem District', 'حي النظيم', 24.86310480597955, 46.96753361005775),
  ('Riyadh', 'Al Nafel District', 'حي النفل', 24.7818840536845, 46.6732989602418),
  ('Riyadh', 'Al Namudhajiyah District', 'حي النموذجية', 24.65718851643065, 46.6936292967964),
  ('Riyadh', 'Al Nahdah District', 'حي النهضة', 24.7605385856764, 46.81577592502755),
  ('Riyadh', 'Al Noor District', 'حي النور', 24.63176220409015, 46.8160282096332),
  ('Riyadh', 'Al Hada District', 'حي الهدا', 24.6639051022536, 46.63556456054125),
  ('Riyadh', 'Al Wahah District', 'حي الواحة', 24.74045397948195, 46.71445205085695),
  ('Riyadh', 'Al Wadi District', 'حي الوادي', 24.789443862918, 46.69123410298775),
  ('Riyadh', 'Al Wurud District', 'حي الورود', 24.7243763267533, 46.67849014994795),
  ('Riyadh', 'Al Wizarat District', 'حي الوزارات', 24.679154094005447, 46.71322436679225),
  ('Riyadh', 'Al Wasam District', 'حي الوسام', 24.90574989668785, 46.89768082383635),
  ('Riyadh', 'Al Wusayta District', 'حي الوسيطاء', 24.6241913585327, 46.71582379077675),
  ('Riyadh', 'Al Wisham District', 'حي الوشام', 24.643603658432653, 46.69827820092435),
  ('Riyadh', 'Al Yasmeen District', 'حي الياسمين', 24.822886212851202, 46.641977672735),
  ('Riyadh', 'Al Yarmuk District', 'حي اليرموك', 24.807833295629848, 46.78347919354075),
  ('Riyadh', 'Al Yamamah District', 'حي اليمامة', 24.596162267906053, 46.7159179316469),
  ('Riyadh', 'East Umm Al Hamam District', 'حي ام الحمام الشرقي', 24.68815764566855, 46.65927163675245),
  ('Riyadh', 'West Umm Al Hamam District', 'حي ام الحمام الغربي', 24.6894678024595, 46.6434174602977),
  ('Riyadh', 'Umm Al Shaal District', 'حي ام الشعال', 24.363941302243198, 46.96005653013875),
  ('Riyadh', 'Umm Saleem District', 'حي ام سليم', 24.63375238748865, 46.698522117073054),
  ('Riyadh', 'Badr District', 'حي بدر', 24.5328510657778, 46.730875941604296),
  ('Riyadh', 'Banban District', 'حي بنبان', 24.9849314574818, 46.53410080999895),
  ('Riyadh', 'Thulaim District', 'حي ثليم', 24.641313619285647, 46.727195779724454),
  ('Riyadh', 'Jabrah District', 'حي جبرة', 24.625413467261303, 46.71934000456605),
  ('Riyadh', 'Jareer District', 'حي جرير', 24.67721581220485, 46.750637200941696),
  ('Riyadh', 'Hitteen District', 'حي حطين', 24.761286829628197, 46.6009192885987),
  ('Riyadh', 'Dirab District', 'حي ديراب', 24.510952772912702, 46.6192189206728),
  ('Riyadh', 'Skirinah District', 'حي سكيرينة', 24.61639665489085, 46.717746054410554),
  ('Riyadh', 'Sultanah District', 'حي سلطانة', 24.6063624467976, 46.68694779254395),
  ('Riyadh', 'Shubra District', 'حي شبرا', 24.578806004331753, 46.66804495997725),
  ('Riyadh', 'Salahuddin District', 'حي صلاح الدين', 24.732783756661547, 46.69701858268035),
  ('Riyadh', 'Siyah District', 'حي صياح', 24.60803368497985, 46.701307946302094),
  ('Riyadh', 'Dahiyat Namar District', 'حي ضاحية نمار', 24.496110919061, 46.51997666497345),
  ('Riyadh', 'Tuwaiq District', 'حي طويق', 24.56802052400235, 46.5166574810964),
  ('Riyadh', 'Taybah District', 'حي طيبة', 24.54173501121845, 46.830573858647554),
  ('Riyadh', 'Dhahrat Al Badeah District', 'حي ظهرة البديعة', 24.597113275296998, 46.6509450365725),
  ('Riyadh', 'Dhahrat Laban District', 'حي ظهرة لبن', 24.63054499301645, 46.53039155957165),
  ('Riyadh', 'Utayqah District', 'حي عتيقة', 24.6016188537285, 46.7074488694468),
  ('Riyadh', 'Oraid District', 'حي عريض', 24.43949017171805, 46.72093339959615),
  ('Riyadh', 'Okaz District', 'حي عكاظ', 24.5131843444658, 46.66491746795065),
  ('Riyadh', 'Olaishah District', 'حي عليشة', 24.633351531077302, 46.684085459225955),
  ('Riyadh', 'Ghobairah District', 'حي غبيرة', 24.62055130575365, 46.736377447628),
  ('Riyadh', 'Ghirnatah District', 'حي غرناطة', 24.795701274398198, 46.75329395458135),
  ('Riyadh', 'Qurtubah District', 'حي قرطبة', 24.816331478928348, 46.73579666134545),
  ('Riyadh', 'Laban District', 'حي لبن', 24.63045435940615, 46.6072444199496),
  ('Riyadh', 'Meakal District', 'حي معكال', 24.62301799174875, 46.7147441302182),
  ('Riyadh', 'Manfuhah District', 'حي منفوحة', 24.59944758669975, 46.7284181784905),
  ('Riyadh', 'Manfuha Al Jadidah District', 'حي منفوحة الجديدة', 24.613367917423147, 46.719169473342845),
  ('Riyadh', 'Namar District', 'حي نمار', 24.56895068573745, 46.6787083281751),
  ('Riyadh', 'Hyt District', 'حي هيت', 24.4784251066111, 46.97992152210405),
  ('Riyadh', 'Wady Laban District', 'حي وادي لبن', 24.580723154116548, 46.500436373975404),
  ('Riyadh', 'Khashm Al An', 'خشم العان', 24.6787502227744, 46.90763715332745),
  ('Riyadh', 'Irqah', 'عرقة', 24.6901071080978, 46.587275197180745),
  ('Riyadh', 'King Abdullah City for Energy', 'مدينة الملك عبدالله للطاقة', 24.5630459259674, 46.379854034136045),
  ('Riyadh', 'King Khalid International Airport', 'مطار الملك خالد', 24.91590130469345, 46.70002448991685),
  ('Riyadh', 'Salam Park', 'منتزه سلام', 24.62158032999575, 46.708497025764345)
on conflict (city, name_en) do nothing;

-- 4. Nearest-district lookup (used to auto-suggest a district when a visit is GPS-tagged)
create or replace function nearest_district(lat numeric, lng numeric, p_city text default 'Riyadh')
returns integer as $$
  select id
  from districts
  where city = p_city
  order by sqrt(power(latitude - lat, 2) + power(longitude - lng, 2))
  limit 1;
$$ language sql stable;

-- Usage from the app after capturing GPS on a visit:
-- select nearest_district(24.7136, 46.6753);  -- returns the closest district's id