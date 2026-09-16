'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Kanban as KanbanIcon,
  List as ListIcon,
  Plus,
  Search,
  Building2,
  Calendar,
  Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { KanbanBoard } from '@/components/KanbanBoard';
import { CreateLeadModal } from '@/components/CreateLeadModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Lead, LeadStatus, District, Profile } from '@clc/shared';

export default function LeadsPage() {
  const { isManager } = useAuth();
  const { t, formatDistrict, formatStatus, formatRole } = useLanguage();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [districts, setDistricts] = useState<Record<number, District>>({});
  const [employees, setEmployees] = useState<Record<string, Profile>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [executiveFilter, setExecutiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Load Leads (RLS will automatically filter to own leads for employees, all for admins)
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!leadsError && leadsData) {
        setLeads(leadsData as Lead[]);
      }

      // 2. Load Districts map
      const { data: distData } = await supabase.from('districts').select('*');
      if (distData) {
        const dMap: Record<number, District> = {};
        ((distData as unknown as District[]) || []).forEach((d) => {
          dMap[d.id] = d;
        });
        setDistricts(dMap);
      }

      // 3. Load Profiles map
      const { data: profData } = await supabase.from('profiles').select('*');
      if (profData) {
        const pMap: Record<string, Profile> = {};
        ((profData as unknown as Profile[]) || []).forEach((p) => {
          pMap[p.id] = p;
        });
        setEmployees(pMap);
      }
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) {
        console.error('Failed to update lead status:', error);
        loadData(); // Revert on failure
      }
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.contact_person &&
        lead.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.notes && lead.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || lead.status === statusFilter;

    const matchesExecutive =
      executiveFilter === 'all' || lead.assigned_to === executiveFilter;

    return matchesSearch && matchesStatus && matchesExecutive;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Top Header & Actions Bar */}
      <header className="px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
              {t('nav_leads')}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('dash_company_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Toggle */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-button border border-gray-200">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium transition-colors ${
                  view === 'kanban'
                    ? 'bg-white text-ink-900 border border-gray-200'
                    : 'text-gray-500 hover:text-ink-900'
                }`}
              >
                <KanbanIcon className="h-3.5 w-3.5" />
                <span>{t('dir_kanban_view')}</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-white text-ink-900 border border-gray-200'
                    : 'text-gray-500 hover:text-ink-900'
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span>{t('dir_list_view')}</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ink-900 text-white rounded-button text-xs font-semibold hover:bg-black transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{t('dir_add_lead')}</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Row */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dir_search_leads')}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-button text-ink-900 placeholder:text-gray-400 focus:outline-none focus:border-ink-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isManager && (
              <CustomSelect
                value={executiveFilter}
                onChange={(val) => setExecutiveFilter(val)}
                size="sm"
                fullWidth={false}
                className="min-w-[170px]"
                options={[
                  { value: 'all', label: t('filter_all_executives') },
                  ...Object.values(employees).map((emp) => ({
                    value: emp.id,
                    label: emp.full_name,
                    sublabel: formatRole(emp.role),
                  })),
                ]}
              />
            )}

            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              size="sm"
              fullWidth={false}
              className="min-w-[140px]"
              options={[
                { value: 'all', label: t('all_statuses') },
                { value: 'new', label: t('status_new') },
                { value: 'contacted', label: t('status_contacted') },
                { value: 'qualified', label: t('status_qualified') },
                { value: 'negotiation', label: t('status_negotiation') },
                { value: 'won', label: t('status_won') },
                { value: 'lost', label: t('status_lost') },
              ]}
            />
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400">
            Loading leads...
          </div>
        ) : view === 'kanban' ? (
          <KanbanBoard
            leads={filteredLeads}
            onStatusChange={handleStatusChange}
          />
        ) : (
          /* Table List View */
          <div className="bg-white rounded-panel border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">{t('field_company_name')}</th>
                  <th className="py-3 px-4">{t('field_contact_person')}</th>
                  <th className="py-3 px-4">{t('field_status')}</th>
                  <th className="py-3 px-4">{t('field_value_sar')}</th>
                  <th className="py-3 px-4">{t('field_district')}</th>
                  <th className="py-3 px-4">{t('field_assigned_to')}</th>
                  <th className="py-3 px-4">{t('field_date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => {
                  const district = lead.district_id ? districts[lead.district_id] : null;
                  const employee = lead.assigned_to ? employees[lead.assigned_to] : null;
                  const formattedValue = lead.estimated_value
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'SAR',
                        maximumFractionDigits: 0,
                      }).format(Number(lead.estimated_value))
                    : '—';

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 font-semibold text-ink-900">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          <span>{lead.company_name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {lead.contact_person || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize bg-gray-100 text-ink-900 border border-gray-200">
                          {formatStatus(lead.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-ink-900">
                        {formattedValue}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {district ? formatDistrict(district) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {employee ? employee.full_name : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}

                {filteredLeads.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-xs text-gray-400"
                    >
                      {t('dir_no_leads_found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal Dialog */}
      <CreateLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
}
