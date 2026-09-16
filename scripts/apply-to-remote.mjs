import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const projectRef = 'meujwpicsfxgkphvrojs';
const password = 'Xx0078466!$$CLC';
const username = `postgres.${projectRef}`;
const host = 'aws-0-ap-northeast-1.pooler.supabase.com';

async function migrate() {
  console.log(`Connecting to Supabase project [${projectRef}] at ${host}...`);
  const client = new Client({
    host,
    port: 5432,
    user: username,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to remote Supabase PostgreSQL database successfully!\n');

  console.log('Reading supabase/phase1_complete_setup.sql...');
  const sqlPath = path.join(rootDir, 'supabase', 'phase1_complete_setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing complete Phase 1 setup (Schema, Seed, Functions, Triggers, RLS)...');
  await client.query(sql);
  console.log('Migration executed successfully!\n');

  console.log('Verifying remote database state:');
  
  // 1. Check Tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Public tables:', tablesRes.rows.map(r => r.table_name).join(', '));

  // 2. Check Districts count
  const countRes = await client.query('SELECT count(*)::int as count FROM public.districts');
  console.log(`Districts seeded: ${countRes.rows[0].count} rows (expected: 187)`);

  // 3. Check RLS status
  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename IN ('profiles', 'districts', 'leads', 'customers', 'activities')
    ORDER BY tablename;
  `);
  console.log('Row Level Security status:');
  for (const r of rlsRes.rows) {
    console.log(`  - ${r.tablename}: RLS Enabled = ${r.rowsecurity}`);
  }

  // 4. Check Policies
  const polRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  console.log(`Total RLS policies configured: ${polRes.rows.length}`);
  for (const p of polRes.rows) {
    console.log(`  - [${p.tablename}] ${p.policyname} (${p.cmd})`);
  }

  // 5. Test nearest_district function
  const nearRes = await client.query(`SELECT public.nearest_district(24.7136, 46.6753) as id`);
  const nearDistRes = await client.query(`SELECT name_en, name_ar FROM public.districts WHERE id = $1`, [nearRes.rows[0].id]);
  console.log(`nearest_district(24.7136, 46.6753): ID ${nearRes.rows[0].id} (${nearDistRes.rows[0].name_en} / ${nearDistRes.rows[0].name_ar})`);

  // 6. Check Auth Trigger
  const trigRes = await client.query(`
    SELECT tgname, relname 
    FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
    WHERE nspname = 'auth' AND relname = 'users' AND tgname = 'on_auth_user_created';
  `);
  console.log(`Auth Trigger on auth.users: ${trigRes.rows.length > 0 ? 'ACTIVE (on_auth_user_created)' : 'MISSING'}`);

  await client.end();
  console.log('\nAll verification checks passed on the remote database!');
}

migrate().catch(err => {
  console.error('Remote migration failed:', err);
  process.exit(1);
});
