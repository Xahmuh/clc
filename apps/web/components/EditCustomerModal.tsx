'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { CustomSelect } from './ui/CustomSelect';
import type { Customer, District, Profile } from '@clc/shared';

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditCustomerModal({
  isOpen,
  customer,
  onClose,
  onUpdated,
}: EditCustomerModalProps) {
  const { isManager } = useAuth();
  const { t, formatDistrict, formatRole } = useLanguage();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState(customer.company_name || '');
  const [contactPerson, setContactPerson] = useState(customer.contact_person || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [email, setEmail] = useState(customer.email || '');
  const [address, setAddress] = useState(customer.address || '');
  const [districtId, setDistrictId] = useState<number | ''>(customer.district_id || '');
  const [assignedTo, setAssignedTo] = useState<string>(customer.assigned_to || '');

  const [districts, setDistricts] = useState<District[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when customer changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCompanyName(customer.company_name || '');
      setContactPerson(customer.contact_person || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setDistrictId(customer.district_id || '');
      setAssignedTo(customer.assigned_to || '');
      setError(null);
    }
  }, [isOpen, customer]);

  useEffect(() => {
    if (!isOpen) return;

    const loadDistricts = async () => {
      const { data } = await supabase.from('districts').select('*').order('name_en');
      if (data) setDistricts(data as District[]);
    };

    const loadEmployees = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (data) setEmployees(data as Profile[]);
    };

    loadDistricts();
    loadEmployees();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const updates: any = {
        company_name: companyName.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        district_id: districtId ? Number(districtId) : null,
      };

      if (isManager && assignedTo) {
        updates.assigned_to = assignedTo;
      }

      const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customer.id);

      if (updateError) throw updateError;

      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-panel border border-gray-200 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-ink-900">{t('edit_customer')}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-button text-gray-400 hover:text-ink-900 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-card text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t('field_company_name')} *
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_contact_person')}
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_address')}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_district')}
              </label>
              <CustomSelect
                value={districtId}
                onChange={(val) => setDistrictId(val ? Number(val) : '')}
                placeholder={`${t('select_district')}...`}
                searchable={true}
                options={[
                  { value: '', label: `${t('select_district')}...` },
                  ...districts.map((d) => ({
                    value: d.id,
                    label: formatDistrict(d),
                  })),
                ]}
              />
            </div>

            {isManager && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t('field_assigned_to')}
                </label>
                <CustomSelect
                  value={assignedTo}
                  onChange={(val) => setAssignedTo(val)}
                  options={employees.map((emp) => ({
                    value: emp.id,
                    label: emp.full_name,
                    sublabel: formatRole(emp.role),
                  }))}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-ink-900 rounded-button transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium bg-ink-900 text-white rounded-button hover:bg-black transition-colors disabled:opacity-50"
            >
              {isSubmitting ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
