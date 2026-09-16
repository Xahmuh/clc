// Supabase Edge Function: lead-sla-check
// Checks for active leads past the admin-configured inactivity SLA threshold (default: 7 days)
// and dispatches high-priority Expo push notifications to assigned field employees.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://meujwpicsfxgkphvrojs.supabase.co';
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_ANON_KEY') ||
      'sb_publishable_61JunVsMNH4gsYu5y0SBXw_dNtYXaKT';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Admin-configured SLA Threshold from settings table
    const { data: settingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'lead_sla_inactivity_days')
      .single();

    const thresholdDays = settingData?.value ? parseInt(settingData.value, 10) : 7;

    // 2. Query SLA breached leads using SQL helper
    const { data: breachedLeads, error: rpcError } = await supabase.rpc('get_sla_breached_leads', {
      p_threshold_days: thresholdDays,
    });

    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
          body: `No activity in ${lead.days_inactive} days (SLA: ${thresholdDays}d). Please follow up with client.`,
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        threshold_days: thresholdDays,
        breached_count: leadsList.length,
        notifications_queued: notificationsToSend.length,
        push_result: pushResult,
        leads: leadsList,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
