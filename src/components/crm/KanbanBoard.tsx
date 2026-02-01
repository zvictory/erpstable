'use client';

import React, { useState, useEffect, useOptimistic, startTransition } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import DealCard from './DealCard';
import { updateDealStage } from '@/app/actions/crm';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Define types locally or import from shared types
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
        email?: string;
    } | null;
    probability: number;
    updatedAt: Date | string;
    orderIndex?: number;
}

interface KanbanBoardProps {
    initialDeals: Deal[];
}

const STAGES = ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

export default function KanbanBoard({ initialDeals }: KanbanBoardProps) {
    const t = useTranslations('crm_board');

    // Group deals by stage
    const groupDeals = (deals: Deal[]) => {
        const groups: Record<string, Deal[]> = {};
        STAGES.forEach(stage => groups[stage] = []);
        deals.forEach(deal => {
            if (groups[deal.stage]) {
                groups[deal.stage].push(deal);
            } else {
                // Fallback for unknown stages
                if (!groups['DISCOVERY']) groups['DISCOVERY'] = [];
                groups['DISCOVERY'].push(deal); // Or handle error
            }
        });
        // Sort by orderIndex
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        });
        return groups;
    };

    const [deals, setDeals] = useState<Deal[]>(initialDeals);
    const [columns, setColumns] = useState(groupDeals(initialDeals));
    const [isMounted, setIsMounted] = useState(false);

    // Sync with props if they change (server revalidation)
    useEffect(() => {
        setDeals(initialDeals);
        setColumns(groupDeals(initialDeals));
    }, [initialDeals]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const sourceStage = source.droppableId;
        const destStage = destination.droppableId;
        const dealId = parseInt(draggableId);

        // OPTIMISTIC UPDATE
        const newColumns = { ...columns };
        const sourceList = [...newColumns[sourceStage]];
        const [movedDeal] = sourceList.splice(source.index, 1);

        // Update deal stage locally
        const updatedDeal = { ...movedDeal, stage: destStage };

        if (sourceStage === destStage) {
            sourceList.splice(destination.index, 0, updatedDeal);
            newColumns[sourceStage] = sourceList;
        } else {
            const destList = [...(newColumns[destStage] || [])];
            destList.splice(destination.index, 0, updatedDeal);
            newColumns[sourceStage] = sourceList;
            newColumns[destStage] = destList;
        }

        setColumns(newColumns);

        // Server Action
        try {
            // Calculate new index
            // Ideally we send the index. 
            // The server will handle updating orderIndex for this item and shifting others.
            // But wait, if we drop at index 5, the item should get orderIndex 5?
            // Yes, assuming 0-based index in the UI matches orderIndex logic.

            const result = await updateDealStage(dealId, destStage, destination.index);
            if (!result.success) {
                throw new Error('Failed to update stage');
            }
            // Success: Server revalidatePath will trigger prop update
        } catch (error) {
            console.error(error);
            toast.error(t('move_failed', { defaultValue: 'Failed to move deal' }));
            // Rollback
            setColumns(groupDeals(deals));
        }
    };

    if (!isMounted) return <div className="p-10 text-center text-slate-400">Loading Board...</div>;

    const getStageTitle = (stage: string) => {
        // Map DB enum to readable title or translation key
        // Assuming translation keys match enum lowercase or similar
        // For now, simpler mapping
        return t(`stages.${stage.toLowerCase()}`, { defaultValue: stage.replace('_', ' ') });
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full overflow-x-auto pb-4 gap-4 items-start">
                {STAGES.map(stage => {
                    const stageDeals = columns[stage] || [];
                    const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

                    return (
                        <div key={stage} className="flex-shrink-0 w-72 flex flex-col max-h-full bg-slate-50/50 rounded-xl border border-slate-200/60">
                            {/* Column Header */}
                            <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
                                        {getStageTitle(stage)}
                                    </h3>
                                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                        {stageDeals.length}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                    <span>{t('total_value')}:</span>
                                    <span className="text-slate-800">{formatCurrency(totalValue)}</span>
                                </div>
                                {/* Progress bar based on count relative to total? Optional */}
                                <div className={cn("h-0.5 mt-2 rounded-full w-full",
                                    stage === 'CLOSED_WON' ? "bg-emerald-500" :
                                        stage === 'CLOSED_LOST' ? "bg-red-200" : "bg-blue-400"
                                )} />
                            </div>

                            {/* Droppable Area */}
                            <Droppable droppableId={stage}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={cn(
                                            "flex-1 p-2 min-h-[150px] overflow-y-auto overflow-x-hidden transition-colors rounded-b-xl custom-scrollbar",
                                            snapshot.isDraggingOver ? "bg-blue-50/50 ring-2 ring-inset ring-blue-100" : ""
                                        )}
                                    >
                                        {stageDeals.map((deal, index) => (
                                            <DealCard key={deal.id} deal={deal} index={index} />
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}
