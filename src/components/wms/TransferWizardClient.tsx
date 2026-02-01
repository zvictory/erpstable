'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { MobileLayout } from './MobileLayout';
import { useScanListener } from '@/hooks/useScanListener';
import { scanBarcode, wmsTransferStock, wmsGetItemDetails, wmsGetLocationDetails } from '@/app/actions/wms';

type Step = 1 | 2 | 3 | 4;

interface ItemData {
  id: string;
  name: string;
  sku: string;
  unit: string;
  qoh: number;
}

interface LocationData {
  id: string;
  code: string;
  name: string;
  warehouseName: string;
}

export function TransferWizardClient() {
  const t = useTranslations('wms.transfer');
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceItem, setSourceItem] = useState<ItemData | null>(null);
  const [destLocation, setDestLocation] = useState<LocationData | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [transferring, setTransferring] = useState(false);

  // Step 1: Scan Item
  const handleItemScan = async (code: string) => {
    setScanning(true);
    setError(null);

    try {
      const result = await scanBarcode(code);

      if (result.type === 'ITEM') {
        setSourceItem({
          id: String(result.data.id),
          name: result.data.name,
          sku: result.data.sku || '',
          unit: result.data.unit || '',
          qoh: result.data.qoh,
        });
        setStep(2);
      } else {
        setError('Please scan an item barcode');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  // Step 2: Scan Destination Location
  const handleLocationScan = async (code: string) => {
    setScanning(true);
    setError(null);

    try {
      const result = await scanBarcode(code);

      if (result.type === 'LOCATION') {
        setDestLocation({
          id: String(result.data.id),
          code: result.data.code,
          name: result.data.name,
          warehouseName: result.data.warehouseName || '',
        });
        setStep(3);
      } else {
        setError('Please scan a location code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  // Step 3: Manual quantity entry (no scanner)
  useScanListener({
    enabled: !scanning && (step === 1 || step === 2),
    onScan: step === 1 ? handleItemScan : handleLocationScan,
  });

  // Step 4: Confirm Transfer
  const handleConfirmTransfer = async () => {
    if (!sourceItem || !destLocation) return;

    setTransferring(true);
    setError(null);

    try {
      await wmsTransferStock({
        itemId: sourceItem.id,
        sourceLocationCode: 'MAIN-01', // TODO: In real app, track source location
        destinationLocationCode: destLocation.code,
        quantity,
        notes: 'WMS Scanner Transfer',
      });

      setStep(4); // Success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  // Progress Dots
  const ProgressDots = () => (
    <div className="flex justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={`
            w-3 h-3 rounded-full
            ${step >= s ? 'bg-blue-500' : 'bg-slate-700'}
          `}
        />
      ))}
    </div>
  );

  return (
    <MobileLayout title={t('title')}>
      <div className="space-y-6">
        <ProgressDots />

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-6">
            <p className="text-xl text-red-200">{error}</p>
          </div>
        )}

        {/* Step 1: Scan Item */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className={`
                rounded-xl p-6 text-center
                ${scanning ? 'bg-yellow-900/50 border-2 border-yellow-500' : 'bg-slate-800 border border-slate-700'}
              `}
            >
              {scanning ? (
                <>
                  <div className="animate-pulse text-4xl mb-3">📡</div>
                  <p className="text-xl text-yellow-200">{t('step1.title')}</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-xl text-white font-semibold">{t('step1.title')}</p>
                  <p className="text-sm text-slate-400 mt-2">{t('step1.instruction')}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Scan Destination */}
        {step === 2 && sourceItem && (
          <div className="space-y-4">
            {/* Show selected item */}
            <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-4">
              <p className="text-sm text-blue-300 mb-1">{t('item')}</p>
              <p className="text-lg text-white font-semibold">{sourceItem.name}</p>
              <p className="text-sm text-slate-400">SKU: {sourceItem.sku}</p>
              <p className="text-sm text-green-400">
                {t('available')}: {sourceItem.qoh} {sourceItem.unit}
              </p>
            </div>

            {/* Scan destination */}
            <div
              className={`
                rounded-xl p-6 text-center
                ${scanning ? 'bg-yellow-900/50 border-2 border-yellow-500' : 'bg-slate-800 border border-slate-700'}
              `}
            >
              {scanning ? (
                <>
                  <div className="animate-pulse text-4xl mb-3">📡</div>
                  <p className="text-xl text-yellow-200">{t('step2.title')}</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📍</div>
                  <p className="text-xl text-white font-semibold">{t('step2.title')}</p>
                  <p className="text-sm text-slate-400 mt-2">{t('step2.instruction')}</p>
                </>
              )}
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            >
              {t('common.start_over', { ns: 'wms' })}
            </button>
          </div>
        )}

        {/* Step 3: Enter Quantity */}
        {step === 3 && sourceItem && destLocation && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm text-slate-400">{t('item')}</p>
                <p className="text-lg text-white font-semibold">{sourceItem.name}</p>
              </div>

              <div>
                <p className="text-sm text-slate-400">{t('destination')}</p>
                <p className="text-lg text-white font-semibold">{destLocation.code}</p>
                <p className="text-sm text-slate-500">{destLocation.name}</p>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="bg-slate-800 rounded-xl p-6">
              <label className="block text-sm text-slate-400 mb-2">{t('quantity')}</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white text-2xl rounded-lg"
                >
                  −
                </button>

                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-slate-900 text-white text-2xl text-center rounded-lg p-3 border border-slate-700"
                  min={1}
                  max={sourceItem.qoh}
                />

                <button
                  onClick={() => setQuantity(Math.min(sourceItem.qoh, quantity + 1))}
                  className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white text-2xl rounded-lg"
                >
                  +
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2 text-center">
                {t('available')}: {sourceItem.qoh} {sourceItem.unit}
              </p>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmTransfer}
              disabled={transferring || quantity > sourceItem.qoh}
              className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white text-xl font-semibold rounded-xl"
            >
              {transferring ? t('transferring') : t('confirm_transfer')}
            </button>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            >
              {t('common.start_over', { ns: 'wms' })}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-green-900/30 border-2 border-green-500 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-2xl text-green-200 font-bold mb-2">{t('success')}</p>
              <p className="text-slate-300">{t('success_message')}</p>
            </div>

            <button
              onClick={() => router.push('/wms')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold rounded-xl"
            >
              {t('common.back_to_menu', { ns: 'wms' })}
            </button>

            <button
              onClick={() => {
                setStep(1);
                setSourceItem(null);
                setDestLocation(null);
                setQuantity(1);
                setError(null);
              }}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            >
              {t('common.start_over', { ns: 'wms' })}
            </button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
