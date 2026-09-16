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
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import type { Customer, District, Profile, Activity } from '@clc/shared';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { t, formatDistrict } = useLanguage();
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [district, setDistrict] = useState<District | null>(null);
  const [assignedEmployee, setAssignedEmployee] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<(Activity & { employee?: { full_name: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadCustomerData = async () => {
    try {
      // 1. Fetch Customer
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (custError || !custData) {
        console.error('Error fetching customer:', custError);
        setIsLoading(false);
        return;
      }

      const customerRecord = custData as unknown as Customer;
      setCustomer(customerRecord);

      // 2. Fetch District
      if (customerRecord.district_id) {
        const { data: distData } = await supabase
          .from('districts')
          .select('*')
          .eq('id', customerRecord.district_id)
          .single();
        if (distData) setDistrict(distData as District);
      }

      // 3. Fetch Assigned Employee
      if (customerRecord.assigned_to) {
        const { data: empData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', customerRecord.assigned_to)
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
        .eq('related_entity_type', 'customer')
        .eq('related_entity_id', customerId)
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
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-400">
        {t('loading_customers')}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">{t('dir_no_customers_found')}</p>
        <Link
          href="/customers"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('back_to_customers')}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Header */}
      <header className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-200">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-ink-900 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('back_to_customers')}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-card bg-gray-50 border border-gray-200 flex items-center justify-center text-ink-900 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-ink-900 truncate">
                {customer.company_name}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {t('th_customer_since')}: {customer.customer_since} · {t('th_account_manager')}:{' '}
                {assignedEmployee ? assignedEmployee.full_name : t('unassigned')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Edit Customer Button (Always active) */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-ink-900 rounded-button text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
              <span>{t('edit_customer')}</span>
            </button>

            {/* Delete Customer Button (Active only within 24 hours of creation) */}
            {(() => {
              const isWithin24Hours =
                Date.now() - new Date(customer.created_at).getTime() < 24 * 60 * 60 * 1000;

              return isWithin24Hours ? (
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-button text-xs font-semibold hover:bg-red-50 transition-colors"
                  title={t('delete_customer')}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  <span>{t('delete_customer')}</span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-400 rounded-button text-xs font-medium cursor-not-allowed opacity-60"
                  title={t('delete_time_expired')}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-300" />
                  <span className="line-through">{t('delete_customer')}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 overflow-y-auto">
        {/* Account Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-gray-200 p-6 space-y-4">
            <h3 className="text-[15px] font-semibold text-ink-900 pb-3 border-b border-gray-200">
              {t('customer_details')}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 text-gray-500">
                <User className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_contact_person')}</span>
                  <span className="font-medium text-ink-900">
                    {customer.contact_person || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <Phone className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_phone')}</span>
                  <span className="font-medium text-ink-900">
                    {customer.phone || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <Mail className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_email')}</span>
                  <span className="font-medium text-ink-900">
                    {customer.email || t('not_specified')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-500">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-400">{t('field_address')}</span>
                  <span className="font-medium text-ink-900">
                    {customer.address || t('not_specified')}
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
                  <span className="block text-gray-400">{t('th_customer_since')}</span>
                  <span className="font-medium text-ink-900">
                    {customer.customer_since}
                  </span>
                </div>
              </div>

              {customer.converted_from_lead_id && (
                <div className="pt-3 border-t border-gray-200">
                  <span className="block text-xs text-gray-400 mb-1">{t('field_source')}</span>
                  <Link
                    href={`/leads/${customer.converted_from_lead_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900 hover:underline"
                  >
                    <span>{t('view_details')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline
            entityType="customer"
            entityId={customer.id}
            activities={activities}
            onActivityAdded={loadCustomerData}
          />
        </div>
      </main>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        customer={customer}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={loadCustomerData}
      />

      {/* Delete Customer Modal (24h restricted) */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title={customer.company_name}
        createdAt={customer.created_at}
        entityType="customer"
        entityId={customer.id}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleted={() => router.push('/customers')}
      />
    </div>
  );
}
