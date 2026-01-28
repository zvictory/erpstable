'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createServiceTicket } from '@/app/actions/service';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Technician {
  id: number;
  name: string;
  email: string;
}

interface ServiceTicketFormProps {
  technicians: Technician[];
}

export default function ServiceTicketForm({ technicians }: ServiceTicketFormProps) {
  const t = useTranslations('service.ticket_form');
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    ticketType: 'REPAIR',
    priority: 'MEDIUM',
    title: '',
    description: '',
    scheduledDate: '',
    assignedTechnicianId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.customerId || !formData.title) {
        throw new Error(t('error.required_fields'));
      }

      // Prepare data for submission
      const ticketData = {
        customerId: parseInt(formData.customerId),
        ticketType: formData.ticketType,
        priority: formData.priority,
        title: formData.title,
        description: formData.description || undefined,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : undefined,
        assignedTechnicianId: formData.assignedTechnicianId ? parseInt(formData.assignedTechnicianId) : undefined,
        assetIds: [],
      };

      const result = await createServiceTicket(ticketData);

      if (result.success) {
        router.push(`/service/tickets/${result.ticketId}`);
      }
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Customer ID (In production, this should be a customer selector) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t('customer_id')} <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          required
          value={formData.customerId}
          onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('customer_id_placeholder')}
        />
        <p className="text-xs text-slate-500 mt-1">{t('customer_id_hint')}</p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t('title')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('title_placeholder')}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t('description')}
        </label>
        <textarea
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('description_placeholder')}
        />
      </div>

      {/* Ticket Type and Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('ticket_type')}
          </label>
          <select
            value={formData.ticketType}
            onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="INSTALLATION">{t('type.installation')}</option>
            <option value="REPAIR">{t('type.repair')}</option>
            <option value="MAINTENANCE">{t('type.maintenance')}</option>
            <option value="SUPPORT">{t('type.support')}</option>
            <option value="EMERGENCY">{t('type.emergency')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('priority')}
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="LOW">{t('priority.low')}</option>
            <option value="MEDIUM">{t('priority.medium')}</option>
            <option value="HIGH">{t('priority.high')}</option>
            <option value="CRITICAL">{t('priority.critical')}</option>
          </select>
        </div>
      </div>

      {/* Schedule and Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('scheduled_date')}
          </label>
          <input
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('assign_technician')}
          </label>
          <select
            value={formData.assignedTechnicianId}
            onChange={(e) => setFormData({ ...formData, assignedTechnicianId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('unassigned')}</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('creating')}
            </>
          ) : (
            t('create_ticket')
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
