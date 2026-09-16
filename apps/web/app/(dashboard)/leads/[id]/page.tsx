'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import type { Lead, LeadStatus, District, Profile, Activity } from '@clc/shared';

const STAGES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'negotiation',
  'won',
  'lost',
];

function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { t, formatDistrict, formatStatus } = useLanguage();
  const supabase = createClient();

  const [lead, setLead] = useState<Lead | null>(null);
  const [district, setDistrict] = useState<District | null>(null);
  const [assignedEmployee, setAssignedEmployee] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<(Activity & { employee?: { full_name: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  const loadLeadData = async () => {
    try {
      // 1. Fetch Lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !leadData) {
        console.error('Error fetching lead:', leadError);
        setIsLoading(false);
        return;
      }

      const leadRecord = leadData as unknown as Lead;
      setLead(leadRecord);

      // 2. Fetch District
      if (leadRecord.district_id) {
        const { data: distData } = await supabase
          .from('districts')
          .select('*')
          .eq('id', leadRecord.district_id)
          .single();
        if (distData) setDistrict(distData as District);
      }

      // 3. Fetch Assigned Employee
      if (leadRecord.assigned_to) {
        const { data: empData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', leadRecord.assigned_to)
          .single();
        if (empData) setAssignedEmployee(empData as Profile);
      }

      // 4. Fetch Activities
      const { data: actData } = await supabase
        .from('activities')
        .select(`
          *,
          employee:profiles(full_name)
        `)
        .eq('related_entity_type', 'lead')
        .eq('related_entity_id', leadId)
        .order('activity_date', { ascending: false });

      if (actData) {
        setActivities(actData as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadLeadData();
    }
  }, [leadId]);

  const handleUpdateStatus = async (newStatus: LeadStatus) => {
    if (!lead) return;
    setLead({ ...lead, status: newStatus });

    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', lead.id);

    if (error) {
      console.error('Failed to update stage:', error);
      loadLeadData();
    }
  };

  // Convert Won lead to Customer per spec Section 1 & Section 3
  const handleConvertToCustomer = async () => {
    if (!lead) return;
    setIsConverting(true);

    try {
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          company_name: lead.company_name,
          contact_person: lead.contact_person,
          phone: lead.phone,
          email: lead.email,
          district_id: lead.district_id,
          converted_from_lead_id: lead.id,
          assigned_to: lead.assigned_to,
          customer_since: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setConvertSuccess(newCustomer.id);
    } catch (err: any) {
      alert('Conversion failed: ' + err.message);
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-400">
        Loading lead details...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">{t('dir_no_leads_found')}</p>
        <Link
          href="/leads"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('back_to_leads')}</span>
        </Link>
      </div>
    );
  }

  const formattedValue = lead.estimated_value
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'SAR',
        maximumFractionDigits: 0,
      }).format(Number(lead.estimated_value))
    : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Detail Header */}
      <header className="px-8 py-5 border-b border-gray-200">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-ink-900 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('back_to_leads')}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-card bg-gray-50 border border-gray-200 flex items-center justify-center text-ink-900">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink-900">
                {lead.company_name}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('field_date')}: {new Date(lead.created_at).toLocaleDateString()} · {t('field_assigned_to')}:{' '}
                {assignedEmployee ? assignedEmployee.full_name : t('unassigned')}
              </p>
            </div>
          </div>

          {/* Action: Convert to Customer if won */}
          {lead.status === 'won' && (
            <div>
              {convertSuccess ? (
                <Link
                  href={`/customers/${convertSuccess}`}
                  className="flex items-center gap-2 px-4 py-2 bg-cream-100 border border-gray-200 text-ink-900 rounded-button text-xs font-semibold hover:bg-gray-100"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>{t('view_all_accounts')}</span>
                </Link>
              ) : (
                <button
                  onClick={handleConvertToCustomer}
                  disabled={isConverting}
                  className="flex items-center gap-2 px-4 py-2 bg-ink-900 text-white rounded-button text-xs font-semibold hover:bg-black transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{isConverting ? t('saving') : t('convert_to_customer')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stage Progression Bar */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between gap-1 overflow-x-auto">
            {STAGES.map((s, idx) => {
              const isCurrent = lead.status === s;
              const isPast = STAGES.indexOf(lead.status) > idx;

              return (
                <button
                  key={s}
                  onClick={() => handleUpdateStatus(s)}
                  className={`flex-1 min-w-[100px] py-2 px-3 text-center text-xs font-medium rounded-button border transition-colors ${
                    isCurrent
                      ? 'bg-ink-900 text-white border-ink-900 font-semibold'
                      : isPast
                      ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      : 'bg-white text-gray-400 border-gray-200 hover:text-ink-900'
                  }`}
                >
                  {formatStatus(s)}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Grid: Info Card + Activity Timeline */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto">
        {/* Left Column: Lead Info Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-gray-200 p-6 space-y-4">
            <h3 className="text-[15px] font-semibold text-ink-900 pb-3 border-b border-gray-200">
              {t('lead_details')}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 text-gray-500">
                <User className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_contact_person')}</span>
                  <span className="font-medium text-ink-900">
                    {lead.contact_person || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <Phone className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_phone')}</span>
                  <span className="font-medium text-ink-900">
                    {lead.phone || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <Mail className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_email')}</span>
                  <span className="font-medium text-ink-900">
                    {lead.email || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <DollarSign className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_estimated_value')}</span>
                  <span className="font-semibold text-ink-900 text-sm">
                    {formattedValue || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <Tag className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_project_type')}</span>
                  <span className="font-medium text-ink-900 capitalize">
                    {lead.project_type || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_district')}</span>
                  <span className="font-medium text-ink-900">
                    {district ? formatDistrict(district) : t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <Calendar className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_source')}</span>
                  <span className="font-medium text-ink-900 capitalize">
                    {lead.source || t('not_specified')}
                  </span>
                </div>
              </div>
            </div>

            {lead.notes && (
              <div className="pt-3 border-t border-gray-200">
                <span className="block text-xs text-gray-400 mb-1">{t('field_notes')}</span>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {lead.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity History & Quick Logger */}
        <div className="lg:col-span-2">
          <ActivityTimeline
            entityType="lead"
            entityId={lead.id}
            activities={activities}
            onActivityAdded={loadLeadData}
          />
        </div>
      </main>
    </div>
  );
}

export default LeadDetailPage;
