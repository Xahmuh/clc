'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Download,
  Filter,
  FileSpreadsheet,
  Printer,
  Search,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Activity, Profile, Lead, Customer, District } from '@clc/shared';

interface EnrichedActivity extends Activity {
  entity_name: string;
  employee_name: string;
  employee_email: string;
}

export default function ReportsPage() {
  const { user, profile, isAdmin, isManager, isLoading: isAuthLoading } = useAuth();
  const { t, formatActivityType, formatRole, language, isRTL } = useLanguage();
  const supabase = createClient();

  // Filters State
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'all' | 'custom'>('weekly');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Data State
  const [activities, setActivities] = useState<EnrichedActivity[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [districts, setDistricts] = useState<Record<number, District>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Cached reference metadata to avoid re-querying static tables on every filter switch
  const metadataCacheRef = React.useRef<{
    profMap: Record<string, Profile>;
    leadMap: Record<string, string>;
    custMap: Record<string, string>;
    distMap: Record<number, District>;
    employees: Profile[];
  } | null>(null);

  const loadReportData = async () => {
    // If we already have initial data, treat this as a quick in-place refetch without collapsing the UI
    if (metadataCacheRef.current) {
      setIsRefetching(true);
    } else {
      setInitialLoading(true);
    }

    try {
      // 1. Determine Date Range Filter
      let startDate: string | null = null;
      let endDate: string | null = null;
      const now = new Date();

      if (dateRange === 'daily') {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        startDate = startOfDay.toISOString();
      } else if (dateRange === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (dateRange === 'monthly') {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        startDate = monthAgo.toISOString();
      } else if (dateRange === 'custom') {
        if (customStartDate) {
          const s = new Date(customStartDate);
          s.setHours(0, 0, 0, 0);
          startDate = s.toISOString();
        }
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          endDate = e.toISOString();
        }
      }

      // 2. Query Activities
      let query = supabase
        .from('activities')
        .select('*')
        .order('activity_date', { ascending: false });

      if (startDate) {
        query = query.gte('activity_date', startDate);
      }
      if (endDate) {
        query = query.lte('activity_date', endDate);
      }

      if (isManager && selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data: rawActivities, error } = await query;

      if (!error && rawActivities) {
        // Load metadata if not cached yet
        if (!metadataCacheRef.current) {
          const [profRes, leadsRes, custsRes, distRes] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('leads').select('id, company_name'),
            supabase.from('customers').select('id, company_name'),
            supabase.from('districts').select('*'),
          ]);

          const profMap: Record<string, Profile> = {};
          ((profRes.data as unknown as Profile[]) || []).forEach((p) => {
            profMap[p.id] = p;
          });

          const leadMap: Record<string, string> = {};
          ((leadsRes.data as unknown as Lead[]) || []).forEach((l) => {
            leadMap[l.id] = l.company_name;
          });

          const custMap: Record<string, string> = {};
          ((custsRes.data as unknown as Customer[]) || []).forEach((c) => {
            custMap[c.id] = c.company_name;
          });

          const distMap: Record<number, District> = {};
          ((distRes.data as unknown as District[]) || []).forEach((d) => {
            distMap[d.id] = d;
          });

          const emps = (profRes.data as unknown as Profile[]) || [];
          metadataCacheRef.current = {
            profMap,
            leadMap,
            custMap,
            distMap,
            employees: emps,
          };

          setDistricts(distMap);
          setEmployees(emps);
        }

        const { profMap, leadMap, custMap } = metadataCacheRef.current;

        // Section 8: "coalesce(l.company_name, c.company_name) as entity_name"
        const enriched: EnrichedActivity[] = (rawActivities as unknown as Activity[]).map((a) => {
          const emp = profMap[a.employee_id];
          const entityName =
            a.related_entity_type === 'lead'
              ? leadMap[a.related_entity_id] || 'Lead'
              : custMap[a.related_entity_id] || 'Customer';

          return {
            ...a,
            entity_name: entityName,
            employee_name: emp?.full_name || 'Field Agent',
            employee_email: emp?.email || '',
          };
        });

        setActivities(enriched);
      }
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setInitialLoading(false);
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadReportData();
    }
  }, [isAuthLoading, user, dateRange, selectedEmployee, customStartDate, customEndDate]);

  // Client-side filtering for type and search
  const filteredActivities = activities.filter((a) => {
    if (selectedType !== 'all' && a.activity_type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const entityName = (a.entity_name || '').toLowerCase();
      const employeeName = (a.employee_name || '').toLowerCase();
      const employeeEmail = (a.employee_email || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      const outcome = (a.outcome || '').toLowerCase();
      const rawType = (a.activity_type || '').toLowerCase();
      const localizedType = formatActivityType(a.activity_type).toLowerCase();
      const dateStr = (a.activity_date || '').toLowerCase();

      return (
        entityName.includes(q) ||
        employeeName.includes(q) ||
        employeeEmail.includes(q) ||
        desc.includes(q) ||
        outcome.includes(q) ||
        rawType.includes(q) ||
        localizedType.includes(q) ||
        dateStr.includes(q)
      );
    }
    return true;
  });

  // Summary Metrics
  const totalCount = filteredActivities.length;
  const visitCount = filteredActivities.filter((a) => a.activity_type === 'visit').length;
  const visitGpsCount = filteredActivities.filter(
    (a) => a.activity_type === 'visit' && a.latitude && a.longitude
  ).length;
  const callCount = filteredActivities.filter((a) => a.activity_type === 'call').length;
  const meetingCount = filteredActivities.filter((a) => a.activity_type === 'meeting').length;
  const emailCount = filteredActivities.filter((a) => a.activity_type === 'email').length;

  // Helper for direct client-side CSV download
  const downloadCsvLocally = (items: EnrichedActivity[]) => {
    const headers =
      language === 'ar'
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
    for (const a of items) {
      const typeLabel = formatActivityType(a.activity_type);
      const entityTypeLabel =
        a.related_entity_type === 'lead'
          ? (language === 'ar' ? 'فرصة محتملة' : 'Lead')
          : (language === 'ar' ? 'عميل' : 'Customer');

      csvLines.push(
        [
          `"${new Date(a.activity_date).toISOString().replace('T', ' ').substring(0, 19)}"`,
          `"${a.employee_name || ''}"`,
          `"${a.employee_email || ''}"`,
          `"${typeLabel}"`,
          `"${entityTypeLabel}"`,
          `"${(a.entity_name || '').replace(/"/g, '""')}"`,
          `"${(a.description || '').replace(/"/g, '""')}"`,
          `"${(a.outcome || '').replace(/"/g, '""')}"`,
          `"${a.follow_up_date || ''}"`,
          `"${a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : ''}"`,
        ].join(',')
      );
    }

    // Prepend UTF-8 BOM (\uFEFF) for Excel Arabic support
    const BOM = '\uFEFF';
    const csvContent = BOM + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CLC-CRM-Report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Export Trigger
  const handleExportExcel = async (exportFormat: 'xlsx' | 'csv' = 'xlsx') => {
    setIsExporting(true);
    try {
      let startDate: string | null = null;
      let endDate: string | null = null;
      const now = new Date();
      let dateLabel = 'All Recorded History';

      if (dateRange === 'daily') {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        startDate = startOfDay.toISOString();
        dateLabel = `Daily Report (${now.toLocaleDateString()})`;
      } else if (dateRange === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString();
        dateLabel = `Weekly Report (${weekAgo.toLocaleDateString()} to ${now.toLocaleDateString()})`;
      } else if (dateRange === 'monthly') {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        startDate = monthAgo.toISOString();
        dateLabel = `Monthly Report (${monthAgo.toLocaleDateString()} to ${now.toLocaleDateString()})`;
      } else if (dateRange === 'custom') {
        if (customStartDate) {
          const s = new Date(customStartDate);
          s.setHours(0, 0, 0, 0);
          startDate = s.toISOString();
        }
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          endDate = e.toISOString();
        }
        const fromStr = customStartDate || '...';
        const toStr = customEndDate || '...';
        dateLabel = `Custom Report (${fromStr} to ${toStr})`;
      }

      // 1. Retrieve session access token for Bearer auth
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          employee_id: isManager && selectedEmployee !== 'all' ? selectedEmployee : undefined,
          format: exportFormat,
          date_label: dateLabel,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateToday = new Date().toISOString().split('T')[0];
        a.download = exportFormat === 'xlsx'
          ? `CLC-CRM-Executive-Report-${dateToday}.xlsx`
          : `CLC-CRM-Report-${dateToday}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      // If server returned non-200, fallback gracefully to client-side CSV download
      console.warn('Server export returned status', res.status, '- downloading client-side CSV.');
      downloadCsvLocally(filteredActivities);
    } catch (err) {
      console.warn('Server export request failed, falling back to client-side CSV download:', err);
      downloadCsvLocally(filteredActivities);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-8 space-y-8">
      {/* Top Header & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t('field_intelligence')}
          </span>
          <h1 className="text-2xl font-bold text-ink-900 mt-1">{t('activities_field_reports')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('reports_desc')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-ink-900 px-3.5 py-2 rounded-button text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4 text-gray-500" />
            <span>{t('print_pdf')}</span>
          </button>

          <button
            onClick={() => handleExportExcel('xlsx')}
            disabled={isExporting}
            className="inline-flex items-center gap-2 bg-ink-900 text-white px-4 py-2 rounded-button text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{isExporting ? t('generating_report') : t('export_excel')}</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="w-full bg-white rounded-card border border-gray-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Date Range Tabs */}
          <div className="flex items-center gap-1 bg-surfaceSubtle p-1 rounded-button border border-gray-200">
            {(
              [
                { id: 'daily', label: t('range_daily') },
                { id: 'weekly', label: t('range_weekly') },
                { id: 'monthly', label: t('range_monthly') },
                { id: 'all', label: t('range_all') },
                { id: 'custom', label: t('range_custom') },
              ] as { id: 'daily' | 'weekly' | 'monthly' | 'all' | 'custom'; label: string }[]
            ).map((tItem) => (
              <button
                key={tItem.id}
                onClick={() => setDateRange(tItem.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-button border transition-all duration-150 ${
                  dateRange === tItem.id
                    ? 'bg-white text-ink-900 border-gray-200 shadow-none'
                    : 'border-transparent text-gray-500 hover:text-ink-900'
                }`}
              >
                {tItem.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers — visible only when Custom tab is active */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-gray-400">{t('custom_from')}:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || undefined}
                  className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-button text-ink-900 focus:outline-none focus:border-ink-900 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-gray-400">{t('custom_to')}:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate || undefined}
                  className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-button text-ink-900 focus:outline-none focus:border-ink-900 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Representative Filter (Manager/Supervisor/Admin) */}
          {isManager && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">{t('representative')}:</span>
              <CustomSelect
                value={selectedEmployee}
                onChange={(val) => setSelectedEmployee(val)}
                size="sm"
                fullWidth={false}
                className="min-w-[180px]"
                options={[
                  { value: 'all', label: t('all_employees') },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: emp.full_name,
                    sublabel: formatRole(emp.role),
                  })),
                ]}
              />
            </div>
          )}
        </div>

        {/* Activity Type & Search Secondary Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">{t('quick_log_activity_type')}:</span>
            <CustomSelect
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              size="sm"
              fullWidth={false}
              className="min-w-[150px]"
              options={[
                { value: 'all', label: t('all_touchpoints') },
                { value: 'visit', label: formatActivityType('visit') },
                { value: 'call', label: formatActivityType('call') },
                { value: 'email', label: formatActivityType('email') },
                { value: 'meeting', label: formatActivityType('meeting') },
              ]}
            />
          </div>

          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-gray-400 ${
                isRTL ? 'right-3' : 'left-3'
              }`}
            >
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={t('search_report_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-2 bg-white border border-gray-200 rounded-button text-xs text-ink-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-ink-900 shadow-none ${
                isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'
              }`}
            />
            {searchQuery.trim() ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-ink-900 rounded-full transition-colors ${
                  isRTL ? 'left-2.5' : 'right-2.5'
                }`}
                title={language === 'ar' ? 'مسح البحث' : 'Clear search'}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* SUMMARY METRICS ROW */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-card border border-gray-200 p-5 min-h-[125px] flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {t('total_touchpoints')}
          </span>
          {initialLoading ? (
            <div className="mt-2 space-y-2 animate-pulse">
              <div className="h-8 w-14 bg-gray-100 rounded" />
              <div className="h-3 w-32 bg-gray-50 rounded" />
            </div>
          ) : (
            <>
              <div className="text-[32px] font-extrabold text-ink-900 mt-2">{totalCount}</div>
              <p className="text-[11px] text-gray-500 mt-1">{t('logged_in_range')}</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5 min-h-[125px] flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {formatActivityType('visit')}
          </span>
          {initialLoading ? (
            <div className="mt-2 space-y-2 animate-pulse">
              <div className="h-8 w-14 bg-gray-100 rounded" />
              <div className="h-3 w-32 bg-gray-50 rounded" />
            </div>
          ) : (
            <>
              <div className="text-[32px] font-extrabold text-ink-900 mt-2">{visitCount}</div>
              <p className="text-[11px] text-gray-500 mt-1">
                {visitGpsCount} GPS
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5 min-h-[125px] flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {formatActivityType('call')}
          </span>
          {initialLoading ? (
            <div className="mt-2 space-y-2 animate-pulse">
              <div className="h-8 w-14 bg-gray-100 rounded" />
              <div className="h-3 w-32 bg-gray-50 rounded" />
            </div>
          ) : (
            <>
              <div className="text-[32px] font-extrabold text-ink-900 mt-2">{callCount}</div>
              <p className="text-[11px] text-gray-500 mt-1">{t('activity_call')}</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5 min-h-[125px] flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {formatActivityType('meeting')} & {formatActivityType('email')}
          </span>
          {initialLoading ? (
            <div className="mt-2 space-y-2 animate-pulse">
              <div className="h-8 w-14 bg-gray-100 rounded" />
              <div className="h-3 w-32 bg-gray-50 rounded" />
            </div>
          ) : (
            <>
              <div className="text-[32px] font-extrabold text-ink-900 mt-2">
                {meetingCount + emailCount}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {meetingCount} • {emailCount}
              </p>
            </>
          )}
        </div>
      </div>

      {/* DETAILED ACTIVITIES AUDIT TABLE */}
      <div className="bg-white rounded-card border border-gray-200 overflow-hidden min-h-[480px] flex flex-col justify-between relative">
        {/* Top Progress Accent for seamless in-place refetches */}
        {isRefetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 overflow-hidden z-10">
            <div className="h-full bg-ink-900 animate-pulse w-full" />
          </div>
        )}

        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink-900">
              {t('activity_history')}
            </h2>
            {isRefetching && (
              <span className="text-[11px] font-medium text-gray-400 animate-pulse">
                • {t('saving')}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {t('dir_showing_results')} {filteredActivities.length} / {activities.length}
          </span>
        </div>

        {initialLoading ? (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-surfaceSubtle text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">{t('field_date')}</th>
                  {isManager && <th className="py-3 px-6">{t('representative')}</th>}
                  <th className="py-3 px-6">{t('field_company_name')}</th>
                  <th className="py-3 px-6">{t('quick_log_activity_type')}</th>
                  <th className="py-3 px-6">{t('field_notes')}</th>
                  <th className="py-3 px-6">{t('field_outcome')}</th>
                  <th className="py-3 px-6">{t('quick_log_gps_location')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="py-3.5">
                    <td className="py-3.5 px-6">
                      <div className="h-3.5 w-24 bg-gray-100 rounded" />
                    </td>
                    {isManager && (
                      <td className="py-3.5 px-6">
                        <div className="h-3.5 w-20 bg-gray-100 rounded" />
                      </td>
                    )}
                    <td className="py-3.5 px-6">
                      <div className="h-3.5 w-28 bg-gray-100 rounded" />
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="h-3.5 w-14 bg-gray-100 rounded" />
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="h-3.5 w-48 bg-gray-50 rounded" />
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="h-3.5 w-16 bg-gray-100 rounded" />
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="h-3.5 w-24 bg-gray-50 rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center flex-1 flex flex-col items-center justify-center min-h-[360px]">
            {searchQuery.trim() ? (
              <>
                <Search className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-ink-900">
                  {language === 'ar'
                    ? `لا توجد أنشطة تطابق "${searchQuery}"`
                    : `No activities matching "${searchQuery}"`}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs font-semibold text-ink-900 hover:underline inline-flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'إلغاء البحث' : 'Clear search'}</span>
                </button>
              </>
            ) : (
              <>
                <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-ink-900">{t('no_activities_yet')}</p>
              </>
            )}
          </div>
        ) : (
          <div
            className={`overflow-x-auto flex-1 transition-opacity duration-150 ${
              isRefetching ? 'opacity-60 pointer-events-none' : 'opacity-100'
            }`}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-surfaceSubtle text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">{t('field_date')}</th>
                  {isManager && <th className="py-3 px-6">{t('representative')}</th>}
                  <th className="py-3 px-6">{t('field_company_name')}</th>
                  <th className="py-3 px-6">{t('quick_log_activity_type')}</th>
                  <th className="py-3 px-6">{t('field_notes')}</th>
                  <th className="py-3 px-6">{t('field_outcome')}</th>
                  <th className="py-3 px-6">{t('quick_log_gps_location')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredActivities.map((act) => {
                  const dateStr = new Date(act.activity_date).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={act.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6 whitespace-nowrap font-medium text-ink-900">
                        {dateStr}
                      </td>

                      {isManager && (
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <div className="font-semibold text-ink-900">{act.employee_name}</div>
                          <div className="text-[11px] text-gray-400">{act.employee_email}</div>
                        </td>
                      )}

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="font-semibold text-ink-900">{act.entity_name}</span>
                        <span className="block text-[10px] uppercase text-gray-400">
                          {act.related_entity_type === 'lead' ? t('nav_leads') : t('nav_customers')}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-200 bg-surfaceSubtle font-semibold text-[11px] text-ink-900 capitalize">
                          {formatActivityType(act.activity_type)}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 max-w-xs text-gray-600">
                        <p className="line-clamp-2">{act.description || '—'}</p>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap text-gray-600">
                        {act.outcome ? (
                          <span className="font-medium text-ink-900">{act.outcome}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap text-gray-600">
                        {act.latitude && act.longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${act.latitude},${act.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-ink-900 hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            <span>GPS ({Number(act.latitude).toFixed(3)}, {Number(act.longitude).toFixed(3)})</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
