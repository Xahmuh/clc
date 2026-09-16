-- Phase 5: Lead SLA & Auto-Escalation, Push Notifications, Settings
-- Migration: 20260915000002_phase5_sla_and_push_tokens.sql

-- 1. Add expo_push_token to profiles for mobile push notifications
alter table public.profiles
  add column if not exists expo_push_token text;

-- 2. Create settings table for admin-configurable thresholds (e.g., lead_sla_inactivity_days)
create table if not exists public.settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

-- Enable RLS on settings
alter table public.settings enable row level security;

-- Policy: All authenticated users can read settings
drop policy if exists "settings_select_authenticated" on public.settings;
create policy "settings_select_authenticated" on public.settings
  for select using (auth.role() = 'authenticated');

-- Policy: Only admins can insert or update settings
drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed default SLA setting (N = 7 days per user requirement, controllable from /settings)
insert into public.settings (key, value, description)
values (
  'lead_sla_inactivity_days',
  '7',
  'Threshold in days without activity before an active lead is flagged as SLA breached and escalated'
)
on conflict (key) do nothing;

-- 3. SQL helper function to query SLA breached leads
create or replace function public.get_sla_breached_leads(p_threshold_days int default 7)
returns table (
  lead_id uuid,
  company_name text,
  contact_person text,
  status lead_status,
  estimated_value numeric,
  assigned_to uuid,
  employee_name text,
  employee_email text,
  expo_push_token text,
  days_inactive int,
  last_activity_date timestamptz
) language sql security definer as $$
  with latest_activity as (
    select 
      related_entity_id,
      max(activity_date) as last_activity
    from public.activities
    where related_entity_type = 'lead'
    group by related_entity_id
  )
  select 
    l.id as lead_id,
    l.company_name,
    l.contact_person,
    l.status,
    l.estimated_value,
    l.assigned_to,
    p.full_name as employee_name,
    p.email as employee_email,
    p.expo_push_token,
    extract(day from (now() - coalesce(la.last_activity, l.created_at)))::int as days_inactive,
    coalesce(la.last_activity, l.created_at) as last_activity_date
  from public.leads l
  left join latest_activity la on la.related_entity_id = l.id
  left join public.profiles p on p.id = l.assigned_to
  where l.status in ('new', 'contacted', 'qualified', 'negotiation')
    and extract(day from (now() - coalesce(la.last_activity, l.created_at))) >= p_threshold_days
  order by days_inactive desc;
$$;

-- 4. Permissions
grant all on public.settings to authenticated;
grant execute on function public.get_sla_breached_leads(int) to authenticated;

