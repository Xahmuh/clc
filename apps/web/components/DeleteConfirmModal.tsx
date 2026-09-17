'use client';

import React, { useState } from 'react';
import { AlertTriangle, Clock, Trash2, X, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  createdAt: string;
  recordedAt?: string;
  entityType: 'lead' | 'customer';
  entityId: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  createdAt,
  recordedAt,
  entityType,
  entityId,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const { user, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const supabase = createClient();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Use recordedAt (physical creation time) if available, otherwise fallback to createdAt
  const recordTimestamp = recordedAt || createdAt;
  const recordedTime = new Date(recordTimestamp).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - recordedTime);
  const isWithin24h = diffMs < 24 * 60 * 60 * 1000;
  const canDelete = isAdmin || isWithin24h;
  const hoursLeft = Math.max(0, Math.floor((24 * 60 * 60 * 1000 - diffMs) / (60 * 60 * 1000)));
  const minutesLeft = Math.max(0, Math.floor(((24 * 60 * 60 * 1000 - diffMs) % (60 * 60 * 1000)) / (60 * 1000)));

  const handleDelete = async () => {
    if (!canDelete) {
      setError(t('delete_time_expired'));
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      // 1. Delete associated activities first to ensure full cleanup
      await supabase
        .from('activities')
        .delete()
        .eq('related_entity_type', entityType)
        .eq('related_entity_id', entityId);

      // 2. If it is a lead, set converted_from_lead_id to null on any customer referring to it
      if (entityType === 'lead') {
        await supabase
          .from('customers')
          .update({ converted_from_lead_id: null })
          .eq('converted_from_lead_id', entityId);
      }

      // 3. Delete the entity itself from the database
      const tableName = entityType === 'lead' ? 'leads' : 'customers';
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', entityId);

      if (deleteError) throw deleteError;

      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-panel border border-gray-200 w-full max-w-md p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            <h2 className="text-base font-semibold text-ink-900">
              {t('delete_confirm_title')}
            </h2>
          </div>
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

        <div className="mt-4 space-y-3">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-card">
            <span className="block text-xs text-gray-400 mb-0.5">
              {entityType === 'lead' ? t('nav_leads') : t('nav_customers')}
            </span>
            <span className="text-sm font-semibold text-ink-900">{title}</span>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {t('delete_confirm_msg')}
          </p>

          {/* Admin or 24-Hour Rule Indicator */}
          {isAdmin ? (
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-card text-xs text-blue-800">
              <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
              <span>
                {language === 'ar'
                  ? 'بصفتك مدير النظام، يحق لك حذف السجل بشكل كامل في أي وقت.'
                  : 'As an Administrator, you have full permission to delete this record at any time.'}
              </span>
            </div>
          ) : isWithin24h ? (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-card text-xs text-amber-800">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {language === 'ar'
                  ? `الحذف متاح بسبب التسجيل الحديث (متبقي ${hoursLeft} ساعة و ${minutesLeft} دقيقة على انقضاء مهلة الـ 24 ساعة).`
                  : `Deletion is active (remaining ${hoursLeft}h ${minutesLeft}m before 24-hour limit expires).`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-card text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{t('delete_time_expired')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-ink-900 rounded-button transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-button hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? t('saving') : t('delete')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
