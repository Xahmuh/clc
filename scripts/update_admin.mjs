import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://meujwpicsfxgkphvrojs.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldWp3cGljc2Z4Z2twaHZyb2pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQzMzQ1MSwiZXhwIjoyMTA1MDA5NDUxfQ.klQBccBikvGjqiGswQ6HzDUAgeQRhYwDyTs5XAEyYG8';
const anonKey = 'sb_publishable_61JunVsMNH4gsYu5y0SBXw_dNtYXaKT';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const targetEmail = 'm.elsherbiny@clc-sa.com';
  const newPassword = 'Password123!';

  console.log(`Checking users for: ${targetEmail}...`);
  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    throw listErr;
  }

  console.log(`Total users in system: ${users.length}`);
  users.forEach(u => console.log(` - ${u.email} (ID: ${u.id}, role meta: ${u.user_metadata?.role})`));

  let user = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

  if (user) {
    console.log(`Found existing user: ${user.id}. Updating password and admin metadata...`);
    const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        role: 'admin'
      }
    });

    if (updateErr) {
      throw updateErr;
    }
    console.log('Auth user updated successfully.');
  } else {
    console.log(`User not found. Creating user ${targetEmail}...`);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: targetEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Muaz Elsherbini (Admin)',
        role: 'admin'
      }
    });

    if (createErr) {
      throw createErr;
    }
    user = created.user;
    console.log(`User created with ID: ${user.id}`);
  }

  // Verify/update public.profiles
  console.log('Updating public.profiles for ID:', user.id);
  const { data: existingProfile, error: profFetchErr } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profFetchErr && profFetchErr.code !== 'PGRST116') {
    console.warn('Profile fetch note:', profFetchErr.message);
  }

  if (existingProfile) {
    console.log('Existing profile found:', existingProfile);
    const { error: profUpdateErr } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);

    if (profUpdateErr) {
      throw profUpdateErr;
    }
    console.log('Profile role updated to "admin".');
  } else {
    console.log('Profile does not exist yet, inserting...');
    const { error: profInsertErr } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        role: 'admin',
        full_name: user.user_metadata?.full_name || 'Admin',
        phone: user.user_metadata?.phone || null
      });

    if (profInsertErr) {
      throw profInsertErr;
    }
    console.log('Profile inserted successfully with role "admin".');
  }

  // Test sign-in with anon client
  console.log('\n--- Testing login with anon client ---');
  const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: targetEmail,
    password: newPassword
  });

  if (signInErr) {
    console.error('Sign-in test failed:', signInErr.message);
  } else {
    console.log('Sign in successful! Session user:', signInData.user.email);
    const { data: prof, error: pErr } = await anonClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', signInData.user.id)
      .single();

    if (pErr) {
      console.error('Failed to fetch profile under auth user:', pErr.message);
    } else {
      console.log('Fetched profile successfully:');
      console.log(prof);
      if (prof.role === 'admin') {
        console.log('\nSUCCESS! User is verified as ADMIN in database.');
      } else {
        console.warn('\nWARNING: Role in profile is:', prof.role);
      }
    }
  }
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
