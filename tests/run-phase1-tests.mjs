import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI Color codes for clean test reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ${GREEN}✓ PASS:${RESET} ${message}`);
    passedTests++;
  } else {
    console.error(`  ${RED}✗ FAIL:${RESET} ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} CLC CRM — Phase 1 Automated PostgreSQL RLS & Schema Test Suite${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  const db = new PGlite();

  // 1. Setup Supabase Auth mocks in Postgres
  console.log(`${BLUE}1. Initializing Supabase Auth environment & Postgres roles...${RESET}`);
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;

    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
      SELECT coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        'anon'
      );
    $$ LANGUAGE sql STABLE;

    DO $$ BEGIN
      CREATE ROLE authenticated;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE ROLE anon;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    GRANT USAGE ON SCHEMA public TO authenticated, anon;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
  `);

  // 2. Load Phase 1 Migration
  console.log(`${BLUE}2. Applying migration: 20260915000001_phase1_schema_and_rls.sql...${RESET}`);
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260915000001_phase1_schema_and_rls.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await db.exec(migrationSql);

  // Grant table permissions to authenticated role for RLS evaluation
  await db.exec(`
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
  `);
  console.log(`  ${GREEN}✓${RESET} Migration applied successfully.`);

  // 3. Load Riyadh Districts Seed
  console.log(`${BLUE}3. Loading Riyadh Districts seed (187 locations)...${RESET}`);
  const seedPath = path.join(rootDir, 'supabase', 'seed', 'riyadh_districts_seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  await db.exec(seedSql);

  const districtCountRes = await db.query('SELECT count(*)::int as count FROM public.districts');
  assert(districtCountRes.rows[0].count === 187, `Districts reference table seeded with exactly 187 locations (actual: ${districtCountRes.rows[0].count})`);

  // Helper context switchers
  const asUser = async (userId, role = 'authenticated') => {
    await db.exec(`
      SET ROLE ${role};
      SET request.jwt.claim.sub = '${userId}';
      SET request.jwt.claim.role = '${role}';
    `);
  };

  const asSuperuser = async () => {
    await db.exec(`
      RESET ROLE;
      RESET request.jwt.claim.sub;
      RESET request.jwt.claim.role;
    `);
  };

  // ---------------------------------------------------------------------------
  // TEST SUITE A: Auth Signup Trigger & Default Roles
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}--- TEST SUITE A: Auth Signup Trigger & Default Role ---${RESET}`);

  // Create Employee 1: Tariq
  const emp1Id = '11111111-1111-1111-1111-111111111111';
  await db.query(`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES ($1, 'tariq@clc.com.sa', '{"full_name": "Tariq Mansoor", "phone": "0501112233"}'::jsonb)
  `, [emp1Id]);

  // Create Employee 2: Sara
  const emp2Id = '22222222-2222-2222-2222-222222222222';
  await db.query(`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES ($1, 'sara@clc.com.sa', '{"full_name": "Sara Al-Otaibi", "phone": "0504445566"}'::jsonb)
  `, [emp2Id]);

  // Create Admin: Khaled
  const adminId = '99999999-9999-9999-9999-999999999999';
  await db.query(`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES ($1, 'khaled@clc.com.sa', '{"full_name": "Khaled Al-Ghamdi", "phone": "0509998877", "role": "admin"}'::jsonb)
  `, [adminId]);

  const p1 = (await db.query(`SELECT * FROM public.profiles WHERE id = $1`, [emp1Id])).rows[0];
  const p2 = (await db.query(`SELECT * FROM public.profiles WHERE id = $1`, [emp2Id])).rows[0];
  const pAdmin = (await db.query(`SELECT * FROM public.profiles WHERE id = $1`, [adminId])).rows[0];

  assert(p1 && p1.full_name === 'Tariq Mansoor' && p1.role === 'employee', 'Signup trigger creates profile for Tariq with default role "employee"');
  assert(p2 && p2.full_name === 'Sara Al-Otaibi' && p2.role === 'employee', 'Signup trigger creates profile for Sara with default role "employee"');
  assert(pAdmin && pAdmin.full_name === 'Khaled Al-Ghamdi' && pAdmin.role === 'admin', 'Signup trigger respects admin role metadata for Khaled');

  // ---------------------------------------------------------------------------
  // TEST SUITE B: Districts Reference & Nearest District Function
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}--- TEST SUITE B: Districts Reference Access & Spatial Helper ---${RESET}`);

  // Test as authenticated employee Tariq
  await asUser(emp1Id);
  const authDistricts = await db.query(`SELECT count(*)::int as count FROM public.districts`);
  assert(authDistricts.rows[0].count === 187, 'Authenticated employee Tariq can select all 187 districts');

  // Test nearest_district SQL function
  // Olaya / King Fahd coordinates approx (24.7136, 46.6753)
  const nearestRes = await db.query(`SELECT public.nearest_district(24.7136, 46.6753) as id`);
  const nearestId = nearestRes.rows[0].id;
  const districtNameRes = await db.query(`SELECT name_en, name_ar FROM public.districts WHERE id = $1`, [nearestId]);
  assert(nearestId > 0 && districtNameRes.rows[0].name_en.length > 0, `nearest_district() returned district ID ${nearestId} (${districtNameRes.rows[0].name_en} / ${districtNameRes.rows[0].name_ar})`);

  // Test as unauthenticated user (anon)
  await asUser('00000000-0000-0000-0000-000000000000', 'anon');
  let anonBlocked = false;
  try {
    const anonDistricts = await db.query(`SELECT count(*)::int as count FROM public.districts`);
    anonBlocked = (anonDistricts.rows[0].count === 0);
  } catch (err) {
    anonBlocked = true; // Blocked by table ACL or RLS
  }
  assert(anonBlocked, 'Unauthenticated user (anon) cannot select from districts (access blocked by RLS / permissions)');


  await asSuperuser();

  // ---------------------------------------------------------------------------
  // TEST SUITE C: Employee Lead Isolation
  // SPEC REQUIREMENT: "an employee cannot select another employee's leads"
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}--- TEST SUITE C: Employee Lead Isolation ---${RESET}`);

  // Tariq creates Lead A
  await asUser(emp1Id);
  const leadAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await db.query(`
    INSERT INTO public.leads (id, company_name, contact_person, status, estimated_value, assigned_to)
    VALUES ($1, 'Al-Falak Contracting', 'Ahmad Saleh', 'new', 500000, $2)
  `, [leadAId, emp1Id]);

  const tariqLeads = await db.query(`SELECT id, company_name FROM public.leads`);
  assert(tariqLeads.rows.length === 1 && tariqLeads.rows[0].id === leadAId, 'Tariq can see his own lead "Al-Falak Contracting"');

  // Sara views leads
  await asUser(emp2Id);
  const saraLeadsInitial = await db.query(`SELECT id, company_name FROM public.leads`);
  assert(saraLeadsInitial.rows.length === 0, 'Sara CANNOT select Tariq\'s lead (returns 0 rows under RLS)');

  // Sara tries to update Tariq's lead
  const unauthorizedUpdate = await db.query(`
    UPDATE public.leads SET notes = 'Hacked by Sara' WHERE id = $1 RETURNING id
  `, [leadAId]);
  assert(unauthorizedUpdate.rows.length === 0, 'Sara CANNOT update Tariq\'s lead (0 rows affected under RLS)');

  // Sara tries to create a lead assigned to Tariq
  let spoofLeadFailed = false;
  try {
    await db.query(`
      INSERT INTO public.leads (company_name, assigned_to)
      VALUES ('Spoofed Company', $1)
    `, [emp1Id]);
  } catch (err) {
    spoofLeadFailed = true;
  }
  assert(spoofLeadFailed, 'Sara CANNOT insert a lead assigned to Tariq (RLS WITH CHECK blocks assignment to others)');

  // Sara creates her own Lead B
  const leadBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  await db.query(`
    INSERT INTO public.leads (id, company_name, contact_person, status, estimated_value, assigned_to)
    VALUES ($1, 'Riyadh Infrastructure Co', 'Noura Fahad', 'qualified', 1200000, $2)
  `, [leadBId, emp2Id]);

  const saraLeadsAfter = await db.query(`SELECT id, company_name FROM public.leads`);
  assert(saraLeadsAfter.rows.length === 1 && saraLeadsAfter.rows[0].id === leadBId, 'Sara sees ONLY her own lead "Riyadh Infrastructure Co"');

  // Tariq views leads again
  await asUser(emp1Id);
  const tariqLeadsAfter = await db.query(`SELECT id, company_name FROM public.leads`);
  assert(tariqLeadsAfter.rows.length === 1 && tariqLeadsAfter.rows[0].id === leadAId, 'Tariq still sees ONLY his own lead and cannot see Sara\'s lead');

  // ---------------------------------------------------------------------------
  // TEST SUITE D: Activity Spoofing Prevention
  // SPEC REQUIREMENT: "an employee cannot insert an activity under someone else's employee_id"
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}--- TEST SUITE D: Activity Spoofing Prevention ---${RESET}`);

  // Sara attempts to log an activity under Tariq's employee_id
  await asUser(emp2Id);
  let activitySpoofFailed = false;
  let spoofErrorMessage = '';
  try {
    await db.query(`
      INSERT INTO public.activities (employee_id, related_entity_type, related_entity_id, activity_type, description)
      VALUES ($1, 'lead', $2, 'visit', 'Fake visit logged under Tariq')
    `, [emp1Id, leadAId]);
  } catch (err) {
    activitySpoofFailed = true;
    spoofErrorMessage = err.message;
  }
  assert(activitySpoofFailed, `Sara CANNOT insert activity under Tariq's employee_id (Blocked by RLS WITH CHECK: "${spoofErrorMessage}")`);

  // Sara logs an activity under her own employee_id for her own lead
  const actBId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  await db.query(`
    INSERT INTO public.activities (id, employee_id, related_entity_type, related_entity_id, activity_type, description)
    VALUES ($1, $2, 'lead', $3, 'call', 'Initial discovery call with Noura')
  `, [actBId, emp2Id, leadBId]);

  const saraActivities = await db.query(`SELECT id, description FROM public.activities`);
  assert(saraActivities.rows.length === 1 && saraActivities.rows[0].id === actBId, 'Sara can select her own activity');

  // Tariq queries activities
  await asUser(emp1Id);
  const tariqActivities = await db.query(`SELECT id, description FROM public.activities`);
  assert(tariqActivities.rows.length === 0, 'Tariq CANNOT see Sara\'s activities (returns 0 rows)');

  // Tariq logs an activity for his lead
  const actAId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  await db.query(`
    INSERT INTO public.activities (id, employee_id, related_entity_type, related_entity_id, activity_type, description, latitude, longitude)
    VALUES ($1, $2, 'lead', $3, 'visit', 'Site survey visit in Riyadh', 24.7136, 46.6753)
  `, [actAId, emp1Id, leadAId]);

  const tariqActivitiesAfter = await db.query(`SELECT id, description FROM public.activities`);
  assert(tariqActivitiesAfter.rows.length === 1 && tariqActivitiesAfter.rows[0].id === actAId, 'Tariq sees only his own activity');

  // ---------------------------------------------------------------------------
  // TEST SUITE E: Admin Visibility & Privileges
  // SPEC REQUIREMENT: "an admin can read everything"
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}--- TEST SUITE E: Admin Omniscience & Oversight ---${RESET}`);

  // Switch context to Admin Khaled
  await asUser(adminId);

  // Admin selects leads
  const adminLeads = await db.query(`SELECT id, company_name, assigned_to FROM public.leads ORDER BY company_name`);
  assert(adminLeads.rows.length === 2, `Admin can read ALL leads across the company (expected: 2, actual: ${adminLeads.rows.length})`);
  assert(adminLeads.rows.some(r => r.assigned_to === emp1Id) && adminLeads.rows.some(r => r.assigned_to === emp2Id), 'Admin leads query contains records assigned to both Tariq and Sara');

  // Admin selects activities
  const adminActivities = await db.query(`SELECT id, employee_id, description FROM public.activities`);
  assert(adminActivities.rows.length === 2, `Admin can read ALL activities across all employees (expected: 2, actual: ${adminActivities.rows.length})`);

  // Admin can reassign leads (e.g. reassign Tariq's lead to Sara)
  await db.query(`
    UPDATE public.leads SET assigned_to = $1 WHERE id = $2
  `, [emp2Id, leadAId]);
  const reassignedLead = (await db.query(`SELECT assigned_to FROM public.leads WHERE id = $1`, [leadAId])).rows[0];
  assert(reassignedLead.assigned_to === emp2Id, 'Admin can successfully reassign leads between employees');

  // Verify Sara now sees the reassigned lead
  await asUser(emp2Id);
  const saraLeadsAfterReassign = await db.query(`SELECT id, company_name FROM public.leads`);
  assert(saraLeadsAfterReassign.rows.length === 2, `Sara now sees the newly assigned lead in addition to her own (total: ${saraLeadsAfterReassign.rows.length})`);

  // Verify Tariq no longer sees the reassigned lead
  await asUser(emp1Id);
  const tariqLeadsAfterReassign = await db.query(`SELECT id, company_name FROM public.leads`);
  assert(tariqLeadsAfterReassign.rows.length === 0, 'Tariq no longer sees the reassigned lead');

  // ---------------------------------------------------------------------------
  // TEST SUITE F: Customer Lifecycle & Conversion Isolation
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}--- TEST SUITE F: Customers Table RLS ---${RESET}`);

  // Sara converts Lead B into Customer B
  await asUser(emp2Id);
  const custBId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  await db.query(`
    INSERT INTO public.customers (id, company_name, contact_person, converted_from_lead_id, assigned_to)
    VALUES ($1, 'Riyadh Infrastructure Co', 'Noura Fahad', $2, $3)
  `, [custBId, leadBId, emp2Id]);

  const saraCustomers = await db.query(`SELECT id, company_name FROM public.customers`);
  assert(saraCustomers.rows.length === 1 && saraCustomers.rows[0].id === custBId, 'Sara can view her own customer record');

  // Tariq checks customers
  await asUser(emp1Id);
  const tariqCustomers = await db.query(`SELECT id, company_name FROM public.customers`);
  assert(tariqCustomers.rows.length === 0, 'Tariq CANNOT see Sara\'s customer record (0 rows returned)');

  // Admin checks customers
  await asUser(adminId);
  const adminCustomers = await db.query(`SELECT id, company_name FROM public.customers`);
  assert(adminCustomers.rows.length === 1 && adminCustomers.rows[0].id === custBId, 'Admin can see all customer records across the company');

  await asSuperuser();

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${GREEN} ALL ${passedTests} PHASE 1 TESTS PASSED SUCCESSFULLY! (0 failures)${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  return { passedTests, failedTests: 0 };
}

runTests().catch(err => {
  console.error(`\n${RED}${BOLD}Test suite failed with error:${RESET}`, err);
  process.exit(1);
});
