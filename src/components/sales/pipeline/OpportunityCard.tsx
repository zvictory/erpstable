'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';
import { GripVertical, User, Calendar } from 'lucide-react';

interface OpportunityCardProps {
  opportunity: {
    id: number;
    title: string;
    estimatedValue: number;
    probability: number;
    customer: {
      id: number;
      name: string;
    };
    assignedToUser?: {
      id: number;
      name: string;
    } | null;
    expectedCloseDate?: Date | null;
  };
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const t = useTranslations('crm.pipeline');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate probability color
  const getProbabilityColor = (prob: number) => {
    if (prob >= 75) return 'bg-green-100 text-green-700';
    if (prob >= 50) return 'bg-yellow-100 text-yellow-700';
    if (prob >= 25) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-lg border border-slate-200 p-4 mb-3
        hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
    >
      {/* Drag Handle */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="text-slate-400 hover:text-slate-600 mt-1 touch-none"
          aria-label="Drag to move"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-medium text-slate-900 mb-2 truncate">
            {opportunity.title}
          </h4>

          {/* Customer */}
          <p className="text-sm text-slate-600 mb-3 truncate">
            {opportunity.customer.name}
          </p>

          {/* Value and Probability */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">{t('card.value')}</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(opportunity.estimatedValue)}
              </p>
            </div>
            <div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getProbabilityColor(
                  opportunity.probability
                )}`}
              >
                {opportunity.probability}%
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            {opportunity.assignedToUser && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <User size={12} />
                <span className="truncate">{opportunity.assignedToUser.name}</span>
              </div>
            )}

            {opportunity.expectedCloseDate && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar size={12} />
                <span>
                  {new Date(opportunity.expectedCloseDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
