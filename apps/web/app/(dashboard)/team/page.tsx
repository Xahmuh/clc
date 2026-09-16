'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  UserCheck,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { ReassignModal } from '@/components/ReassignModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import type { Profile, Lead, UserRole } from '@clc/shared';

export default function TeamPage() {
  const { profile, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { t, formatRole } = useLanguage();
  const supabase = createClient();

  const [team, setTeam] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  // New Employee Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPass: string; fullName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTeamData = async () => {
    setIsLoading(true);
    try {
      // Load all profiles
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('role')
        .order('full_name');

      if (!profError && profData) {
        setTeam(profData as Profile[]);
      }

      // Load all leads for reassignment options
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('company_name');

      if (leadsData) {
        setLeads(leadsData as Lead[]);
      }
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && isAdmin) {
      loadTeamData();
    } else if (!isAuthLoading && !isAdmin) {
      setIsLoading(false);
    }
  }, [isAuthLoading, isAdmin]);

  // Toggle active / inactive status
  const handleToggleActive = async (targetUser: Profile) => {
    const updatedStatus = !targetUser.is_active;

    setTeam((prev) =>
      prev.map((m) =>
        m.id === targetUser.id ? { ...m, is_active: updatedStatus } : m
      )
    );

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: updatedStatus })
      .eq('id', targetUser.id);

    if (error) {
      console.error('Failed to update active status:', error);
      loadTeamData();
    }
  };

  // Change employee role
  const handleRoleChange = async (targetUser: Profile, updatedRole: UserRole) => {
    setTeam((prev) =>
      prev.map((m) =>
        m.id === targetUser.id ? { ...m, role: updatedRole } : m
      )
    );

    const { error } = await supabase
      .from('profiles')
      .update({ role: updatedRole })
      .eq('id', targetUser.id);

    if (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role: ' + error.message);
      loadTeamData();
    }
  };

  // Add Employee via Supabase Admin API endpoint (bypasses email rate limits & marks email_confirm = true)
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/team/create-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || null,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      setCreatedCredentials({
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        tempPass: data.tempPassword,
      });

      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewRole('employee');
      loadTeamData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-400">
        {t('loading')}
      </div>
    );
  }

  // Access Control Guard
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-16 text-center">
        <div className="inline-flex h-12 w-12 rounded-full bg-red-50 text-red-500 items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink-900">{t('auth_access_restricted')}</h2>
        <p className="text-xs text-gray-500 mt-2">
          {t('auth_admin_only')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Header */}
      <header className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-ink-900" />
              <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
                {t('team_title')}
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('team_subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsReassignOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-ink-900 rounded-button text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              <UserCheck className="h-4 w-4" />
              <span>{t('team_reassign_leads')}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-ink-900 text-white rounded-button text-xs font-semibold hover:bg-black transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>{t('team_add_employee')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Team Table */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="bg-white rounded-panel border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-start">{t('team_member')}</th>
                  <th className="py-3 px-4 text-start">{t('field_role')}</th>
                  <th className="py-3 px-4 text-start">{t('team_contact')}</th>
                  <th className="py-3 px-4 text-start">{t('team_status')}</th>
                  <th className="py-3 px-4 text-start">{t('team_joined_date')}</th>
                  <th className="py-3 px-4 text-end">{t('field_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {team.map((member) => {
                  const isSelf = member.id === profile?.id;

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-cream-100 border border-gray-200 flex items-center justify-center font-semibold text-ink-900 text-xs">
                          {member.full_name?.substring(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900">
                            {member.full_name} {isSelf && <span className="text-gray-400 font-normal">({t('you')})</span>}
                          </p>
                          <p className="text-gray-400 text-[11px]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isAdmin && !isSelf ? (
                        <CustomSelect
                          value={member.role}
                          onChange={(val) => handleRoleChange(member, val as UserRole)}
                          variant="badge"
                          badgeStyle={
                            member.role === 'admin'
                              ? 'bg-ink-900 text-white border border-ink-900'
                              : member.role === 'supervisor'
                              ? 'bg-cream-100 text-ink-900 border border-gray-300 font-bold'
                              : 'bg-gray-100 text-ink-900 border border-gray-200'
                          }
                          fullWidth={false}
                          className="w-auto inline-block"
                          options={[
                            { value: 'employee', label: formatRole('employee') },
                            { value: 'supervisor', label: formatRole('supervisor') },
                            { value: 'admin', label: formatRole('admin') },
                          ]}
                        />
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            member.role === 'admin'
                              ? 'bg-ink-900 text-white'
                              : member.role === 'supervisor'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-gray-100 text-ink-900 border border-gray-200'
                          }`}
                        >
                          {formatRole(member.role)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {member.phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          member.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.is_active ? 'bg-online' : 'bg-gray-400'
                          }`}
                        />
                        <span>{member.is_active ? t('active') : t('inactive')}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleActive(member)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-button border transition-colors ${
                            member.is_active
                              ? 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-600'
                              : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {member.is_active ? t('team_deactivate') : t('team_activate')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {team.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                    {t('team_no_members')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-panel border border-gray-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-ink-900">{t('team_add_employee')}</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-button text-gray-400 hover:text-ink-900 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-card text-xs text-red-600">
                {formError}
              </div>
            )}

            {createdCredentials ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-card flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-green-900">
                      {t('success')}! {t('team_member')} created successfully
                    </p>
                    <p className="text-xs text-green-700">
                      Account is active and ready to log in. Please copy the credentials and share them with the employee.
                    </p>
                  </div>
                </div>

                <div className="bg-surfaceSubtle border border-gray-200 rounded-card p-4 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                      {t('field_contact_person')}
                    </span>
                    <span className="text-sm font-bold text-ink-900">{createdCredentials.fullName}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                      {t('field_email')}
                    </span>
                    <span className="text-sm font-bold text-ink-900 select-all font-mono">{createdCredentials.email}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                      {t('auth_password')} ({t('active')})
                    </span>
                    <span className="text-sm font-mono font-extrabold text-ink-900 select-all bg-white px-2.5 py-1.5 rounded border border-gray-200 block mt-1">
                      {createdCredentials.tempPass}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy = `CLC CRM Login:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.tempPass}\nURL: https://clc-crm.vercel.app/login`;
                      navigator.clipboard.writeText(textToCopy);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-ink-900 text-white rounded-button text-xs font-semibold hover:bg-black transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-400" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Login Credentials</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreatedCredentials(null)}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-button text-xs font-semibold text-ink-900 hover:bg-gray-50 transition-colors"
                  >
                    + Add Another
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedCredentials(null);
                      setIsAddModalOpen(false);
                    }}
                    className="text-xs text-gray-500 hover:text-ink-900 underline font-medium"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddEmployee} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t('field_contact_person')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Faisal Al-Saud"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t('field_email')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="faisal@clc.com.sa"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t('field_phone')}
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t('field_role')}
                  </label>
                  <CustomSelect
                    value={newRole}
                    onChange={(val) => setNewRole(val as UserRole)}
                    options={[
                      { value: 'employee', label: formatRole('employee') },
                      { value: 'supervisor', label: formatRole('supervisor') },
                      { value: 'admin', label: formatRole('admin') },
                    ]}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-ink-900 rounded-button"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm font-medium bg-ink-900 text-white rounded-button hover:bg-black disabled:opacity-50"
                  >
                    {isSubmitting ? t('saving') : t('team_add_employee')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      <ReassignModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        leads={leads}
        employees={team}
        onReassigned={loadTeamData}
      />
    </div>
  );
}
