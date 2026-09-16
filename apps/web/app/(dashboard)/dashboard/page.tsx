'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  Plus,
  Users,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Lead, Activity, Profile } from '@clc/shared';

interface TopPerformer {
  id: string;
  name: string;
  dealsWon: number;
  totalValueWon: number;
  activitiesCount: number;
}

export default function DashboardPage() {
  const { user, profile, isAdmin, isManager, isLoading: isAuthLoading } = useAuth();
  const { t, formatStatus, formatActivityType } = useLanguage();
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [slaThreshold, setSlaThreshold] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Leads (RLS will scope to employee if not admin)
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsData) {
        setLeads(leadsData as unknown as Lead[]);
      }

      // 2. Fetch Activities
      const { data: actsData } = await supabase
        .from('activities')
        .select('*')
        .order('activity_date', { ascending: false });

      if (actsData) {
        setActivities(actsData as unknown as Activity[]);
      }

      // 3. Fetch Profiles
      const { data: profData } = await supabase.from('profiles').select('*');
      if (profData) {
        const pMap: Record<string, Profile> = {};
        ((profData as unknown as Profile[]) || []).forEach((p) => {
          pMap[p.id] = p;
        });
        setProfiles(pMap);
      }

      // 4. Fetch SLA Threshold
      const { data: settingData } = await (supabase.from('settings') as any)
        .select('value')
        .eq('key', 'lead_sla_inactivity_days')
        .single();
      if (settingData?.value) {
        setSlaThreshold(parseInt(settingData.value, 10));
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadDashboardData();
    }
  }, [isAuthLoading, user]);

  // Calculations
  const openStages = ['new', 'contacted', 'qualified', 'negotiation'];
  const openLeads = leads.filter((l) => openStages.includes(l.status));
  const openPipelineValue = openLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);

  const wonLeads = leads.filter((l) => l.status === 'won');
  const lostLeads = leads.filter((l) => l.status === 'lost');
  const closedCount = wonLeads.length + lostLeads.length;
  const conversionRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : 0;

  // Activities logged today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const activitiesToday = activities.filter(
    (a) => new Date(a.activity_date) >= startOfDay
  );

  // Follow-ups due today / overdue (from activities where follow_up_date <= todayStr)
  const todayStr = new Date().toISOString().split('T')[0];
  const followUpsDue = activities.filter(
    (a) => a.follow_up_date && a.follow_up_date <= todayStr
  );

  // Top Performers calculation (for Admin)
  const performers: TopPerformer[] = Object.values(profiles)
    .filter((p) => p.is_active)
    .map((emp) => {
      const empWon = wonLeads.filter((l) => l.assigned_to === emp.id);
      const empActs = activities.filter((a) => a.employee_id === emp.id);
      const wonValue = empWon.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
      return {
        id: emp.id,
        name: emp.full_name,
        dealsWon: empWon.length,
        totalValueWon: wonValue,
        activitiesCount: empActs.length,
      };
    })
    .sort((a, b) => b.dealsWon - a.dealsWon || b.activitiesCount - a.activitiesCount)
    .slice(0, 4);

  // Pipeline stage breakdown
  const stageCounts = {
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    negotiation: leads.filter((l) => l.status === 'negotiation').length,
    won: wonLeads.length,
    lost: lostLeads.length,
  };

  // Stale Leads Escalation Calculation (Leads without activity >= slaThreshold days)
  const staleLeads = openLeads
    .map((l) => {
      const leadActs = activities.filter(
        (a) => a.related_entity_type === 'lead' && a.related_entity_id === l.id
      );
      const lastDate =
        leadActs.length > 0
          ? new Date(leadActs[0].activity_date)
          : new Date(l.created_at);
      const daysInactive = Math.floor(
        (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        lead: l,
        daysInactive,
        lastActivityDate: lastDate,
        assignedRep: l.assigned_to ? profiles[l.assigned_to] : null,
      };
    })
    .filter((item) => item.daysInactive >= slaThreshold)
    .sort((a, b) => b.daysInactive - a.daysInactive);

  return (
    <div className="w-full max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {isManager ? t('dash_executive_management') : t('dash_sales_operations')}
          </span>
          <h1 className="text-2xl font-bold text-ink-900 mt-1">
            {isManager ? t('dash_company_overview') : `${t('dash_welcome_back')}, ${profile?.full_name?.split(' ')[0] || t('representative')}`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManager
              ? t('dash_company_subtitle')
              : t('dash_rep_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 bg-ink-900 text-white px-4 py-2 rounded-button text-sm font-semibold hover:bg-black transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('nav_leads')}</span>
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-ink-900 px-4 py-2 rounded-button text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{t('nav_reports')}</span>
          </Link>
        </div>
      </div>

      {/* CREAM PANEL COMPONENT — KPI ROW */}
      <div className="w-full bg-cream-100 rounded-panel p-6 sm:p-8 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[17px] font-semibold text-ink-900">
              {isManager ? t('dash_kpi_title_manager') : t('dash_kpi_title_rep')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isManager
                ? t('dash_kpi_sub_manager')
                : t('dash_kpi_sub_rep')}
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-white border border-gray-200 rounded-full text-ink-900">
            {t('dash_live_feed')}
          </span>
        </div>

        {/* 4 KPI Cards inside Cream Panel */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Open Leads & Pipeline Value */}
          <div className="bg-white rounded-card p-5 border border-gray-200 flex flex-col justify-between min-h-[148px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {isManager ? t('dash_open_leads') : t('dash_my_open_leads')}
            </span>
            {isLoading ? (
              <div className="my-3 space-y-2 animate-pulse">
                <div className="h-8 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-32 bg-gray-50 rounded" />
              </div>
            ) : (
              <div className="my-3">
                <div className="text-[34px] font-extrabold text-ink-900 leading-none">
                  {openLeads.length}
                </div>
                <p className="text-xs font-medium text-gray-500 mt-2">
                  {openPipelineValue.toLocaleString()} SAR
                </p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>{t('report_pipeline_value')}</span>
              <Target className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          {/* KPI 2: Conversion Rate */}
          <div className="bg-white rounded-card p-5 border border-gray-200 flex flex-col justify-between min-h-[148px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {t('dash_won_ratio')}
            </span>
            {isLoading ? (
              <div className="my-3 space-y-2 animate-pulse">
                <div className="h-8 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-32 bg-gray-50 rounded" />
              </div>
            ) : (
              <div className="my-3">
                <div className="text-[34px] font-extrabold text-ink-900 leading-none">
                  {conversionRate}%
                </div>
                <p className="text-xs font-medium text-gray-500 mt-2">
                  {wonLeads.length} / {closedCount}
                </p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>{t('dash_won_ratio')}</span>
              <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          {/* KPI 3: Activities Logged Today */}
          <div className="bg-white rounded-card p-5 border border-gray-200 flex flex-col justify-between min-h-[148px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {isManager ? t('dash_activities_today') : t('dash_my_activities_today')}
            </span>
            {isLoading ? (
              <div className="my-3 space-y-2 animate-pulse">
                <div className="h-8 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-32 bg-gray-50 rounded" />
              </div>
            ) : (
              <div className="my-3">
                <div className="text-[34px] font-extrabold text-ink-900 leading-none">
                  {activitiesToday.length}
                </div>
                <p className="text-xs font-medium text-gray-500 mt-2">
                  {activitiesToday.filter((a) => a.activity_type === 'visit').length} {t('dash_site_visits_recorded')}
                </p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>{t('total_touchpoints')}</span>
              <Clock className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          {/* KPI 4: Top Performer (Manager) or Scheduled Follow-ups (Employee) */}
          <div className="bg-white rounded-card p-5 border border-gray-200 flex flex-col justify-between min-h-[148px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {isManager ? t('dash_top_performer') : t('dash_follow_ups_due')}
            </span>
            {isLoading ? (
              <div className="my-3 space-y-2 animate-pulse">
                <div className="h-8 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-32 bg-gray-50 rounded" />
              </div>
            ) : (
              <div className="my-3">
                {isManager ? (
                  <>
                    <div className="text-[20px] font-extrabold text-ink-900 truncate leading-snug">
                      {performers[0]?.name || t('na')}
                    </div>
                    <p className="text-xs font-medium text-gray-500 mt-2">
                      {performers[0]?.dealsWon || 0} {t('dash_deals_won_label')} • {performers[0]?.totalValueWon.toLocaleString() || 0} SAR
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-[34px] font-extrabold text-ink-900 leading-none">
                      {followUpsDue.length}
                    </div>
                    <p className="text-xs font-medium text-gray-500 mt-2">
                      {t('dash_pending_touches')}
                    </p>
                  </>
                )}
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>{isManager ? t('dash_leaderboard') : t('dash_follow_ups_due')}</span>
              <Award className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* LEAD SLA & INACTIVITY ESCALATIONS (MANAGER ONLY) */}
      {isManager && (
        <div className="bg-white rounded-card border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-button bg-surfaceSubtle border border-gray-200 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-ink-900" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-ink-900">
                  {t('dash_sla_title')} ({slaThreshold} {t('field_date')})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('dash_sla_subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  staleLeads.length > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-surfaceSubtle text-ink-900 border-gray-200'
                }`}
              >
                {staleLeads.length} {t('nav_leads')}
              </span>
              <Link
                href="/settings"
                className="text-xs font-semibold text-ink-900 underline hover:text-black ml-1"
              >
                {t('nav_settings')}
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 animate-pulse py-4">
              <div className="h-8 bg-gray-100 rounded w-full" />
              <div className="h-10 bg-gray-50 rounded w-full" />
              <div className="h-10 bg-gray-50 rounded w-full" />
            </div>
          ) : staleLeads.length === 0 ? (
            <div className="py-6 px-4 bg-surfaceSubtle rounded-card border border-gray-200 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div className="text-xs text-gray-600">
                {t('sla_compliant_msg')}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-surfaceSubtle text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4">{t('th_opportunity')}</th>
                    <th className="py-2.5 px-4">{t('representative')}</th>
                    <th className="py-2.5 px-4">{t('th_stage')}</th>
                    <th className="py-2.5 px-4">{t('th_inactivity')}</th>
                    <th className="py-2.5 px-4 text-right">{t('th_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staleLeads.slice(0, 5).map(({ lead, daysInactive, assignedRep }) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-semibold text-ink-900">
                        {lead.company_name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {assignedRep?.full_name || t('unassigned')}
                      </td>
                      <td className="py-3 px-4 font-medium text-ink-900">
                        {formatStatus(lead.status)}
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-900">
                        {daysInactive} {t('field_date')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-ink-900 px-2.5 py-1 bg-surfaceSubtle border border-gray-200 rounded-button hover:bg-gray-100"
                        >
                          <span>{t('review')}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECONDARY ROW: PIPELINE BREAKDOWN & LEADERBOARD / RECENT ACTIVITY */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Stage Distribution */}
        <div className="bg-white rounded-card border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[17px] font-semibold text-ink-900">{t('pipeline_stages_title')}</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-6">{t('pipeline_stages_subtitle')}</p>

            <div className="space-y-3">
              {isLoading ? (
                <div className="space-y-4 animate-pulse py-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-3 w-20 bg-gray-100 rounded" />
                        <div className="h-3 w-10 bg-gray-50 rounded" />
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                (
                  [
                    { key: 'new', label: formatStatus('new'), count: stageCounts.new },
                    { key: 'contacted', label: formatStatus('contacted'), count: stageCounts.contacted },
                    { key: 'qualified', label: formatStatus('qualified'), count: stageCounts.qualified },
                    { key: 'negotiation', label: formatStatus('negotiation'), count: stageCounts.negotiation },
                    { key: 'won', label: formatStatus('won'), count: stageCounts.won },
                    { key: 'lost', label: formatStatus('lost'), count: stageCounts.lost },
                  ] as const
                ).map((stage) => {
                  const total = leads.length || 1;
                  const pct = Math.round((stage.count / total) * 100);

                  return (
                    <div key={stage.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-ink-900">{stage.label}</span>
                        <span className="text-gray-500">
                          {stage.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stage.key === 'won' ? 'bg-ink-900' : 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100">
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900 hover:underline"
            >
              <span>{t('manage_kanban_pipeline')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Top Performers (Manager) or Due Follow-ups (Employee) */}
        {isManager ? (
          <div className="bg-white rounded-card border border-gray-200 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-[17px] font-semibold text-ink-900">{t('dash_leaderboard')}</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-5">{t('dash_leaderboard_subtitle')}</p>

              {isLoading ? (
                <div className="space-y-3 animate-pulse py-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-button bg-gray-100" />
                        <div className="space-y-1">
                          <div className="h-3.5 w-24 bg-gray-100 rounded" />
                          <div className="h-2.5 w-16 bg-gray-50 rounded" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3.5 w-12 bg-gray-100 rounded ml-auto" />
                        <div className="h-2.5 w-16 bg-gray-50 rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : performers.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">{t('team_no_members')}</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {performers.map((emp, idx) => (
                    <div key={emp.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-button bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-ink-900">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink-900">{emp.name}</div>
                          <div className="text-xs text-gray-400">
                            {emp.activitiesCount} {t('total_touchpoints')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-ink-900">{emp.dealsWon} {t('dash_deals_won_label')}</div>
                        <div className="text-[11px] text-gray-500">
                          {emp.totalValueWon.toLocaleString()} SAR
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100">
              <Link
                href="/team"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900 hover:underline"
              >
                <span>{t('view_team_management')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-card border border-gray-200 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-[17px] font-semibold text-ink-900">{t('dash_follow_ups_due')}</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-5">{t('dash_pending_touches')}</p>

              {isLoading ? (
                <div className="space-y-3 animate-pulse py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-3.5 w-32 bg-gray-100 rounded" />
                        <div className="h-2.5 w-24 bg-gray-50 rounded" />
                      </div>
                      <div className="h-6 w-14 bg-gray-100 rounded-button" />
                    </div>
                  ))}
                </div>
              ) : followUpsDue.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-500">{t('sla_compliant_msg')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {followUpsDue.slice(0, 4).map((act) => {
                    const lead = leads.find((l) => l.id === act.related_entity_id);
                    return (
                      <div key={act.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-ink-900">
                            {lead?.company_name || t('field_company_name')}
                          </div>
                          <div className="text-xs text-gray-400">
                            {act.follow_up_date} • {formatActivityType(act.activity_type)}
                          </div>
                        </div>
                        <Link
                          href={act.related_entity_type === 'lead' ? `/leads/${act.related_entity_id}` : `/customers/${act.related_entity_id}`}
                          className="text-xs font-semibold text-ink-900 px-2.5 py-1 bg-surfaceSubtle border border-gray-200 rounded-button hover:bg-gray-100"
                        >
                          {t('field_actions')}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100">
              <Link
                href="/leads"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900 hover:underline"
              >
                <span>{t('view_all_accounts')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Recent Field Activity Feed */}
        <div className="bg-white rounded-card border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[17px] font-semibold text-ink-900">{t('recent_activity_feed')}</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-5">{t('recent_activity_feed_sub')}</p>

            {isLoading ? (
              <div className="space-y-3.5 animate-pulse py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-16 bg-gray-100 rounded" />
                        <div className="h-2.5 w-12 bg-gray-50 rounded" />
                      </div>
                      <div className="h-3 w-3/4 bg-gray-50 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">{t('no_activities_yet')}</p>
            ) : (
              <div className="space-y-3.5">
                {activities.slice(0, 4).map((act) => {
                  const author = profiles[act.employee_id];
                  const timeFormatted = new Date(act.activity_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div key={act.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-ink-900 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink-900">
                            {formatActivityType(act.activity_type)}
                          </span>
                          <span className="text-[11px] text-gray-400">{timeFormatted}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {act.description || t('activity_history')}
                        </p>
                        {isManager && author ? (
                          <span className="text-[10px] text-gray-400">{author.full_name}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900 hover:underline"
            >
              <span>{t('view_full_reports')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
