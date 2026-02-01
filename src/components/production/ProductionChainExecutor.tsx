'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ChainExecutorProps {
  chain: any;
}

export default function ProductionChainExecutor({ chain }: ChainExecutorProps) {
  const t = useTranslations('production.chain');

  const getStageStatus = (run: any) => {
    if (run.status === 'COMPLETED') return { icon: CheckCircle, color: 'text-green-600', label: t('stage_status.completed') };
    if (run.status === 'IN_PROGRESS') return { icon: Clock, color: 'text-blue-600', label: t('stage_status.in_progress') };
    return { icon: PlayCircle, color: 'text-slate-400', label: t('stage_status.draft') };
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/production" className="text-blue-600 hover:underline text-sm">
          ← Back to Production
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{chain.name}</h1>
        <p className="text-slate-600">
          Target: {chain.targetQuantity} kg {chain.targetItem.name}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          {chain.members.map((member: any, idx: number) => {
            const status = getStageStatus(member.run);
            const StatusIcon = status.icon;

            return (
              <div key={member.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                      member.run.status === 'COMPLETED'
                        ? 'bg-green-50 border-green-600'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <StatusIcon className={status.color} size={24} />
                  </div>
                  <span className="text-xs text-slate-600 mt-2">
                    Stage {member.stageNumber}
                  </span>
                </div>

                {idx < chain.members.length - 1 && (
                  <div className="w-24 h-0.5 bg-slate-300 mx-4" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Details */}
      <div className="space-y-4">
        {chain.members.map((member: any) => (
          <div
            key={member.id}
            className="bg-white rounded-lg border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Stage {member.stageNumber}: {member.run.type}
              </h3>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  member.run.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : member.run.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {getStageStatus(member.run).label}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Expected Input:</span>
                <span className="font-medium">
                  {member.expectedInputQty.toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Expected Output:</span>
                <span className="font-medium">
                  {member.expectedOutputQty.toFixed(2)} kg
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {member.run.status === 'DRAFT' && (
                <Link href={`/production/terminal?runId=${member.run.id}`}>
                  <Button size="sm">{t('execute_stage', { number: member.stageNumber })}</Button>
                </Link>
              )}
              <Link href={`/production/${member.run.id}`}>
                <Button variant="outline" size="sm">
                  {t('view_details')}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
