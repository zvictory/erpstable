'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle } from './dialog';

interface ConfirmDeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
}

export function ConfirmDelete({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: ConfirmDeleteProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const t = useTranslations('common');

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        {/* Icon Circle */}
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="h-6 w-6 text-red-600" />
        </div>

        {/* Title */}
        <DialogTitle className="text-left">{title}</DialogTitle>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-600">{description}</p>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
