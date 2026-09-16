'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical, Calendar, Building2, Eye, Trophy, XCircle } from 'lucide-react';
import { DropdownMenu } from './ui/DropdownMenu';
import { useLanguage } from '@/lib/language-context';
import type { Lead } from '@clc/shared';

interface LeadCardProps {
  lead: Lead & { follow_up_date?: string | null };
  featured?: boolean;
  onStatusChange?: (leadId: string, newStatus: Lead['status']) => void;
}

export function LeadCard({ lead, featured = true, onStatusChange }: LeadCardProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const menuItems = [
    {
      label: t('view_details') || 'View Details',
      icon: <Eye className="h-3.5 w-3.5" />,
      onClick: () => router.push(`/leads/${lead.id}`),
    },
    ...(onStatusChange
      ? [
          { divider: true as const, label: '', onClick: () => {} },
          {
            label: `${t('status_won') || 'Won'}`,
            icon: <Trophy className="h-3.5 w-3.5 text-green-500" />,
            onClick: () => onStatusChange(lead.id, 'won'),
          },
          {
            label: `${t('status_lost') || 'Lost'}`,
            icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
            onClick: () => onStatusChange(lead.id, 'lost'),
            danger: true,
          },
        ]
      : []),
  ];

  const formattedValue = lead.estimated_value
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'SAR',
        maximumFractionDigits: 0,
      }).format(Number(lead.estimated_value))
    : null;

  return (
    <Link href={`/leads/${lead.id}`} className="block group">
      <div
        className={`rounded-card border p-5 transition-all duration-150 ${
          featured
            ? 'bg-ink-900 text-white border-zinc-800 shadow-sm group-hover:bg-black group-hover:border-zinc-700'
            : 'bg-white text-ink-900 border-gray-200 shadow-sm group-hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug line-clamp-1 flex-1">
            {lead.company_name}
          </h3>
          <DropdownMenu
            trigger={
              <button
                type="button"
                className={`p-1 -mr-1 -mt-1 rounded-button transition-colors ${
                  featured
                    ? 'text-gray-400 hover:text-white hover:bg-zinc-800'
                    : 'text-gray-400 hover:text-ink-900 hover:bg-gray-100'
                }`}
                title="Options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            }
            items={menuItems}
            align="right"
          />
        </div>

        {lead.contact_person && (
          <p
            className={`mt-1 text-xs ${
              featured ? 'text-gray-400' : 'text-gray-400'
            }`}
          >
            {lead.contact_person}
          </p>
        )}

        <p
          className={`mt-2 text-sm line-clamp-2 ${
            featured ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {lead.notes || t('no_notes')}
        </p>

        <div
          className={`mt-4 pt-3 flex items-center justify-between gap-2 text-xs ${
            featured ? 'border-t border-zinc-800' : 'border-t border-gray-100'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 ${
              featured ? 'text-gray-400' : 'text-gray-400'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{lead.follow_up_date ?? t('no_due_date')}</span>
          </div>

          {formattedValue && (
            <span
              className={`font-semibold ${
                featured ? 'text-white' : 'text-ink-900'
              }`}
            >
              {formattedValue}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
