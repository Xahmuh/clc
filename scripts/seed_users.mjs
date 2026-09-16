import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://meujwpicsfxgkphvrojs.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldWp3cGljc2Z4Z2twaHZyb2pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQzMzQ1MSwiZXhwIjoyMTA1MDA5NDUxfQ.klQBccBikvGjqiGswQ6HzDUAgeQRhYwDyTs5XAEyYG8';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  console.log('Creating Admin & Employee users...');

  // 1. Create Admin User: m.elsherbiny@clc-sa.com
  const { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
    email: 'm.elsherbiny@clc-sa.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Muaz Elsherbini (Admin)',
      phone: '0595330384',
      role: 'admin'
    }
  });

  if (adminErr) {
    console.error('Error creating admin:', adminErr.message);
  } else {
    console.log('Admin user created successfully:', adminUser.user.id, adminUser.user.email);
    // Explicitly update profile role to admin to ensure trigger respected it
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', adminUser.user.id);
  }

  // 2. Create Employee User: tariq@clc.com.sa (Tariq Mansoor)
  const { data: empUser, error: empErr } = await supabase.auth.admin.createUser({
    email: 'tariq@clc.com.sa',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Tariq Mansoor',
      phone: '0501112233',
      role: 'employee'
    }
  });

  if (empErr) {
    console.error('Error creating employee:', empErr.message);
  } else {
    console.log('Employee user created successfully:', empUser.user.id, empUser.user.email);
  }

  console.log('Done!');
}

seed().catch(console.error);
