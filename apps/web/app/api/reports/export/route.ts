import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  generateExecutiveReportWorkbook,
  type ReportActivityItem,
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

    // Default: Professional Excel Workbook (.xlsx) with KPIs and Pivot Analysis
    const metadata: ReportExportMetadata = {
      reportTitle: 'CLC CONTRACTING — FIELD OPERATIONS REPORT',
      dateRangeLabel: date_label || (start_date ? `From ${start_date.split('T')[0]}` : 'All Recorded History'),
      generatedByName: userProfile?.full_name || user.email || 'CRM Administrator',
      generatedByEmail: userProfile?.email || user.email || '',
      filterScope: effectiveEmployeeId
        ? enrichedActivities[0]?.employee_name || 'Individual Representative'
        : 'All Company Representatives',
    };

    const excelBuffer = await generateExecutiveReportWorkbook(enrichedActivities, metadata);
    const filename = `CLC-CRM-Executive-Report-${dateToday}.xlsx`;

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
