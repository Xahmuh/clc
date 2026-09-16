// Supabase Edge Function: generate-report
// Compiles daily/weekly/monthly CRM reports into CSV/Excel on demand per Section 8 of spec.

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://meujwpicsfxgkphvrojs.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_61JunVsMNH4gsYu5y0SBXw_dNtYXaKT';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const {
      start_date,
      end_date,
      employee_id,
      format = 'csv',
    } = body;

    // Build Activity Query (Section 8: "select a.*, coalesce(l.company_name, c.company_name) as entity_name")
    let query = supabase
      .from('activities')
      .select(`
        id,
        employee_id,
        activity_type,
        activity_date,
        description,
        latitude,
        longitude,
        outcome,
        follow_up_date,
        related_entity_type,
        related_entity_id,
        profiles (full_name, email)
      `)
      .order('activity_date', { ascending: false });

    if (start_date) {
      query = query.gte('activity_date', start_date);
    }
    if (end_date) {
      query = query.lte('activity_date', end_date);
    }
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    const { data: activities, error: dbError } = await query;

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parallel fetch entity names for leads and customers
    const [leadsRes, custsRes] = await Promise.all([
      supabase.from('leads').select('id, company_name'),
      supabase.from('customers').select('id, company_name'),
    ]);

    const leadMap = new Map((leadsRes.data || []).map((l: any) => [l.id, l.company_name]));
    const custMap = new Map((custsRes.data || []).map((c: any) => [c.id, c.company_name]));

    // Format rows for report
    const reportRows = (activities || []).map((a: any) => {
      const entityName =
        a.related_entity_type === 'lead'
          ? leadMap.get(a.related_entity_id) || 'Unknown Lead'
          : custMap.get(a.related_entity_id) || 'Unknown Customer';

      return {
        id: a.id,
        date: new Date(a.activity_date).toISOString().replace('T', ' ').substring(0, 19),
        employee: a.profiles?.full_name || a.employee_id,
        employee_email: a.profiles?.email || '',
        activity_type: a.activity_type.toUpperCase(),
        entity_type: a.related_entity_type.toUpperCase(),
        entity_name: entityName,
        notes: (a.description || '').replace(/"/g, '""'),
        outcome: a.outcome || '',
        follow_up_date: a.follow_up_date || '',
        gps_coordinates:
          a.latitude && a.longitude
            ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}`
            : '',
      };
    });

    if (format === 'csv' || format === 'excel') {
      const headers = [
        'Date & Time',
        'Employee Name',
        'Employee Email',
        'Activity Type',
        'Account Type',
        'Company Name',
        'Notes & Observations',
        'Outcome',
        'Follow-up Date',
        'GPS Coordinates',
      ];

      const csvLines = [headers.join(',')];
      for (const r of reportRows) {
        csvLines.push(
          [
            `"${r.date}"`,
            `"${r.employee}"`,
            `"${r.employee_email}"`,
            `"${r.activity_type}"`,
            `"${r.entity_type}"`,
            `"${r.entity_name}"`,
            `"${r.notes}"`,
            `"${r.outcome}"`,
            `"${r.follow_up_date}"`,
            `"${r.gps_coordinates}"`,
          ].join(',')
        );
      }

      const csvContent = csvLines.join('\n');
      const filename = `CLC-CRM-Report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'csv' : 'csv'}`;

      return new Response(csvContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default JSON response
    return new Response(JSON.stringify({ report: reportRows, count: reportRows.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
