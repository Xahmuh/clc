'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { CustomSelect } from './ui/CustomSelect';
import type { District, LeadStatus, Profile } from '@clc/shared';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const { user, isAdmin, isManager } = useAuth();
  const { t, formatDistrict, formatRole } = useLanguage();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('referral');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [projectType, setProjectType] = useState('');
  const [districtId, setDistrictId] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [registrationDate, setRegistrationDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [districts, setDistricts] = useState<District[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load districts
    const loadDistricts = async () => {
      const { data } = await supabase
        .from('districts')
        .select('*')
        .order('name_en');
      if (data) setDistricts(data as District[]);
    };

    // Load employees for assignment if admin
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

    if (user && !assignedTo) {
      setAssignedTo(user.id);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const targetAssignedTo = isManager ? assignedTo || user?.id : user?.id;
      const customCreatedAt = registrationDate
        ? new Date(registrationDate + 'T12:00:00Z').toISOString()
        : new Date().toISOString();

      const { error: insertError } = await supabase.from('leads').insert({
        company_name: companyName.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        source: source.trim() || null,
        status,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        project_type: projectType.trim() || null,
        district_id: districtId ? Number(districtId) : null,
        assigned_to: targetAssignedTo || null,
        notes: notes.trim() || null,
        created_at: customCreatedAt,
      });

      if (insertError) {
        throw insertError;
      }

      // Reset form
      setCompanyName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setEstimatedValue('');
      setProjectType('');
      setNotes('');
      setRegistrationDate(new Date().toISOString().split('T')[0]);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-panel border border-gray-200 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-ink-900">{t('dir_add_lead')}</h2>
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
              placeholder="e.g. Al-Falak Contracting"
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
                placeholder="e.g. Ahmad Saleh"
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
                placeholder="05XXXXXXXX"
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
                placeholder="name@company.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_estimated_value')}
              </label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="500000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_project_type')}
              </label>
              <input
                type="text"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder="Residential, Commercial..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('field_source')}
              </label>
              <CustomSelect
                value={source}
                onChange={(val) => setSource(val)}
                options={[
                  { value: 'referral', label: 'Referral' },
                  { value: 'cold call', label: 'Cold Call' },
                  { value: 'website', label: 'Website' },
                  { value: 'exhibition', label: 'Exhibition' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t('field_registration_date')}
            </label>
            <input
              type="date"
              value={registrationDate}
              onChange={(e) => setRegistrationDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900 bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {t('backdated_date_hint')}
            </p>
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

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t('field_notes')}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial project scope, requirements, or client background..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900 resize-none"
            />
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
              {isSubmitting ? t('saving') : t('dir_add_lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
