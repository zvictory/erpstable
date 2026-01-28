'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { OpportunityCard } from './OpportunityCard';
import { formatCurrency } from '@/lib/format';

interface Opportunity {
  id: number;
  title: string;
  estimatedValue: number;
  probability: number;
  stage: string;
  customer: {
    id: number;
    name: string;
  };
  assignedToUser?: {
    id: number;
    name: string;
  } | null;
  expectedCloseDate?: Date | null;
}

interface KanbanColumnProps {
  stage: string;
  title: string;
  opportunities: Opportunity[];
}

export function KanbanColumn({ stage, title, opportunities }: KanbanColumnProps) {
  const t = useTranslations('crm.pipeline');
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  // Calculate column total
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0);

  // Get stage color
  const getStageColor = (stageName: string) => {
    switch (stageName) {
      case 'LEAD':
        return 'bg-slate-100 border-slate-300';
      case 'QUALIFIED':
        return 'bg-blue-50 border-blue-300';
      case 'PROPOSAL':
        return 'bg-purple-50 border-purple-300';
      case 'NEGOTIATION':
        return 'bg-orange-50 border-orange-300';
      case 'CLOSED_WON':
        return 'bg-green-50 border-green-300';
      case 'CLOSED_LOST':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-slate-100 border-slate-300';
    }
  };

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px]">
      {/* Column Header */}
      <div
        className={`rounded-t-lg border-2 p-4 ${getStageColor(stage)}`}
      >
        <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {t('column_header.count', { count: opportunities.length })}
          </span>
          <span className="font-medium text-slate-900">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 bg-slate-50 border-x-2 border-b-2 rounded-b-lg p-3 min-h-[500px]
          ${isOver ? 'bg-blue-50 border-blue-300' : getStageColor(stage)}
          transition-colors
        `}
      >
        <SortableContext
          items={opportunities.map(o => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.length === 0 ? (
            <div className="text-center text-slate-400 text-sm mt-4">
              {t('common.no_data')}
            </div>
          ) : (
            opportunities.map(opportunity => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
