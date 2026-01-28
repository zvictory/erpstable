'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { approveBill } from '@/app/actions/purchasing';
import { formatCurrency, formatDateTimeRu } from '@/lib/format';
import { UserRole } from '@/auth.config';

interface BillApprovalBannerProps {
    billId: number;
    approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_REQUIRED';
    totalAmount: number; // in Tiyin
    approvedBy?: number | null;
    approvedAt?: Date | null;
}

export default function BillApprovalBanner({
    billId,
    approvalStatus,
    totalAmount,
    approvedBy,
    approvedAt
}: BillApprovalBannerProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('purchasing.bill_approval');

    // Determine if current user is admin
    const userRole = (session?.user as any)?.role as UserRole | undefined;
    const isAdmin = userRole === UserRole.ADMIN;

    // Don't render banner if approval is not required
    if (approvalStatus === 'NOT_REQUIRED') {
        return null;
    }

    const handleAction = async (action: 'APPROVE' | 'REJECT') => {
        try {
            setLoading(true);
            setError(null);

            const result = await approveBill(billId, action);

            if (!result.success) {
                setError((result as any).error || `Failed to ${action.toLowerCase()} bill`);
                return;
            }

            // Refresh the page to show updated state
            router.refresh();
        } catch (err: any) {
            console.error(`Error ${action.toLowerCase()}ing bill:`, err);
            setError(err.message || `An unexpected error occurred`);
        } finally {
            setLoading(false);
        }
    };

    // PENDING status
    if (approvalStatus === 'PENDING') {
        return (
            <div className="mb-4">
                <div className="flex items-center justify-between gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yellow-900">
                                {isAdmin
                                    ? t('pending_approval')
                                    : t('waiting_approval')}
                            </p>
                            <p className="text-sm text-yellow-700">
                                {t('amount_label')} {formatCurrency(totalAmount)}
                            </p>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleAction('APPROVE')}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('processing')}
                                    </>
                                ) : (
                                    t('approve')
                                )}
                            </button>
                            <button
                                onClick={() => handleAction('REJECT')}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('processing')}
                                    </>
                                ) : (
                                    t('reject')
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}
            </div>
        );
    }

    // APPROVED status
    if (approvalStatus === 'APPROVED') {
        return (
            <div className="mb-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-green-900">{t('approved')}</p>
                        {approvedAt && (
                            <p className="text-sm text-green-700">
                                {formatDateTimeRu(approvedAt)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // REJECTED status
    if (approvalStatus === 'REJECTED') {
        return (
            <div className="mb-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-red-900">{t('rejected')}</p>
                        <p className="text-sm text-red-700">
                            {t('rejected_message')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
