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

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[calc(100vh-220px)]">
      {COLUMNS.map((col, colIndex) => {
        const columnLeads = leads.filter((l) => l.status === col.status);
        const count = columnLeads.length;

        return (
          <div
            key={col.status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.status)}
            className="w-80 shrink-0 flex flex-col bg-gray-50/50 rounded-panel p-3 border border-gray-200"
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
  );
}
