'use client';

import React, { useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CustomSelect } from './ui/CustomSelect';
import type { Lead, Profile } from '@clc/shared';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  employees: Profile[];
  onReassigned: () => void;
}

export function ReassignModal({
  isOpen,
  onClose,
  leads,
  employees,
  onReassigned,
}: ReassignModalProps) {
  const supabase = createClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || '');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(employees[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !targetEmployeeId) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ assigned_to: targetEmployeeId })
        .eq('id', selectedLeadId);

      if (updateError) throw updateError;

      onReassigned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reassign lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-panel border border-gray-200 w-full max-w-md p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-ink-900" />
            <h2 className="text-lg font-semibold text-ink-900">Reassign lead</h2>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Select lead to transfer
            </label>
            <CustomSelect
              value={selectedLeadId}
              onChange={(val) => setSelectedLeadId(val)}
              options={leads.map((l) => ({
                value: l.id,
                label: l.company_name,
                sublabel: l.status,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Assign to new employee
            </label>
            <CustomSelect
              value={targetEmployeeId}
              onChange={(val) => setTargetEmployeeId(val)}
              options={employees.map((emp) => ({
                value: emp.id,
                label: emp.full_name,
                sublabel: emp.role,
              }))}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-ink-900 rounded-button transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedLeadId || !targetEmployeeId}
              className="px-5 py-2 text-sm font-medium bg-ink-900 text-white rounded-button hover:bg-black transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Transferring...' : 'Transfer lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
