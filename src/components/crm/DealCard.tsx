'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { Clock, Flame, User, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

interface Deal {
    id: number;
    title: string;
    value: number;
    currency_code: string;
    stage: string;
    customer?: {
        name: string;
    };
    owner?: {
        name: string;
        email?: string; // used for avatar
    } | null; // Allow null
    probability: number;
    updatedAt: Date | string;
}

interface DealCardProps {
    deal: Deal;
    index: number;
}

export default function DealCard({ deal, index }: DealCardProps) {
    const t = useTranslations('crm_board');

    const daysInStage = differenceInDays(new Date(), new Date(deal.updatedAt));
    const isStagnant = daysInStage > 7;
    const isHot = deal.probability > 80;

    return (
        <Draggable draggableId={deal.id.toString()} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                        "bg-white p-3 rounded-lg border shadow-sm mb-3 transition-all group hover:shadow-md relative",
                        snapshot.isDragging ? "shadow-lg rotate-2 scale-105 z-50 ring-2 ring-blue-500 ring-opacity-50" : "border-slate-200",
                        isStagnant && !snapshot.isDragging && "border-l-4 border-l-amber-400"
                    )}
                    style={provided.draggableProps.style}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-tight flex-1 mr-2">
                            {deal.title}
                        </h4>
                        <div className="flex items-center flex-col items-end gap-1">
                            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                                {formatCurrency(deal.value, deal.currency_code)}
                            </span>
                            {isHot && (
                                <span className="text-orange-500 animate-pulse" title={t('hot_deal', { defaultValue: 'Hot Deal' })}>
                                    <Flame size={14} fill="currentColor" />
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Customer & Stagnant Indicator */}
                    <div className="mb-3">
                        <div className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            {deal.customer?.name || t('unknown_customer')}
                        </div>
                        {isStagnant && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded w-fit" title={t('stagnant_tooltip', { defaultValue: 'No activity for > 7 days' })}>
                                <AlertCircle size={10} />
                                {t('stagnant', { defaultValue: 'Stagnant' })} ({daysInStage}d)
                            </div>
                        )}
                    </div>

                    {/* Footer: Owner & Probability */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700 border border-indigo-200">
                                {deal.owner?.name ? deal.owner.name.substring(0, 2).toUpperCase() : 'NA'}
                            </div>
                            {/* <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{deal.owner?.name}</span> */}
                        </div>

                        <div className="flex items-center gap-2" title={`${t('probability')}: ${deal.probability}%`}>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full",
                                        deal.probability > 75 ? "bg-emerald-500" :
                                            deal.probability > 40 ? "bg-blue-500" : "bg-slate-400"
                                    )}
                                    style={{ width: `${deal.probability}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">{deal.probability}%</span>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
