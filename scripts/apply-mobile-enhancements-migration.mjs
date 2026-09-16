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

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL...');

  const sql = `
  -- 1. Enable authenticated users to insert new districts (Custom district feature)
  drop policy if exists "districts_insert_authenticated" on public.districts;
  create policy "districts_insert_authenticated" on public.districts
    for insert with check (auth.role() = 'authenticated');

  -- 2. Create helper RPC to safely add or return custom district
  create or replace function public.create_custom_district(
    p_name_en text,
    p_name_ar text,
    p_city text default 'Riyadh',
    p_lat numeric default 24.7136,
    p_lng numeric default 46.6753
  ) returns public.districts
  language plpgsql
  security definer
  as $$
  declare
    v_district public.districts;
    v_name_en text := trim(p_name_en);
    v_name_ar text := coalesce(nullif(trim(p_name_ar), ''), trim(p_name_en));
    v_city text := coalesce(nullif(trim(p_city), ''), 'Riyadh');
  begin
    -- Check if district already exists by name
    select * into v_district
    from public.districts
    where city = v_city and (lower(name_en) = lower(v_name_en) or name_ar = v_name_ar)
    limit 1;

    if v_district.id is not null then
      return v_district;
    end if;

    -- Otherwise insert
    insert into public.districts (city, name_en, name_ar, latitude, longitude)
    values (v_city, v_name_en, v_name_ar, coalesce(p_lat, 24.7136), coalesce(p_lng, 46.6753))
    returning * into v_district;

    return v_district;
  end;
  $$;

  -- 3. Create 'activity-attachments' storage bucket if it doesn't exist
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'activity-attachments',
    'activity-attachments',
    true,
    10485760, -- 10MB limit
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  on conflict (id) do update set public = true;

  -- 4. Storage RLS policies for activity-attachments
  drop policy if exists "activity_attachments_select" on storage.objects;
  create policy "activity_attachments_select" on storage.objects
    for select using (bucket_id = 'activity-attachments');

  drop policy if exists "activity_attachments_insert" on storage.objects;
  create policy "activity_attachments_insert" on storage.objects
    for insert with check (
      bucket_id = 'activity-attachments' and auth.role() = 'authenticated'
    );
  `;

  await client.query(sql);
  console.log('Migration applied successfully!');

  // Verify
  const bucketCheck = await client.query("select id, name, public from storage.buckets where id = 'activity-attachments';");
  console.log('Bucket check:', bucketCheck.rows);

  const funcCheck = await client.query("select * from public.create_custom_district('Al-Yasmin North', 'حي الياسمين الشمالي');");
  console.log('Custom district RPC test:', funcCheck.rows);

  await client.end();
}

run().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
