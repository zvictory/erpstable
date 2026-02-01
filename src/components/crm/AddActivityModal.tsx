'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { createActivity } from '@/app/actions/crm';

const activitySchema = z.object({
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK']),
  subject: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface AddActivityModalProps {
  entityType: 'LEAD' | 'DEAL' | 'CUSTOMER';
  entityId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function AddActivityModal({ entityType, entityId, isOpen, onClose }: AddActivityModalProps) {
  const t = useTranslations('crm.activities');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: 'NOTE' },
  });

  const selectedType = watch('type');

  const onSubmit = async (data: ActivityFormData) => {
    setIsSubmitting(true);
    try {
      await createActivity({
        entity_type: entityType,
        entity_id: entityId,
        type: data.type,
        subject: data.subject,
        description: data.description,
        due_date: data.due_date ? new Date(data.due_date) : undefined,
      });

      toast.success(t('messages.create_success'));
      reset();
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(t('messages.create_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900">{t('add_activity')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.type')} *
            </label>
            <select {...register('type')} className="w-full px-3 py-2 border border-slate-300 rounded-md">
              <option value="NOTE">{t('type.note')}</option>
              <option value="CALL">{t('type.call')}</option>
              <option value="EMAIL">{t('type.email')}</option>
              <option value="MEETING">{t('type.meeting')}</option>
              <option value="TASK">{t('type.task')}</option>
            </select>
          </div>

          {selectedType !== 'NOTE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.subject')}
              </label>
              <input
                type="text"
                {...register('subject')}
                placeholder={t('placeholders.subject')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.description')} *
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder={t('placeholders.description')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {selectedType === 'TASK' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.due_date')}
              </label>
              <input
                type="date"
                {...register('due_date')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('actions.saving') : t('actions.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
