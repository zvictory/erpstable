'use client';

import { useState } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Database, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { resetTransactionalData } from '@/app/actions/system-tools';

interface SystemResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'warning' | 'confirm' | 'processing' | 'complete';

export default function SystemResetModal({ isOpen, onClose }: SystemResetModalProps) {
  const t = useTranslations('settings.system_reset');
  const [step, setStep] = useState<Step>('warning');
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const REQUIRED_TEXT = 'DELETE-TEST-DATA';
  const isConfirmationValid = confirmationText === REQUIRED_TEXT;

  const handleReset = () => {
    setStep('warning');
    setConfirmationText('');
    setError(null);
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (step !== 'processing') {
      handleReset();
      onClose();
    }
  };

  const executeReset = async () => {
    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      const response = await resetTransactionalData(confirmationText);

      if (response.success) {
        setResult(response);
        setStep('complete');
      } else {
        setError(response.error || 'Reset failed');
        setStep('confirm');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-red-200">
        {/* Header */}
        <div className="p-6 border-b border-red-100 flex justify-between items-center bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-800">{t('modal_title')}</h2>
          </div>
          {step !== 'processing' && (
            <button
              onClick={handleClose}
              className="text-red-400 hover:text-red-600 transition"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'warning' && <WarningContent t={t} />}
          {step === 'confirm' && (
            <ConfirmContent
              t={t}
              confirmationText={confirmationText}
              setConfirmationText={setConfirmationText}
              requiredText={REQUIRED_TEXT}
              error={error}
            />
          )}
          {step === 'processing' && <ProcessingContent t={t} />}
          {step === 'complete' && <CompleteContent t={t} result={result} />}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          {step === 'warning' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-sm"
              >
                {t('buttons.continue')}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                onClick={() => setStep('warning')}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                disabled={loading}
              >
                {t('buttons.back')}
              </button>
              <button
                onClick={executeReset}
                disabled={!isConfirmationValid || loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {loading ? t('buttons.processing') : t('buttons.execute')}
              </button>
            </>
          )}

          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition shadow-sm"
            >
              {t('buttons.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WarningContent({ t }: { t: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium mb-2">
          {t('warning.alert_title')}
        </p>
        <p className="text-red-700 text-sm">
          {t('warning.alert_description')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* What will be deleted */}
        <div className="border border-red-200 rounded-lg p-4 bg-red-50/50">
          <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            {t('warning.will_delete.heading')}
          </h3>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• {t('warning.will_delete.point1')}</li>
            <li>• {t('warning.will_delete.point2')}</li>
            <li>• {t('warning.will_delete.point3')}</li>
            <li>• {t('warning.will_delete.point4')}</li>
            <li>• {t('warning.will_delete.point5')}</li>
            <li>• {t('warning.will_delete.point6')}</li>
            <li>• {t('warning.will_delete.point7')}</li>
          </ul>
        </div>

        {/* What will be preserved */}
        <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            {t('warning.will_preserve.heading')}
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• {t('warning.will_preserve.point1')}</li>
            <li>• {t('warning.will_preserve.point2')}</li>
            <li>• {t('warning.will_preserve.point3')}</li>
            <li>• {t('warning.will_preserve.point4')}</li>
            <li>• {t('warning.will_preserve.point5')}</li>
            <li>• {t('warning.will_preserve.point6')}</li>
            <li>• {t('warning.will_preserve.point7')}</li>
          </ul>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-900 text-sm font-medium">
          {t('warning.use_case')}
        </p>
      </div>
    </div>
  );
}

interface ConfirmContentProps {
  t: any;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  requiredText: string;
  error: string | null;
}

function ConfirmContent({ t, confirmationText, setConfirmationText, requiredText, error }: ConfirmContentProps) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold mb-2">
          {t('confirmation.title')}
        </p>
        <p className="text-red-700 text-sm">
          {t('confirmation.instruction', { code: requiredText })} <code className="bg-red-100 px-2 py-1 rounded font-mono text-red-900">{requiredText}</code>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {t('confirmation.label')}
        </label>
        <input
          type="text"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={t('confirmation.placeholder')}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
          autoFocus
        />
        {confirmationText && !error && (
          <p className={`text-sm mt-2 ${confirmationText === requiredText ? 'text-green-600' : 'text-red-600'}`}>
            {confirmationText === requiredText ? t('confirmation.match_success') : t('confirmation.match_failure')}
          </p>
        )}
        {error && (
          <p className="text-sm mt-2 text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-slate-700 text-sm font-semibold mb-2">
          {t('confirmation.what_happens.heading')}
        </p>
        <ol className="text-sm text-slate-600 mt-2 space-y-1 list-decimal list-inside">
          <li>{t('confirmation.what_happens.step1')}</li>
          <li>{t('confirmation.what_happens.step2')}</li>
          <li>{t('confirmation.what_happens.step3')}</li>
          <li>{t('confirmation.what_happens.step4')}</li>
        </ol>
      </div>
    </div>
  );
}

function ProcessingContent({ t }: { t: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-16 h-16 text-red-600 animate-spin mb-4" />
      <h3 className="text-xl font-semibold text-slate-800 mb-2">{t('processing.title')}</h3>
      <p className="text-slate-600 text-sm">
        {t('processing.description')}
      </p>
    </div>
  );
}

function CompleteContent({ t, result }: { t: any; result: any }) {
  const totalDeleted = Object.values(result?.deletionCounts || {}).reduce((sum: number, count) => sum + (count as number), 0);
  const totalReset = Object.values(result?.resetCounts || {}).reduce((sum: number, count) => sum + (count as number), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-6">
        <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">{t('success.title')}</h3>
        <p className="text-slate-600 text-sm">
          {t('success.description')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 mb-2">{t('success.deletion_counts')}</h4>
          <p className="text-3xl font-bold text-red-600">{totalDeleted.toLocaleString()}</p>
          <p className="text-sm text-red-700 mt-1">{t('success.records_removed')}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">{t('success.reset_counts')}</h4>
          <p className="text-3xl font-bold text-green-600">{totalReset.toLocaleString()}</p>
          <p className="text-sm text-green-700 mt-1">{t('success.records_reset')}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">{t('success.next_steps.heading')}</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>{t('success.next_steps.step1')}</li>
          <li>{t('success.next_steps.step2')}</li>
          <li>{t('success.next_steps.step3')}</li>
          <li>{t('success.next_steps.step4')}</li>
        </ol>
      </div>

      {result?.deletionCounts && (
        <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-slate-700 text-sm">
            {t('success.details_toggle')}
          </summary>
          <div className="mt-3 space-y-2">
            <div>
              <p className="font-medium text-slate-700 text-sm mb-1">{t('success.deletion_counts')}:</p>
              <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result.deletionCounts, null, 2)}
              </pre>
            </div>
            <div>
              <p className="font-medium text-slate-700 text-sm mb-1">{t('success.reset_counts')}:</p>
              <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result.resetCounts, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
