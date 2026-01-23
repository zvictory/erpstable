'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updateAccountDetails } from '@/app/actions/finance';
import { AlertTriangle } from 'lucide-react';

interface EditAccountModalProps {
  account: {
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EditAccountModal({ account, isOpen, onClose }: EditAccountModalProps) {
  const t = useTranslations('finance.editAccount');
  const tCommon = useTranslations('common');
  const [name, setName] = useState(account.name);
  const [description, setDescription] = useState(account.description || '');
  const [isActive, setIsActive] = useState(account.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('messages.nameRequired'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateAccountDetails(account.code, {
        name: name.trim(),
        description: description.trim() || undefined,
        isActive
      });

      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('labels.accountCode')}</label>
            <input
              value={account.code}
              disabled
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">{t('messages.codeCannotChange')}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('labels.accountName')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('placeholders.accountName')}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('labels.description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('placeholders.description')}
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 border border-slate-300 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              {t('labels.activeAccount')}
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('buttons.saving') : t('buttons.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
