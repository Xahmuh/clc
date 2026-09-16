'use client';

import React, { useState } from 'react';
import { LeadCard } from './LeadCard';
import { useLanguage } from '@/lib/language-context';
import type { Lead, LeadStatus } from '@clc/shared';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
}

const COLUMNS: { status: LeadStatus }[] = [
  { status: 'new' },
  { status: 'contacted' },
  { status: 'qualified' },
  { status: 'negotiation' },
  { status: 'won' },
  { status: 'lost' },
];

export function KanbanBoard({ leads, onStatusChange }: KanbanBoardProps) {
  const { t, formatStatus } = useLanguage();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [selectedMobileStage, setSelectedMobileStage] = useState<string>('all');

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLeadId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      await onStatusChange(leadId, targetStatus);
    }
    setDraggedLeadId(null);
  };

  const activeColumns = COLUMNS.filter((col) => {
    if (selectedMobileStage === 'all') return true;
    return col.status === selectedMobileStage;
  });

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Mobile Stage Selector Tabs (visible on < md) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 px-1 scrollbar-none">
        <button
          onClick={() => setSelectedMobileStage('all')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            selectedMobileStage === 'all'
              ? 'bg-ink-900 text-white border-ink-900'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <span>{t('all')}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            selectedMobileStage === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {leads.length}
          </span>
        </button>

        {COLUMNS.map((col) => {
          const count = leads.filter((l) => l.status === col.status).length;
          const isSelected = selectedMobileStage === col.status;
          return (
            <button
              key={col.status}
              onClick={() => setSelectedMobileStage(col.status)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isSelected
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{formatStatus(col.status)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[calc(100vh-250px)]">
        {activeColumns.map((col) => {
          const colIndex = COLUMNS.findIndex((c) => c.status === col.status);
          const columnLeads = leads.filter((l) => l.status === col.status);
          const count = columnLeads.length;

          return (
            <div
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`${
                selectedMobileStage !== 'all' ? 'w-full md:w-80' : 'w-72 sm:w-80'
              } shrink-0 flex flex-col bg-gray-50/50 rounded-panel p-3 border border-gray-200`}
            >
            {/* Column Header with Pill Count Badge */}
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <h2 className="text-[15px] font-semibold text-ink-900">
                {formatStatus(col.status)}
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold bg-white border border-gray-200 rounded-full text-gray-500">
                {count}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
              {columnLeads.map((lead) => {
                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className="cursor-grab active:cursor-grabbing relative group"
                  >
                    <LeadCard lead={lead} featured={true} onStatusChange={onStatusChange} />

                    {/* Quick Move stage buttons visible on hover for accessible navigation */}
                    <div className="absolute top-2 right-9 hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-button p-0.5 z-10 shadow-sm">
                      {colIndex > 0 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onStatusChange(lead.id, COLUMNS[colIndex - 1].status);
                          }}
                          title={formatStatus(COLUMNS[colIndex - 1].status)}
                          className="p-1 hover:bg-zinc-800 rounded text-gray-300 hover:text-white transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {colIndex < COLUMNS.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onStatusChange(lead.id, COLUMNS[colIndex + 1].status);
                          }}
                          title={formatStatus(COLUMNS[colIndex + 1].status)}
                          className="p-1 hover:bg-zinc-800 rounded text-gray-300 hover:text-white transition-colors"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {columnLeads.length === 0 && (
                <div className="h-28 border-2 border-dashed border-gray-200 rounded-card flex items-center justify-center text-xs text-gray-400">
                  {formatStatus(col.status)} — 0
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
