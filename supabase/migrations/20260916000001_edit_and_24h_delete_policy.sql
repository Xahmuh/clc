-- Migration: 20260916000001_edit_and_24h_delete_policy.sql
-- Description: Implement 24-hour time-restricted deletion policy for leads & customers,
--              cascade cleanup of related activities, and safe foreign key handling.

-- 1. Ensure foreign key from customers to leads sets null on delete (prevent FK error if lead is deleted within 24h)
alter table public.customers drop constraint if exists customers_converted_from_lead_id_fkey;
alter table public.customers
  add constraint customers_converted_from_lead_id_fkey
  foreign key (converted_from_lead_id) references public.leads(id) on delete set null;

-- 2. Trigger function to clean up associated activities when a lead or customer is hard deleted
create or replace function public.handle_entity_delete_cleanup()
returns trigger as $$
begin
  if TG_TABLE_NAME = 'leads' then
    delete from public.activities
    where related_entity_type = 'lead' and related_entity_id = old.id;
  elsif TG_TABLE_NAME = 'customers' then
    delete from public.activities
    where related_entity_type = 'customer' and related_entity_id = old.id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

-- Attach cleanup trigger to leads
drop trigger if exists cleanup_lead_activities on public.leads;
create trigger cleanup_lead_activities
  before delete on public.leads
  for each row execute function public.handle_entity_delete_cleanup();

-- Attach cleanup trigger to customers
drop trigger if exists cleanup_customer_activities on public.customers;
create trigger cleanup_customer_activities
  before delete on public.customers
  for each row execute function public.handle_entity_delete_cleanup();

-- 3. Row Level Security: 24-hour limit on deletion for leads
drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads
  for delete using (
    (
      assigned_to = auth.uid()
      or is_admin()
    )
    and (created_at >= (now() - interval '24 hours'))
  );

-- 4. Row Level Security: 24-hour limit on deletion for customers
drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers
  for delete using (
    (
      assigned_to = auth.uid()
      or is_admin()
    )
    and (created_at >= (now() - interval '24 hours'))
  );
