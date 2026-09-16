import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.meujwpicsfxgkphvrojs',
  password: 'Xx0078466!$$CLC',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL...');

  // Step 1: Add enum value in its own standalone statement so it commits first
  console.log('Adding "supervisor" to user_role enum...');
  try {
    await client.query("ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'supervisor';");
    console.log('Enum value "supervisor" added/verified.');
  } catch (enumErr) {
    console.log('Enum notice:', enumErr.message);
  }

  // Step 2: Now that enum value is committed, create functions and policies
  console.log('Creating functions and updating RLS policies...');
  const sql = `
  -- 1. Helper function: is_supervisor
  create or replace function public.is_supervisor(user_id uuid default auth.uid())
  returns boolean as $$
    select exists (
      select 1 from public.profiles
      where id = coalesce(user_id, auth.uid()) and role = 'supervisor' and is_active = true
    );
  $$ language sql stable security definer set search_path = public;

  -- 2. Helper function: is_admin_or_supervisor
  create or replace function public.is_admin_or_supervisor(user_id uuid default auth.uid())
  returns boolean as $$
    select exists (
      select 1 from public.profiles
      where id = coalesce(user_id, auth.uid()) and role in ('admin', 'supervisor') and is_active = true
    );
  $$ language sql stable security definer set search_path = public;

  -- 3. Recreate LEADS RLS policies
  drop policy if exists "leads_select" on public.leads;
  create policy "leads_select" on public.leads
    for select using (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
    );

  drop policy if exists "leads_insert" on public.leads;
  create policy "leads_insert" on public.leads
    for insert with check (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
      or exists (select 1 from public.profiles p where p.id = leads.assigned_to and p.is_active = true)
    );

  drop policy if exists "leads_update" on public.leads;
  create policy "leads_update" on public.leads
    for update using (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
    )
    with check (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
      or exists (select 1 from public.profiles p where p.id = leads.assigned_to and p.is_active = true)
    );

  drop policy if exists "leads_delete" on public.leads;
  create policy "leads_delete" on public.leads
    for delete using (
      is_admin()
    );

  -- 4. Recreate CUSTOMERS RLS policies
  drop policy if exists "customers_select" on public.customers;
  create policy "customers_select" on public.customers
    for select using (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
    );

  drop policy if exists "customers_insert" on public.customers;
  create policy "customers_insert" on public.customers
    for insert with check (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
      or exists (select 1 from public.profiles p where p.id = customers.assigned_to and p.is_active = true)
    );

  drop policy if exists "customers_update" on public.customers;
  create policy "customers_update" on public.customers
    for update using (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
    )
    with check (
      assigned_to = auth.uid()
      or is_admin_or_supervisor()
      or exists (select 1 from public.profiles p where p.id = customers.assigned_to and p.is_active = true)
    );

  drop policy if exists "customers_delete" on public.customers;
  create policy "customers_delete" on public.customers
    for delete using (
      is_admin()
    );

  -- 5. Recreate ACTIVITIES RLS policies
  drop policy if exists "activities_select" on public.activities;
  create policy "activities_select" on public.activities
    for select using (
      employee_id = auth.uid()
      or is_admin_or_supervisor()
    );

  drop policy if exists "activities_insert" on public.activities;
  create policy "activities_insert" on public.activities
    for insert with check (
      employee_id = auth.uid()
      or is_admin_or_supervisor()
    );

  -- 6. Update PROFILES RLS policies
  drop policy if exists "profiles_update" on public.profiles;
  create policy "profiles_update" on public.profiles
    for update using (
      id = auth.uid() or is_admin()
    )
    with check (
      is_admin() or (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
    );
  `;

  await client.query(sql);
  console.log('Functions & Policies updated successfully!\n');

  // Verify enum
  const enumCheck = await client.query(`
    select enumlabel from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'user_role';
  `);
  console.log('user_role enum labels:', enumCheck.rows.map(r => r.enumlabel));

  // Verify functions
  const fnCheck = await client.query(`
    select routine_name from information_schema.routines
    where routine_schema = 'public' and routine_name in ('is_supervisor', 'is_admin_or_supervisor');
  `);
  console.log('Created functions:', fnCheck.rows.map(r => r.routine_name));

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
