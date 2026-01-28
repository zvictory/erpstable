'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Plus, User, Mail, Phone, Building2 } from 'lucide-react';

interface Lead {
  id: number;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  estimatedValue: number;
  assignedToUser?: {
    id: number;
    name: string;
  } | null;
  createdAt: Date;
}

interface LeadListProps {
  leads: Lead[];
}

export function LeadList({ leads: initialLeads }: LeadListProps) {
  const t = useTranslations('crm.leads');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  // Filter leads
  const filteredLeads = initialLeads.filter((lead) => {
    if (selectedStatus !== 'ALL' && lead.status !== selectedStatus) return false;
    if (selectedSource !== 'ALL' && lead.source !== selectedSource) return false;
    return true;
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-700';
      case 'CONTACTED':
        return 'bg-purple-100 text-purple-700';
      case 'QUALIFIED':
        return 'bg-green-100 text-green-700';
      case 'UNQUALIFIED':
        return 'bg-red-100 text-red-700';
      case 'CONVERTED':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('title')}</h2>
          <p className="text-slate-600 mt-1">
            {filteredLeads.length} {t('title').toLowerCase()}
          </p>
        </div>
        <Link href="/sales/leads/new">
          <Button>
            <Plus size={16} className="mr-2" />
            {t('new_lead')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.status')}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">{t('status.new')}</option>
              <option value="CONTACTED">{t('status.contacted')}</option>
              <option value="QUALIFIED">{t('status.qualified')}</option>
              <option value="UNQUALIFIED">{t('status.unqualified')}</option>
              <option value="CONVERTED">{t('status.converted')}</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.source')}
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Sources</option>
              <option value="WEBSITE">{t('source.website')}</option>
              <option value="REFERRAL">{t('source.referral')}</option>
              <option value="TRADE_SHOW">{t('source.trade_show')}</option>
              <option value="COLD_CALL">{t('source.cold_call')}</option>
              <option value="PARTNER">{t('source.partner')}</option>
              <option value="OTHER">{t('source.other')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Grid */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No leads found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <Link key={lead.id} href={`/sales/leads/${lead.id}`}>
              <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {lead.fullName}
                    </h3>
                    {lead.company && (
                      <p className="text-sm text-slate-600 truncate flex items-center gap-1 mt-1">
                        <Building2 size={14} />
                        {lead.company}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      lead.status
                    )}`}
                  >
                    {t(`status.${lead.status.toLowerCase()}` as any)}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-3">
                  {lead.email && (
                    <p className="text-sm text-slate-600 flex items-center gap-2 truncate">
                      <Mail size={14} />
                      {lead.email}
                    </p>
                  )}
                  {lead.phone && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Phone size={14} />
                      {lead.phone}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">{t('fields.estimated_value')}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(lead.estimatedValue)}
                    </p>
                  </div>
                  {lead.assignedToUser && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User size={12} />
                      <span className="truncate max-w-[100px]">
                        {lead.assignedToUser.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
