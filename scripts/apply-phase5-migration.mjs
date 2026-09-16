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
  console.log(`Connecting to Supabase PostgreSQL at ${host}...`);
  const client = new Client({
    host,
    port: 5432,
    user: username,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected successfully!\n');

  const migrationFile = path.join(rootDir, 'supabase', 'migrations', '20260915000002_phase5_sla_and_push_tokens.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log('Applying Phase 5 Migration...');
  await client.query(sql);
  console.log('Migration applied successfully!\n');

  console.log('Verifying Phase 5 Database Schema:');
  
  // 1. Check settings table
  const settingsRes = await client.query('select * from public.settings;');
  console.log('Settings Rows:', settingsRes.rows);

  // 2. Check expo_push_token column in profiles
  const colRes = await client.query(`
    select column_name, data_type 
    from information_schema.columns 
    where table_name = 'profiles' and column_name = 'expo_push_token';
  `);
  console.log('expo_push_token column:', colRes.rows);

  // 3. Test get_sla_breached_leads function
  const funcRes = await client.query('select * from public.get_sla_breached_leads(7);');
  console.log('SLA breached leads (7 days threshold):', funcRes.rows.length);

  await client.end();
  console.log('\nAll Phase 5 database changes verified on remote Supabase!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
