import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const projectRef = process.env.SUPABASE_PROJECT_ID || 'meujwpicsfxgkphvrojs';
const token = process.env.SUPABASE_ACCESS_TOKEN;
const dbUrl = process.env.DATABASE_URL;

async function run() {
  const sqlPath = path.join(rootDir, 'supabase', 'phase1_complete_setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  if (token) {
    console.log(`Executing migration on project ${projectRef} via Supabase Management API...`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Migration failed (${res.status} ${res.statusText}):`, errText);
      process.exit(1);
    }

    const data = await res.json();
    console.log('Migration executed successfully via Management API!');
    console.log('Result:', data);
    return;
  }

  if (dbUrl) {
    console.log('Connecting via Postgres client...');
    try {
      const { Client } = await import('pg');
      const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
      await client.connect();
      console.log('Connected to remote database. Executing setup script...');
      await client.query(sql);
      const countRes = await client.query('SELECT count(*)::int as count FROM public.districts');
      console.log(`Migration applied successfully! Districts seeded: ${countRes.rows[0].count}`);
      await client.end();
      return;
    } catch (err) {
      console.error('Postgres execution failed:', err.message);
      process.exit(1);
    }
  }

  console.log(`
========================================================================
 How to apply this migration to your remote Supabase project:
========================================================================

Option A (Fastest - 10 seconds):
  1. Open your Supabase Dashboard:
     https://supabase.com/dashboard/project/${projectRef}/sql/new
  2. Copy the entire content of:
     supabase/phase1_complete_setup.sql
  3. Paste it in the SQL Editor and click "Run".

Option B (Automated via CLI / Access Token):
  Generate an access token at https://supabase.com/dashboard/account/tokens
  Then run:
  $env:SUPABASE_ACCESS_TOKEN="sbp_your_token"; node scripts/migrate-remote.mjs

Option C (Automated via Database Password):
  Set your database URL (found in Project Settings -> Database):
  $env:DATABASE_URL="postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres"; node scripts/migrate-remote.mjs
========================================================================
`);
}

run().catch(console.error);
