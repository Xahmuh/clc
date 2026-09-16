'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bell,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save,
  Database,
  Smartphone,
  Globe,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function SettingsPage() {
  const { user, profile, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const supabase = createClient();

  // SLA Threshold State
  const [slaDays, setSlaDays] = useState<number>(7);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Manual Trigger State
  const [isCheckingSla, setIsCheckingSla] = useState(false);
  const [slaResult, setSlaResult] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from('settings') as any)
        .select('value')
        .eq('key', 'lead_sla_inactivity_days')
        .single();

      if (!error && data?.value) {
        setSlaDays(parseInt(data.value, 10));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && isAdmin) {
      loadSettings();
    } else if (!isAuthLoading && !isAdmin) {
      setIsLoading(false);
    }
  }, [isAuthLoading, isAdmin]);

  const handleSaveThreshold = async () => {
    if (slaDays < 1) {
      alert('Threshold must be at least 1 day.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await (supabase.from('settings') as any)
        .upsert({
          key: 'lead_sla_inactivity_days',
          value: slaDays.toString(),
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        });

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving SLA threshold:', err);
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunSlaCheck = async () => {
    setIsCheckingSla(true);
    setSlaResult(null);

    try {
      const res = await fetch('/api/sla/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SLA check failed');

      setSlaResult(data);
    } catch (err: any) {
      console.error('Error running SLA audit:', err);
      alert('Failed to run SLA audit: ' + err.message);
    } finally {
      setIsCheckingSla(false);
    }
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-card border border-gray-200 p-8 text-center">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-[17px] font-semibold text-ink-900">{t('auth_access_restricted')}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('auth_admin_only')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-8 space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('settings_title')}
        </span>
        <h1 className="text-2xl font-bold text-ink-900 mt-1">{t('settings_title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('settings_subtitle')}
        </p>
      </div>

      {/* LANGUAGE SELECTION SETTINGS */}
      <div className="bg-white rounded-card border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-surfaceSubtle border border-gray-200 flex items-center justify-center">
            <Globe className="h-5 w-5 text-ink-900" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-ink-900">{t('settings_language_label')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('settings_language_desc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => setLanguage('en')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-button text-xs font-semibold border transition-all ${
              language === 'en'
                ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-ink-900'
            }`}
          >
            <span>English (EN)</span>
            {language === 'en' && <CheckCircle2 className="h-4 w-4 text-white" />}
          </button>

          <button
            onClick={() => setLanguage('ar')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-button text-xs font-semibold border transition-all ${
              language === 'ar'
                ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-ink-900'
            }`}
          >
            <span>العربية (AR)</span>
            {language === 'ar' && <CheckCircle2 className="h-4 w-4 text-white" />}
          </button>
        </div>
      </div>

      {/* LEAD SLA & AUTO-ESCALATION CONFIGURATION */}
      <div className="bg-white rounded-card border border-gray-200 p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-button bg-surfaceSubtle border border-gray-200 flex items-center justify-center">
              <Clock className="h-5 w-5 text-ink-900" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-ink-900">{t('dash_sla_title')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('settings_sla_desc')}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-surfaceSubtle border border-gray-200 rounded-full text-ink-900">
            {t('active')}
          </span>
        </div>

        <div className="bg-surfaceSubtle rounded-card p-5 border border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="max-w-md">
              <label className="text-xs font-semibold text-ink-900 block">
                {t('settings_sla_label')}
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('dash_sla_subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={slaDays}
                  onChange={(e) => setSlaDays(parseInt(e.target.value, 10) || 1)}
                  className="w-24 bg-white border border-gray-200 rounded-button px-3 py-2 text-sm font-bold text-ink-900 text-center focus:outline-none focus:border-ink-900"
                />
              </div>

              <button
                onClick={handleSaveThreshold}
                disabled={isSaving}
                className="inline-flex items-center gap-2 bg-ink-900 text-white px-4 py-2 rounded-button text-xs font-semibold hover:bg-black transition-colors disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? t('saving') : t('settings_save_button')}</span>
              </button>
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 p-2.5 rounded-button border border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('success')}</span>
            </div>
          )}
        </div>

        {/* MANUAL SLA AUDIT & PUSH NOTIFICATION TRIGGER */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-ink-900 block">
              {t('dash_sla_title')}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('dash_sla_subtitle')}
            </p>
          </div>

          <button
            onClick={handleRunSlaCheck}
            disabled={isCheckingSla}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-ink-900 px-4 py-2 rounded-button text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60 shrink-0"
          >
            <Send className="h-3.5 w-3.5 text-gray-400" />
            <span>{isCheckingSla ? t('loading') : t('confirm')}</span>
          </button>
        </div>

        {/* SLA AUDIT RESULT BANNER */}
        {slaResult && (
          <div className="p-4 rounded-card border border-gray-200 bg-surfaceSubtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Audit Complete
              </span>
              <span className="text-xs text-gray-500">Threshold: {slaResult.threshold_days} days</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-3 rounded-button border border-gray-200">
                <span className="text-gray-400 block">SLA Breached Leads</span>
                <span className="text-lg font-bold text-ink-900">{slaResult.breached_count}</span>
              </div>
              <div className="bg-white p-3 rounded-button border border-gray-200">
                <span className="text-gray-400 block">Push Notifications Sent</span>
                <span className="text-lg font-bold text-ink-900">{slaResult.notifications_sent}</span>
              </div>
            </div>

            {slaResult.leads && slaResult.leads.length > 0 ? (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Flagged Opportunities
                </span>
                {slaResult.leads.slice(0, 3).map((l: any) => (
                  <div key={l.lead_id} className="text-xs text-gray-600 flex justify-between">
                    <span>{l.company_name} ({l.employee_name || 'Unassigned'})</span>
                    <span className="font-semibold text-ink-900">{l.days_inactive} days inactive</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">All active leads are currently within SLA parameters.</p>
            )}
          </div>
        )}
      </div>

      {/* SYSTEM ARCHITECTURE & REGIONAL DATA OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-ink-900">Riyadh Geographic Reference</span>
          </div>
          <div className="text-[28px] font-extrabold text-ink-900">187 Districts</div>
          <p className="text-xs text-gray-500 mt-1">
            Seeded reference coordinates with Euclidean nearest-neighbor spatial RPC.
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-ink-900">Mobile Push Channel</span>
          </div>
          <div className="text-[28px] font-extrabold text-ink-900">Expo Notifications</div>
          <p className="text-xs text-gray-500 mt-1">
            Native device push tokens stored in profiles for field rep dispatch alerts.
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-ink-900">Edge Functions Pipeline</span>
          </div>
          <div className="text-[28px] font-extrabold text-ink-900">2 Functions</div>
          <p className="text-xs text-gray-500 mt-1">
            <code className="font-mono text-[11px]">generate-report</code> & <code className="font-mono text-[11px]">lead-sla-check</code>
          </p>
        </div>
      </div>
    </div>
  );
}
