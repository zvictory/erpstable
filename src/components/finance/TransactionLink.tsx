'use client';

import React from 'react';
import { Link } from '@/navigation';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionLinkProps {
    transactionId?: string | null;
    reference?: string | null;
    journalEntryId: number;
}

/**
 * Smart component that parses transactionId to route to source documents.
 *
 * Patterns:
 * - bill-123 → /purchasing/vendors?billId=123
 * - pay-456 → /purchasing/vendors?paymentId=456
 * - INV-789 (in reference) → /sales/customers?invoiceId=789
 * - Manual/null → Show reference only (non-clickable)
 */
export default function TransactionLink({
    transactionId,
    reference,
    journalEntryId
}: TransactionLinkProps) {
    // Parse transaction type and ID
    const parseTransaction = () => {
        // Bill transactions
        if (transactionId?.startsWith('bill-')) {
            const billId = parseInt(transactionId.replace('bill-', '').split('-')[0]);
            if (!isNaN(billId)) {
                return {
                    type: 'BILL',
                    id: billId,
                    href: `/purchasing/vendors?billId=${billId}`,
                    label: `Bill #${billId}`,
                    color: 'text-blue-600 hover:text-blue-700'
                };
            }
        }

        // Payment transactions
        if (transactionId?.startsWith('pay-')) {
            const payId = parseInt(transactionId.replace('pay-', '').split('-')[0]);
            if (!isNaN(payId)) {
                return {
                    type: 'PAYMENT',
                    id: payId,
                    href: `/purchasing/vendors?paymentId=${payId}`,
                    label: `Payment #${payId}`,
                    color: 'text-green-600 hover:text-green-700'
                };
            }
        }

        // Invoice transactions (parse from reference field)
        if (reference?.startsWith('INV-')) {
            const match = reference.match(/INV-(\d+)/);
            if (match) {
                const invoiceId = parseInt(match[1]);
                if (!isNaN(invoiceId)) {
                    return {
                        type: 'INVOICE',
                        id: invoiceId,
                        href: `/sales/customers?invoiceId=${invoiceId}`,
                        label: reference,
                        color: 'text-purple-600 hover:text-purple-700'
                    };
                }
            }
        }

        // Manual journal entries or unrecognized patterns
        return {
            type: 'MANUAL',
            id: null,
            href: null,
            label: reference || `JE-${journalEntryId}`,
            color: 'text-slate-500'
        };
    };

    const transaction = parseTransaction();

    // Non-clickable for manual entries
    if (!transaction.href) {
        return (
            <span className={cn('font-mono text-sm', transaction.color)}>
                {transaction.label}
            </span>
        );
    }

    // Clickable link for bills, invoices, payments
    return (
        <Link
            href={transaction.href}
            className={cn(
                'font-mono text-sm inline-flex items-center gap-1.5 transition-colors',
                transaction.color
            )}
        >
            {transaction.label}
            <ExternalLink className="w-3 h-3" />
        </Link>
    );
}
