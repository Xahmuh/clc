import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  generateExecutiveReportWorkbook,
  type ReportActivityItem,
  type ReportLeadItem,
  type ReportCustomerItem,
  type ReportExportMetadata,
} from '@/lib/reports/excel-generator';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const supabase = createServerSupabaseClient(bearerToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      start_date,
      end_date,
      employee_id,
      format = 'xlsx',
      date_label,
      lang = 'ar',
    } = body;

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();

    const userProfile = profile as any;
    const isManager = userProfile?.role === 'admin' || userProfile?.role === 'supervisor';

    // RLS will also naturally restrict employee queries, but we enforce it here too
    const effectiveEmployeeId = isManager ? employee_id : user.id;

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
    if (effectiveEmployeeId) {
      query = query.eq('employee_id', effectiveEmployeeId);
    }

    const { data: activities, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Fetch related names for leads and customers in bulk
    const leadIds = activities?.filter((a: any) => a.related_entity_type === 'lead').map((a: any) => a.related_entity_id) || [];
    const customerIds = activities?.filter((a: any) => a.related_entity_type === 'customer').map((a: any) => a.related_entity_id) || [];

    const entityNamesMap = new Map<string, string>();

    if (leadIds.length > 0) {
      const { data: leads } = await supabase.from('leads').select('id, company_name').in('id', leadIds);
      leads?.forEach((l: any) => entityNamesMap.set(l.id, l.company_name));
    }
    if (customerIds.length > 0) {
      const { data: customers } = await supabase.from('customers').select('id, company_name').in('id', customerIds);
      customers?.forEach((c: any) => entityNamesMap.set(c.id, c.company_name));
    }

    const enrichedActivities: ReportActivityItem[] = (activities || []).map((a: any) => {
      const entityName = entityNamesMap.get(a.related_entity_id) || (lang === 'ar' ? 'حساب غير محدد' : 'Unknown Account');
      return {
        id: a.id,
        activity_type: a.activity_type,
        activity_date: a.activity_date,
        employee_id: a.employee_id,
        employee_name: a.profiles?.full_name || (lang === 'ar' ? 'موظف ميداني' : 'Field Employee'),
        employee_email: a.profiles?.email || '',
        related_entity_type: a.related_entity_type,
        related_entity_id: a.related_entity_id || '',
        entity_name: entityName,
        description: a.description,
        outcome: a.outcome,
        follow_up_date: a.follow_up_date,
        latitude: a.latitude ? Number(a.latitude) : null,
        longitude: a.longitude ? Number(a.longitude) : null,
      };
    });

    // -------------------------------------------------------------
    // Query Leads & Customers registered within selected date range
    // -------------------------------------------------------------
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (start_date) {
      leadsQuery = leadsQuery.gte('created_at', start_date);
    }
    if (end_date) {
      leadsQuery = leadsQuery.lte('created_at', end_date);
    }
    if (effectiveEmployeeId) {
      leadsQuery = leadsQuery.eq('assigned_to', effectiveEmployeeId);
    }

    const { data: rawLeads } = await leadsQuery;

    let customersQuery = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (start_date) {
      customersQuery = customersQuery.gte('created_at', start_date);
    }
    if (end_date) {
      customersQuery = customersQuery.lte('created_at', end_date);
    }
    if (effectiveEmployeeId) {
      customersQuery = customersQuery.eq('assigned_to', effectiveEmployeeId);
    }

    const { data: rawCustomers } = await customersQuery;

    // Collect all referenced district IDs and profile IDs for bulk enrichment
    const districtIds = Array.from(
      new Set([
        ...(rawLeads || []).map((l: any) => l.district_id).filter(Boolean),
        ...(rawCustomers || []).map((c: any) => c.district_id).filter(Boolean),
      ])
    );

    const districtsMap = new Map<number, { name_ar: string; name_en: string }>();
    if (districtIds.length > 0) {
      const { data: districts } = await supabase
        .from('districts')
        .select('id, name_ar, name_en')
        .in('id', districtIds);
      districts?.forEach((d: any) => {
        districtsMap.set(d.id, { name_ar: d.name_ar, name_en: d.name_en });
      });
    }

    const assignedUserIds = Array.from(
      new Set([
        ...(rawLeads || []).map((l: any) => l.assigned_to).filter(Boolean),
        ...(rawCustomers || []).map((c: any) => c.assigned_to).filter(Boolean),
      ])
    );

    const profilesMap = new Map<string, { full_name: string; email: string }>();
    if (assignedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', assignedUserIds);
      profiles?.forEach((p: any) => {
        profilesMap.set(p.id, { full_name: p.full_name, email: p.email });
      });
    }

    const leadsItems: ReportLeadItem[] = (rawLeads || []).map((l: any) => {
      const dist = l.district_id ? districtsMap.get(l.district_id) : null;
      const rep = l.assigned_to ? profilesMap.get(l.assigned_to) : null;
      return {
        id: l.id,
        company_name: l.company_name,
        contact_person: l.contact_person,
        phone: l.phone,
        email: l.email,
        source: l.source,
        status: l.status,
        estimated_value: l.estimated_value != null ? Number(l.estimated_value) : null,
        project_type: l.project_type,
        district_name_ar: dist?.name_ar || null,
        district_name_en: dist?.name_en || null,
        assigned_to_name: rep?.full_name || null,
        assigned_to_email: rep?.email || null,
        notes: l.notes,
        created_at: l.created_at,
      };
    });

    const customersItems: ReportCustomerItem[] = (rawCustomers || []).map((c: any) => {
      const dist = c.district_id ? districtsMap.get(c.district_id) : null;
      const rep = c.assigned_to ? profilesMap.get(c.assigned_to) : null;
      return {
        id: c.id,
        company_name: c.company_name,
        contact_person: c.contact_person,
        phone: c.phone,
        email: c.email,
        address: c.address,
        district_name_ar: dist?.name_ar || null,
        district_name_en: dist?.name_en || null,
        assigned_to_name: rep?.full_name || null,
        assigned_to_email: rep?.email || null,
        customer_since: c.customer_since,
        created_at: c.created_at,
      };
    });

    const dateToday = new Date().toISOString().split('T')[0];

    // CSV fallback format if specifically requested
    if (format === 'csv') {
      const headers =
        lang === 'ar'
          ? [
              'التاريخ والوقت',
              'اسم الممثل',
              'البريد الإلكتروني',
              'نوع النشاط',
              'نوع الحساب',
              'اسم الشركة أو العميل',
              'الملاحظات والتفاصيل',
              'النتيجة',
              'موعد المتابعة',
              'إحداثيات الموقع',
            ]
          : [
              'Date & Time',
              'Representative',
              'Email',
              'Activity Type',
              'Account Type',
              'Company Name',
              'Notes & Observations',
              'Outcome',
              'Follow-up Date',
              'GPS Coordinates',
            ];

      const csvLines = [headers.join(',')];
      for (const a of enrichedActivities) {
        const dateStr = a.activity_date ? new Date(a.activity_date).toISOString().replace('T', ' ').substring(0, 19) : '';
        const gpsStr = a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : '';
        csvLines.push(
          [
            `"${dateStr}"`,
            `"${a.employee_name}"`,
            `"${a.employee_email}"`,
            `"${a.activity_type.toUpperCase()}"`,
            `"${a.related_entity_type.toUpperCase()}"`,
            `"${(a.entity_name || '').replace(/"/g, '""')}"`,
            `"${(a.description || '').replace(/"/g, '""')}"`,
            `"${(a.outcome || '').replace(/"/g, '""')}"`,
            `"${a.follow_up_date || ''}"`,
            `"${gpsStr}"`,
          ].join(',')
        );
      }

      // Prepend UTF-8 BOM so Microsoft Excel for Windows recognizes Arabic characters properly
      const BOM = '\uFEFF';
      const csvContent = BOM + csvLines.join('\n');
      const filename = `CLC-CRM-Report-${dateToday}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: Professional Excel Workbook (.xlsx) with KPIs, Pivots, Details & Registered Accounts
    const exportLang: 'ar' | 'en' = lang === 'en' ? 'en' : 'ar';
    const metadata: ReportExportMetadata = {
      reportTitle: exportLang === 'en' 
        ? 'CLC CONTRACTING — FIELD OPERATIONS REPORT' 
        : 'شركة CLC للمقاولات — تقرير العمليات الميدانية والأنشطة',
      dateRangeLabel: date_label || (start_date 
        ? (exportLang === 'en' ? `From ${start_date.split('T')[0]}` : `من تاريخ ${start_date.split('T')[0]}`)
        : (exportLang === 'en' ? 'All Recorded History' : 'كامل السجل التاريخي')),
      generatedByName: userProfile?.full_name || user.email || (exportLang === 'en' ? 'CRM Administrator' : 'إدارة النظام'),
      generatedByEmail: userProfile?.email || user.email || '',
      filterScope: effectiveEmployeeId
        ? enrichedActivities[0]?.employee_name || (exportLang === 'en' ? 'Individual Representative' : 'ممثل فردي')
        : (exportLang === 'en' ? 'All Company Representatives' : 'كافة موظفي وممثلي الشركة'),
    };

    const excelBuffer = await generateExecutiveReportWorkbook(
      enrichedActivities,
      metadata,
      exportLang,
      leadsItems,
      customersItems
    );
    const filename = `CLC-CRM-Executive-Report-${exportLang.toUpperCase()}-${dateToday}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('Error generating report export:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
