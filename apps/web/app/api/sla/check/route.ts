import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const supabase = createServerSupabaseClient(bearerToken);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(bearerToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((profile as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin privilege required' },
        { status: 403 }
      );
    }

    // 1. Fetch SLA Threshold from settings table
    const { data: settingData } = await (supabase.from('settings') as any)
      .select('value')
      .eq('key', 'lead_sla_inactivity_days')
      .single();

    const thresholdDays = settingData?.value ? parseInt(settingData.value, 10) : 7;

    // 2. Fetch breached leads via RPC
    const { data: breachedLeads, error: rpcError } = await (supabase.rpc as any)(
      'get_sla_breached_leads',
      { p_threshold_days: thresholdDays }
    );

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    const leadsList = breachedLeads || [];
    const notificationsToSend: any[] = [];

    // 3. Prepare Expo Push Notifications
    for (const lead of leadsList) {
      if (lead.expo_push_token) {
        notificationsToSend.push({
          to: lead.expo_push_token,
          sound: 'default',
          title: `Lead SLA Alert: ${lead.company_name}`,
          body: `No activity in ${lead.days_inactive} days (SLA threshold: ${thresholdDays}d). Please follow up with client.`,
          data: {
            leadId: lead.lead_id,
            daysInactive: lead.days_inactive,
            type: 'sla_escalation',
          },
          priority: 'high',
        });
      }
    }

    let pushResult = null;
    if (notificationsToSend.length > 0) {
      try {
        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationsToSend),
        });
        pushResult = await pushResponse.json();
      } catch (pushErr: any) {
        console.error('Failed to send Expo push:', pushErr);
      }
    }

    return NextResponse.json({
      success: true,
      threshold_days: thresholdDays,
      breached_count: leadsList.length,
      notifications_sent: notificationsToSend.length,
      push_result: pushResult,
      leads: leadsList,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
