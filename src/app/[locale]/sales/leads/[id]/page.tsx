'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLead } from '@/app/actions/crm';
import { ConvertLeadModal } from '@/components/sales/leads/ConvertLeadModal';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { ArrowLeft, Mail, Phone, Building2, User, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('crm.leads');
  const [lead, setLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const leadData = await getLead(Number(params.id));
        setLead(leadData);
      } catch (error) {
        console.error('Error fetching lead:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLead();
  }, [params.id]);

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

  const canConvert = lead && lead.status !== 'CONVERTED' && lead.status !== 'UNQUALIFIED';

  return (
    <>
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.sales}
        domain="sales"
      />
      {isLoading ? (
        <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      ) : !lead ? (
        <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
          <p className="text-slate-600">Lead not found</p>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Link href="/sales/leads">
                <Button variant="outline" size="sm" className="mb-4">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Leads
                </Button>
              </Link>

              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{lead.fullName}</h1>
                  {lead.company && (
                    <p className="text-lg text-slate-600 mt-1 flex items-center gap-2">
                      <Building2 size={18} />
                      {lead.company}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(
                      lead.status
                    )}`}
                  >
                    {t(`status.${lead.status.toLowerCase()}` as any)}
                  </span>
                  {canConvert && (
                    <Button onClick={() => setShowConvertModal(true)}>
                      <ArrowRight size={16} className="mr-2" />
                      {t('convert_to_customer')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-slate-400" />
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={18} className="text-slate-400" />
                      <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Details */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Lead Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{t('fields.source')}</p>
                    <p className="text-slate-900">{t(`source.${lead.source.toLowerCase()}` as any)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{t('fields.estimated_value')}</p>
                    <p className="text-slate-900 font-semibold">
                      {formatCurrency(lead.estimatedValue)}
                    </p>
                  </div>
                  {lead.assignedToUser && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">{t('fields.assigned_to')}</p>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-slate-400" />
                        <p className="text-slate-900">{lead.assignedToUser.name}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Created</p>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <p className="text-slate-900">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="bg-white rounded-lg border border-slate-200 p-6 md:col-span-2">
                  <h3 className="font-semibold text-slate-900 mb-4">{t('fields.notes')}</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}

              {/* Converted Info */}
              {lead.status === 'CONVERTED' && lead.convertedToCustomer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 md:col-span-2">
                  <h3 className="font-semibold text-green-900 mb-2">Converted to Customer</h3>
                  <p className="text-green-700">
                    This lead was converted to customer: {lead.convertedToCustomer.name}
                  </p>
                  {lead.convertedAt && (
                    <p className="text-sm text-green-600 mt-1">
                      Converted on {new Date(lead.convertedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Opportunities */}
              {lead.opportunities && lead.opportunities.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-6 md:col-span-2">
                  <h3 className="font-semibold text-slate-900 mb-4">Related Opportunities</h3>
                  <div className="space-y-2">
                    {lead.opportunities.map((opp: any) => (
                      <Link key={opp.id} href={`/sales/opportunities/${opp.id}`}>
                        <div className="p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
                          <p className="font-medium text-slate-900">{opp.title}</p>
                          <p className="text-sm text-slate-600">
                            {formatCurrency(opp.estimatedValue)} • {opp.stage}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && (
        <ConvertLeadModal
          lead={lead}
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
        />
      )}
    </>
  );
}
