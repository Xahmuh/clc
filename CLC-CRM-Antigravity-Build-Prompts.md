# Building the CLC CRM in Antigravity

## Setup (once)

1. In your repo, place the spec files where `AGENTS.md` expects them:
   - `/AGENTS.md` (the file itself, at repo root — Antigravity auto-reads this on open)
   - `/docs/CLC-CRM-Technical-Specification.md`
   - `/docs/CLC-CRM-Design-System.md`
   - `/supabase/seed/riyadh_districts_seed.sql`
2. Open the folder in Antigravity: **File → Open Folder** → select the repo root (not a parent folder).
3. In the Agent Manager, set the model to **Gemini 3.8 Flash**.
4. Dispatch the phase prompts below **one at a time**, in order. Review the diff/artifact after each before starting the next — don't queue all five at once.

Why phased instead of one giant prompt: Gemini 3.8 Flash benchmarks very strong on scoped, well-specified tasks (90% on Next.js Evals) but — like every current model — is more reliable in bounded chunks than across one continuous multi-thousand-line build. Phasing also gives you five real review checkpoints instead of one enormous diff at the end.

---

## Phase 1 — Schema, Auth, RLS

```
Implement Phase 1 of CLC-CRM-Technical-Specification.md (Section 4: Database Schema, Section 5: Roles & Permissions).

- Create the Supabase migration for every table in Section 4 exactly as specified: profiles, districts, leads, customers, activities — including the enums and indexes.
- Load /supabase/seed/riyadh_districts_seed.sql as the seed for the districts table.
- Implement every RLS policy from Section 5, including the districts read policy.
- Set up Supabase Auth (email/password) with a trigger that creates a profiles row on signup, defaulting role to 'employee'.
- Write a test that proves: an employee cannot select another employee's leads, an employee cannot insert an activity under someone else's employee_id, and an admin can read everything.

Stop after this phase. Summarize what you built and show the test results before I approve moving to Phase 2.
```

---

## Phase 2 — Web Portal Core

```
Implement Phase 2: the Next.js web portal, styled exactly per CLC-CRM-Design-System.md.

Screens (Section 6 of the technical spec):
- Login
- Leads: list view + Kanban view (columns = lead_status) + detail page with activity history
- Customers: list + detail page
- Team Management (Admin only): add/remove employees, reassign leads

Use the LeadCard component and color/type tokens from the design system file as given — don't introduce a different card style or palette. The Kanban view should visually match the reference: flat white cards, no shadows, one card can take the inverted dark treatment per the "Applying This to Screens" section.

Stop after this phase for review.
```

---

## Phase 3 — Mobile App Core

```
Implement Phase 3: the React Native/Expo app (Section 7 of the technical spec, mobile theme.ts from the design system).

Screens:
- Login
- Home: today's follow-ups + a prominent quick-log entry point
- My Leads / My Customers list
- Quick Log: pick Visit/Email/Call/Meeting, pick the lead/customer, add a note. On Visit, capture GPS and call nearest_district() with the coordinates to suggest a district.
- Lead/Customer detail with activity history

Per the design system's guidance, keep mobile screens white/ink only — the cream panel is a management-dashboard surface, not a field-employee one.

Stop after this phase for review.
```

---

## Phase 4 — Reporting & Dashboards

```
Implement Phase 4 (Section 8 of the technical spec).

- Daily/weekly/monthly report queries exactly as given — derived from `activities`, not a separate reports table.
- Admin Dashboard using the cream panel component: KPI row (open leads, conversion rate, activities logged today, top performers).
- Employee's own pipeline-snapshot version of the same dashboard.
- A Supabase Edge Function that compiles a report into an exportable PDF or Excel file on demand.

Stop after this phase for review.
```

---

## Phase 5 — Notifications & Polish

```
Implement Phase 5.

- Flag any lead with no activity in N days (ask me for N before hardcoding a number) and surface it on the Admin dashboard per the "Lead SLA & auto-escalation" enhancement in the spec.
- Expo push notifications for employees when one of their leads crosses that threshold.
- Full polish pass: check every screen against CLC-CRM-Design-System.md for consistent radius, spacing, and type scale — fix any drift introduced in earlier phases.

Summarize any spec deviations across the whole build at the end of this phase.
```
