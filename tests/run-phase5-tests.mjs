// tests/run-phase5-tests.mjs
// Automated verification for Phase 5: Lead SLA, Auto-Escalation, and Push Notification Tokens

import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function run() {
  console.log('='.repeat(70));
  console.log(' CLC CRM — Phase 5 Automated Lead SLA & Push Token Test Suite');
  console.log('='.repeat(70));

  const db = new PGlite();

  // Setup Supabase Auth mocks in Postgres
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

  // 1. Apply Phase 1 schema & RLS
  const phase1Sql = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20260915000001_phase1_schema_and_rls.sql'),
    'utf-8'
  );
  await db.exec(phase1Sql);

  // 2. Apply Phase 5 migration
  const phase5Sql = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20260915000002_phase5_sla_and_push_tokens.sql'),
    'utf-8'
  );
  await db.exec(phase5Sql);

  // Grant table permissions to authenticated role for RLS evaluation (matches Phase 1 test pattern)
  await db.exec(`
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
  `);
  console.log('✓ Phase 1 and Phase 5 migrations applied.');

  // Create users: Admin and 2 Employees via auth.users (trigger creates profiles)
  const adminId = '99999999-9999-9999-9999-999999999999';
  const emp1Id = '11111111-1111-1111-1111-111111111111';
  const emp2Id = '22222222-2222-2222-2222-222222222222';

  await db.query(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('${adminId}', 'admin@clc.sa', '{"full_name": "Admin Khaled", "role": "admin"}'::jsonb),
    ('${emp1Id}', 'tariq@clc.sa', '{"full_name": "Tariq Al-Harbi"}'::jsonb),
    ('${emp2Id}', 'sara@clc.sa', '{"full_name": "Sara Al-Otaibi"}'::jsonb)
  `);

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

  console.log('\n--- TEST SUITE A: Settings Table RLS & Threshold Storage ---');

  // Verify default setting seeded
  const defaultSetting = await db.query(`SELECT value FROM settings WHERE key = 'lead_sla_inactivity_days'`);
  if (defaultSetting.rows[0]?.value === '7') {
    console.log('  ✓ PASS: Default SLA threshold seeded at 7 days');
  } else {
    throw new Error(`Expected 7 days, got: ${defaultSetting.rows[0]?.value}`);
  }

  // Test Employee reading settings under RLS
  await asUser(emp1Id);
  const empReadSettings = await db.query(`SELECT value FROM settings WHERE key = 'lead_sla_inactivity_days'`);
  if (empReadSettings.rows.length === 1 && empReadSettings.rows[0].value === '7') {
    console.log('  ✓ PASS: Employee can read lead_sla_inactivity_days setting');
  } else {
    throw new Error('Employee failed to read settings');
  }

  // Test Employee cannot update settings under RLS
  let empUpdateFailed = false;
  try {
    await db.query(`UPDATE settings SET value = '14' WHERE key = 'lead_sla_inactivity_days'`);
    await asSuperuser();
    const checkVal = await db.query(`SELECT value FROM settings WHERE key = 'lead_sla_inactivity_days'`);
    if (checkVal.rows[0].value === '7') {
      empUpdateFailed = true;
    }
  } catch (err) {
    empUpdateFailed = true;
  }
  if (empUpdateFailed) {
    console.log('  ✓ PASS: Employee CANNOT modify SLA settings (protected by RLS)');
  } else {
    throw new Error('Employee was able to modify settings under RLS');
  }

  // Test Admin can update settings under RLS
  await asUser(adminId);
  await db.query(`UPDATE settings SET value = '10' WHERE key = 'lead_sla_inactivity_days'`);
  await asSuperuser();
  const adminCheckVal = await db.query(`SELECT value FROM settings WHERE key = 'lead_sla_inactivity_days'`);
  if (adminCheckVal.rows[0]?.value === '10') {
    console.log('  ✓ PASS: Admin can update SLA threshold (updated to 10 days)');
  } else {
    throw new Error('Admin failed to update settings');
  }

  console.log('\n--- TEST SUITE B: Lead SLA Inactivity Detection RPC ---');
  // Reset role to postgres for setup
  await db.exec(`RESET ROLE;`);

  // Insert leads:
  // Lead 1: Tariq's lead, created 15 days ago, NO activities -> Inactive 15 days
  // Lead 2: Sara's lead, created 20 days ago, last activity 3 days ago -> Inactive 3 days
  // Lead 3: Tariq's lead, created 30 days ago, last activity 12 days ago -> Inactive 12 days
  // Lead 4: Closed deal ('won'), created 40 days ago, no activity -> Excluded (inactive status)
  const lead1Id = '10000000-0000-0000-0000-000000000001';
  const lead2Id = '10000000-0000-0000-0000-000000000002';
  const lead3Id = '10000000-0000-0000-0000-000000000003';
  const lead4Id = '10000000-0000-0000-0000-000000000004';

  await db.query(`
    INSERT INTO leads (id, company_name, contact_person, status, assigned_to, created_at) VALUES
    ('${lead1Id}', 'Stale Deal Alpha', 'Ahmed', 'new', '${emp1Id}', NOW() - INTERVAL '15 days'),
    ('${lead2Id}', 'Active Deal Beta', 'Fahad', 'contacted', '${emp2Id}', NOW() - INTERVAL '20 days'),
    ('${lead3Id}', 'Stale Deal Gamma', 'Nasser', 'negotiation', '${emp1Id}', NOW() - INTERVAL '30 days'),
    ('${lead4Id}', 'Closed Deal Delta', 'Salem', 'won', '${emp1Id}', NOW() - INTERVAL '40 days')
  `);

  // Insert activities
  await db.query(`
    INSERT INTO activities (employee_id, activity_type, related_entity_type, related_entity_id, activity_date) VALUES
    ('${emp2Id}', 'call', 'lead', '${lead2Id}', NOW() - INTERVAL '3 days'),
    ('${emp1Id}', 'visit', 'lead', '${lead3Id}', NOW() - INTERVAL '12 days')
  `);

  // Run get_sla_breached_leads with threshold = 7 days
  const breached7 = await db.query(`SELECT * FROM get_sla_breached_leads(7) ORDER BY company_name`);
  if (breached7.rows.length === 2) {
    console.log('  ✓ PASS: get_sla_breached_leads(7) identified exactly 2 breached active leads');
    console.log(`    - Flagged 1: ${breached7.rows[0].company_name} (~${Math.round(breached7.rows[0].days_inactive)} days inactive)`);
    console.log(`    - Flagged 2: ${breached7.rows[1].company_name} (~${Math.round(breached7.rows[1].days_inactive)} days inactive)`);
  } else {
    throw new Error(`Expected 2 breached leads, got: ${breached7.rows.length}`);
  }

  // Run get_sla_breached_leads with threshold = 14 days
  const breached14 = await db.query(`SELECT * FROM get_sla_breached_leads(14)`);
  if (breached14.rows.length === 1 && breached14.rows[0].company_name === 'Stale Deal Alpha') {
    console.log('  ✓ PASS: get_sla_breached_leads(14) correctly narrowed down to only Lead 1 (15 days inactive)');
  } else {
    throw new Error(`Expected 1 breached lead for threshold 14, got: ${breached14.rows.length}`);
  }

  console.log('\n--- TEST SUITE C: Expo Push Token Profile Registration ---');

  // Test Tariq updating his push token under authenticated role
  await asUser(emp1Id);
  await db.query(`
    UPDATE profiles
    SET expo_push_token = 'ExponentPushToken[tariq_iphone_15_pro]'
    WHERE id = '${emp1Id}'
  `);

  await asSuperuser();
  const tariqProfile = await db.query(`SELECT expo_push_token FROM profiles WHERE id = '${emp1Id}'`);
  if (tariqProfile.rows[0]?.expo_push_token === 'ExponentPushToken[tariq_iphone_15_pro]') {
    console.log('  ✓ PASS: Employee successfully registered Expo push token on profile');
  } else {
    throw new Error('Failed to update push token');
  }

  // Test Sara CANNOT update Tariq's push token
  await asUser(emp2Id);
  await db.query(`
    UPDATE profiles
    SET expo_push_token = 'ExponentPushToken[spoofed_token]'
    WHERE id = '${emp1Id}'
  `);

  // Verify Tariq's token was not modified
  await asSuperuser();
  const checkTariqToken = await db.query(`SELECT expo_push_token FROM profiles WHERE id = '${emp1Id}'`);
  if (checkTariqToken.rows[0]?.expo_push_token === 'ExponentPushToken[tariq_iphone_15_pro]') {
    console.log('  ✓ PASS: Unauthorized employee CANNOT tamper with another employee push token (RLS protected)');
  } else {
    throw new Error('Spoofed push token write succeeded');
  }

  console.log('\n' + '='.repeat(70));
  console.log(' ALL PHASE 5 AUTOMATED TESTS PASSED SUCCESSFULLY! (0 failures)');
  console.log('='.repeat(70));
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
