'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowDown, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateProductionChain } from '@/app/actions/production';

interface ChainPlannerProps {
  finishedGoodsItems: any[];
}

export default function ProductionChainPlanner({ finishedGoodsItems }: ChainPlannerProps) {
  const t = useTranslations('production.chain');
  const router = useRouter();

  const [targetItemId, setTargetItemId] = useState<number | null>(null);
  const [targetQuantity, setTargetQuantity] = useState<number>(100);
  const [chain, setChain] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePreview = async () => {
    if (!targetItemId) {
      setError(t('warnings.no_target_selected'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateProductionChain({
        targetItemId,
        targetQuantity,
        createDraftRuns: false, // Preview only
      });

      if (result.success) {
        setChain(result);
      } else {
        setError(result.error || t('warnings.generation_failed'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraftRuns = async () => {
    setLoading(true);

    try {
      const result = await generateProductionChain({
        targetItemId: targetItemId!,
        targetQuantity,
        createDraftRuns: true,
      });

      if (result.success && result.chainId) {
        router.push(`/production/chain/${result.chainId}`);
      } else {
        setError(result.error || t('warnings.creation_failed'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Selection */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="targetItem">{t('target_product')}</Label>
            <select
              id="targetItem"
              className="w-full mt-1 border rounded px-3 py-2"
              value={targetItemId || ''}
              onChange={(e) => setTargetItemId(Number(e.target.value))}
            >
              <option value="">Select product...</option>
              {finishedGoodsItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="targetQty">{t('target_quantity')}</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                id="targetQty"
                className="flex-1 border rounded px-3 py-2"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Number(e.target.value))}
                min="0.001"
                step="0.1"
              />
              <span className="flex items-center text-slate-600">kg</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleGeneratePreview}
            disabled={!targetItemId || loading}
          >
            {loading ? 'Generating...' : t('generate_preview')}
          </Button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Chain Preview */}
      {chain && chain.stages && (
        <div className="space-y-4">
          {/* Warnings */}
          {chain.warnings && chain.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-amber-600" size={20} />
                <h3 className="font-semibold text-amber-900">Warnings</h3>
              </div>
              <ul className="space-y-1">
                {chain.warnings.map((warning: string, idx: number) => (
                  <li key={idx} className="text-sm text-amber-700">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stages */}
          {chain.stages.map((stage: any, idx: number) => (
            <div
              key={stage.stageNumber}
              className="bg-white rounded-lg border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('stage', { number: stage.stageNumber })}: {stage.recipeName}
                </h3>
                <span className="text-sm text-slate-500">{stage.processType}</span>
              </div>

              {/* Inputs */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">{t('input')}</h4>
                <div className="space-y-2">
                  {stage.inputItems.map((input: any) => (
                    <div
                      key={input.itemId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Package size={14} className="text-slate-400" />
                        {input.itemName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {input.quantity.toFixed(2)} kg
                        </span>
                        {input.availableInventory >= input.quantity ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={14} />
                            {input.availableInventory.toFixed(2)} kg
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle size={14} />
                            {input.availableInventory.toFixed(2)} kg
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Output */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{t('output')}</span>
                  <span className="font-semibold text-slate-900">
                    {stage.outputQuantity.toFixed(2)} kg {stage.outputItemName}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-600">{t('expected_yield')}</span>
                  <span className="text-sm text-slate-700">
                    {stage.expectedYieldPct}%
                  </span>
                </div>
              </div>

              {idx < chain.stages.length - 1 && (
                <div className="flex justify-center mt-4">
                  <ArrowDown className="text-slate-400" size={24} />
                </div>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setChain(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDraftRuns} disabled={loading}>
              {t('create_draft_runs')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
