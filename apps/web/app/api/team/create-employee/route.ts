import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    // 1. Authenticate calling user using standard server client
    const supabase = createServerSupabaseClient(bearerToken);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(bearerToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((profile as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can create new employee accounts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fullName, email, phone, role } = body;

    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: 'Full name is required.' },
        { status: 400 }
      );
    }

    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const targetRole = role || 'employee';

    // 3. Connect to Supabase with Service Role Key (Admin Auth API)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://meujwpicsfxgkphvrojs.supabase.co';

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server error: Service role key is not configured.' },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate secure temporary password
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tempPassword = `CLC_${randomPart}!9`;

    // 4. Create user via admin API — email_confirm: true prevents sending confirmation emails and bypasses rate limits completely!
    const cleanEmail = email.trim().toLowerCase();
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role: targetRole,
      },
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message || 'Failed to create user in Supabase Auth' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed to return a valid user object' },
        { status: 500 }
      );
    }

    // 5. Ensure profile table has the user record with the correct role & active status
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role: targetRole,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.warn('Profile upsert warning:', profileError.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: cleanEmail,
        full_name: fullName.trim(),
        role: targetRole,
      },
      tempPassword,
    });
  } catch (err: any) {
    console.error('Create employee error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
