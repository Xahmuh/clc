'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Mail,
  Phone,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Activity, ActivityType, RelatedEntity } from '@clc/shared';

interface ActivityTimelineProps {
  entityType: RelatedEntity;
  entityId: string;
  activities: (Activity & { employee?: { full_name: string } })[];
  onActivityAdded: () => void;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  visit: MapPin,
  email: Mail,
  call: Phone,
  meeting: Users,
  other: FileText,
};

export function ActivityTimeline({
  entityType,
  entityId,
  activities,
  onActivityAdded,
}: ActivityTimelineProps) {
  const { user } = useAuth();
  const { t, formatActivityType } = useLanguage();
  const supabase = createClient();

  const [type, setType] = useState<ActivityType>('visit');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    if (!user) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase.from('activities').insert({
        employee_id: user.id,
        related_entity_type: entityType,
        related_entity_id: entityId,
        activity_type: type,
        description: description.trim(),
        outcome: outcome.trim() || null,
        follow_up_date: followUpDate || null,
      });

      if (insertError) throw insertError;

      setDescription('');
      setOutcome('');
      setFollowUpDate('');
      onActivityAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to log activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Log Box */}
      <div className="bg-white rounded-card border border-gray-200 p-5">
        <h3 className="text-[15px] font-semibold text-ink-900 mb-3">
          {t('log_new_activity')}
        </h3>

        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Activity Type Selector */}
          <div className="flex flex-wrap gap-2">
            {(['visit', 'call', 'email', 'meeting', 'other'] as ActivityType[]).map((tType) => {
              const Icon = ACTIVITY_ICONS[tType];
              const isSelected = type === tType;

              return (
                <button
                  key={tType}
                  type="button"
                  onClick={() => setType(tType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-ink-900 text-white'
                      : 'bg-gray-50 text-gray-500 hover:text-ink-900 border border-gray-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{formatActivityType(tType)}</span>
                </button>
              );
            })}
          </div>

          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('activity_desc_placeholder')}
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:border-ink-900 resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder={t('activity_outcome_placeholder')}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-button focus:outline-none focus:border-ink-900"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">{t('follow_up_date')}:</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-button focus:outline-none focus:border-ink-900 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-ink-900 text-white rounded-button hover:bg-black transition-colors disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              <span>{isSubmitting ? t('logging_activity') : t('log_activity_submit')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Activities Timeline Feed */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t('activity_history')} ({activities.length})
        </h4>

        {activities.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 rounded-card border border-dashed border-gray-200 text-xs text-gray-400">
            {t('no_activities_yet')}
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {activities.map((act) => {
              const Icon = ACTIVITY_ICONS[act.activity_type] || FileText;
              const formattedDate = new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(act.activity_date));

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-ink-900">
                    <Icon className="h-2.5 w-2.5" />
                  </div>

                  <div className="bg-white rounded-card border border-gray-200 p-4 transition-colors group-hover:border-gray-300">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900">
                          {formatActivityType(act.activity_type)}
                        </span>
                        {act.employee?.full_name && (
                          <span>• {act.employee.full_name}</span>
                        )}
                      </div>
                      <span className="text-gray-400">{formattedDate}</span>
                    </div>

                    <p className="text-sm text-ink-900 leading-relaxed">
                      {act.description}
                    </p>

                    {act.outcome && (
                      <div className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-100 text-gray-600">
                        <strong className="text-ink-900 font-medium">Outcome:</strong>{' '}
                        {act.outcome}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
                      {act.latitude && act.longitude && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin className="h-3 w-3 text-online" />
                          <span>
                            GPS: {Number(act.latitude).toFixed(4)}, {Number(act.longitude).toFixed(4)}
                          </span>
                        </div>
                      )}

                      {act.follow_up_date && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Follow-up: {act.follow_up_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
