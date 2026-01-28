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
import { updateOpportunityStage } from '@/app/actions/crm';

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

interface PipelineKanbanBoardProps {
  opportunities: Opportunity[];
}

const STAGES = [
  'LEAD',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

export function PipelineKanbanBoard({ opportunities: initialOpportunities }: PipelineKanbanBoardProps) {
  const t = useTranslations('crm.pipeline');
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);

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

  // Group opportunities by stage
  const opportunitiesByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = opportunities.filter(opp => opp.stage === stage);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const opportunity = opportunities.find(o => o.id === active.id);
    setActiveOpportunity(opportunity || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOpportunity(null);

    if (!over) return;

    const opportunityId = active.id as number;
    const newStage = over.id as string;

    // Find the opportunity
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    // If stage didn't change, do nothing
    if (opportunity.stage === newStage) return;

    // Optimistic update
    const oldOpportunities = [...opportunities];
    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === opportunityId ? { ...opp, stage: newStage } : opp
      )
    );

    try {
      // Update on server
      const result = await updateOpportunityStage(opportunityId, newStage);

      if (!result.success) {
        throw new Error('Failed to update stage');
      }

      toast.success(t('opportunities.messages.stage_update_success'));
    } catch (error) {
      // Revert on error
      console.error('Failed to update opportunity stage:', error);
      setOpportunities(oldOpportunities);
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
            opportunities={opportunitiesByStage[stage]}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOpportunity ? (
          <div className="rotate-3">
            <OpportunityCard opportunity={activeOpportunity} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
