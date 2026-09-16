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
  const mohamedId = 'ac5ac8d5-2d7f-4e2f-8d2b-1244efb3a387';
  const muazId = '1bb17aa8-0f18-45c1-926d-8cc288845048';

  console.log('=== Step 1: Reassigning any leads/records from Mohamed to Muaz ===');
  // Update leads assigned_to
  const { data: updatedLeads, error: leadErr } = await adminClient
    .from('leads')
    .update({ assigned_to: muazId })
    .eq('assigned_to', mohamedId)
    .select();

  if (leadErr) {
    console.error('Error reassigning leads:', leadErr);
  } else {
    console.log(`Reassigned ${updatedLeads?.length || 0} leads to Muaz.`);
  }

  // Update customers assigned_to
  const { data: updatedCusts, error: custErr } = await adminClient
    .from('customers')
    .update({ assigned_to: muazId })
    .eq('assigned_to', mohamedId)
    .select();

  if (custErr) {
    console.error('Error reassigning customers:', custErr);
  } else {
    console.log(`Reassigned ${updatedCusts?.length || 0} customers to Muaz.`);
  }

  console.log('\n=== Step 2: Deleting Mohamed profile from public.profiles ===');
  const { error: delProfErr } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', mohamedId);

  if (delProfErr) {
    console.error('Error deleting profile:', delProfErr);
  } else {
    console.log('Profile for Mohamed deleted successfully.');
  }

  console.log('\n=== Step 3: Deleting Mohamed user from auth.users ===');
  const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(mohamedId);
  if (delAuthErr) {
    console.error('Error deleting auth user:', delAuthErr);
  } else {
    console.log('Auth user for Mohamed deleted successfully.');
  }

  console.log('\n=== Step 4: Updating Muaz auth user with target email m.elsherbiny@clc-sa.com ===');
  const { data: updatedMuazAuth, error: updateMuazErr } = await adminClient.auth.admin.updateUserById(
    muazId,
    {
      email: 'm.elsherbiny@clc-sa.com',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Muaz Elsherbini (Admin)',
        phone: '0595330384',
        role: 'admin'
      }
    }
  );

  if (updateMuazErr) {
    console.error('Error updating Muaz auth user:', updateMuazErr);
  } else {
    console.log('Muaz auth user updated successfully:', updatedMuazAuth.user.email);
  }

  console.log('\n=== Step 5: Ensuring Muaz profile in public.profiles is fully up to date ===');
  const { data: muazProfile, error: muazProfErr } = await adminClient
    .from('profiles')
    .upsert({
      id: muazId,
      full_name: 'Muaz Elsherbini (Admin)',
      email: 'm.elsherbiny@clc-sa.com',
      phone: '0595330384',
      role: 'admin',
      is_active: true
    })
    .select()
    .single();

  if (muazProfErr) {
    console.error('Error updating Muaz profile:', muazProfErr);
  } else {
    console.log('Muaz profile updated:', muazProfile);
  }

  console.log('\n=== Step 6: Verifying remaining users in database ===');
  const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers();
  console.log('Remaining Auth Users:');
  allUsers.forEach(u => console.log(` - [${u.id}] ${u.email} (${u.user_metadata?.full_name})`));

  const { data: allProfiles } = await adminClient.from('profiles').select('id, full_name, email, role');
  console.log('\nRemaining Profiles:');
  console.log(allProfiles);

  console.log('\n=== Step 7: Testing login for Muaz with anonClient ===');
  const { data: session, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: 'm.elsherbiny@clc-sa.com',
    password: 'Password123!'
  });

  if (loginErr) {
    console.error('Login test failed:', loginErr.message);
  } else {
    console.log('Login SUCCESS! User ID:', session.user.id, 'Email:', session.user.email);
    const { data: loggedInProfile } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    console.log('Logged in user profile:', loggedInProfile);
  }
}

main().catch(console.error);
