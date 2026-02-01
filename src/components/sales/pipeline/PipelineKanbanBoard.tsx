'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { KanbanColumn } from './KanbanColumn';
import { OpportunityCard } from './OpportunityCard';
import { updateDealStage } from '@/app/actions/crm';

interface Deal {
  id: number;
  title: string;
  value: number;
  probability: number;
  stage: string;
  customer: {
    id: number;
    name: string;
  };
  owner?: {
    id: number;
    name: string;
  } | null;
  expected_close_date?: Date | null;
}

interface PipelineKanbanBoardProps {
  deals: Deal[];
}

const STAGES = [
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

export function PipelineKanbanBoard({ deals: initialDeals }: PipelineKanbanBoardProps) {
  const t = useTranslations('crm.pipeline');
  const [deals, setDeals] = useState(initialDeals);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group deals by stage
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(deal => deal.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = deals.find(d => d.id === active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = active.id as number;
    const newStage = over.id as string;

    // Find the deal
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    // If stage didn't change, do nothing
    if (deal.stage === newStage) return;

    // Optimistic update
    const oldDeals = [...deals];
    setDeals(prev =>
      prev.map(d =>
        d.id === dealId ? { ...d, stage: newStage } : d
      )
    );

    try {
      // Update on server
      const result = await updateDealStage(dealId, newStage);

      if (!result.success) {
        throw new Error('Failed to update stage');
      }

      toast.success(t('opportunities.messages.stage_update_success'));
    } catch (error) {
      // Revert on error
      console.error('Failed to update deal stage:', error);
      setDeals(oldDeals);
      toast.error('Failed to update stage. Please try again.');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            title={t(`stages.${stage.toLowerCase()}` as any)}
            opportunities={dealsByStage[stage]}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDeal ? (
          <div className="rotate-3">
            <OpportunityCard opportunity={activeDeal} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
