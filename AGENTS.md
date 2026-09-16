# CLC CRM — Agent Instructions

## What this is

A CRM for CLC, a contracting company in Riyadh, Saudi Arabia. Tracks leads and customers, logs field activities (visits/emails/calls) day to day, and generates reports for management. Two roles: Admin and Employee.

## Source of truth — read these before writing any code

- `/docs/CLC-CRM-Technical-Specification.md` — architecture, database schema, roles/RLS, screens, reporting logic, build order
- `/docs/CLC-CRM-Design-System.md` — colors, typography, radius, and component patterns for both web and mobile
- `/supabase/seed/riyadh_districts_seed.sql` — Riyadh districts reference data (187 rows, run once — don't regenerate or hand-edit it)

These are the spec, not suggestions. If something you need isn't covered in them, stop and ask rather than inventing it.

## Stack

- Web portal: Next.js (App Router) + TypeScript + Tailwind
- Mobile: React Native + Expo
- Backend: Supabase — Postgres, Auth, Storage, Edge Functions, Realtime. One Supabase project shared by both apps.
- Repo layout: monorepo — `apps/web`, `apps/mobile`, `packages/shared` (types, Supabase client, constants)

## Non-negotiables

- Row Level Security is mandatory on every table from its first migration. Never ship a table without its policy "to test faster" — that's how it stays missing.
- Employees only ever see and write their own leads, customers, and activities. Admins see everything. Enforce this in RLS, not only in UI conditionals — the UI check is a convenience, the RLS policy is the actual guarantee.
- Match `CLC-CRM-Design-System.md` exactly for colors, type scale, and radius. Don't fall back to default Tailwind colors or default shadcn styling when the spec already defines the token.
- Don't add columns, tables, or screens that aren't in the spec without flagging it first — say what you think is missing and why, then wait.

## Workflow

- Work only within the phase given in the current task. Don't start the next phase early even if it looks efficient from where you're standing.
- End each phase with a short summary: what you built, any deviation from the spec and why, and what's left for the next phase to pick up.
- Write tests for anything security-related (RLS policies especially) before calling a phase done.
