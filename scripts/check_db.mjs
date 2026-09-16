import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.meujwpicsfxgkphvrojs',
  password: 'Xx0078466!$$CLC',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const buckets = await client.query('select id, name, public from storage.buckets;');
  console.log('Buckets:', buckets.rows);
  const distPolicies = await client.query("select policyname, permissive, roles, cmd from pg_policies where tablename = 'districts';");
  console.log('Districts Policies:', distPolicies.rows);
  const actPolicies = await client.query("select policyname, permissive, roles, cmd from pg_policies where tablename = 'activities';");
  console.log('Activities Policies:', actPolicies.rows);
  const storagePolicies = await client.query("select policyname, permissive, roles, cmd from pg_policies where tablename = 'objects' and schemaname = 'storage';");
  console.log('Storage Objects Policies:', storagePolicies.rows);
  await client.end();
}

check().catch(e => console.error(e));
