-- ==============================================================================
-- Migration: 24-Hour Deletion for Employees & Retroactive Recording Support
-- ==============================================================================

-- 1. Add recorded_at column to track physical insertion timestamp
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT clock_timestamp();

ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT clock_timestamp();

ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT clock_timestamp();

-- Backfill recorded_at for existing rows
UPDATE public.leads SET recorded_at = created_at WHERE recorded_at IS NULL;
UPDATE public.customers SET recorded_at = created_at WHERE recorded_at IS NULL;
UPDATE public.activities SET recorded_at = created_at WHERE recorded_at IS NULL;

-- 2. LEADS DELETE POLICY
-- Employees can delete their assigned leads within 24 hours of recording; Admins can delete anytime.
DROP POLICY IF EXISTS "leads_delete" ON public.leads;
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE USING (
    (
      assigned_to = auth.uid()
      AND coalesce(recorded_at, created_at) >= (now() - interval '24 hours')
    )
    OR is_admin()
  );

-- 3. CUSTOMERS DELETE POLICY
-- Employees can delete their assigned customers within 24 hours of recording; Admins can delete anytime.
DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE USING (
    (
      assigned_to = auth.uid()
      AND coalesce(recorded_at, created_at) >= (now() - interval '24 hours')
    )
    OR is_admin()
  );

-- 4. ACTIVITIES DELETE POLICY
-- Employees can delete their logged activities within 24 hours of recording; Admins can delete anytime.
DROP POLICY IF EXISTS "activities_delete" ON public.activities;
CREATE POLICY "activities_delete" ON public.activities
  FOR DELETE USING (
    (
      employee_id = auth.uid()
      AND coalesce(recorded_at, created_at) >= (now() - interval '24 hours')
    )
    OR is_admin()
  );
