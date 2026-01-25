import React from 'react';
import { formatNumber } from '@/lib/format';
import { clsx } from 'clsx';

// ==================== TYPE DEFINITIONS ====================

export interface ReportRow {
    label: string;
    amount?: number; // In Tiyin
    isSubtotal?: boolean;
    isBold?: boolean;
    indent?: number; // 0 = no indent, 1 = one level, 2 = two levels
    code?: string; // Optional account code display
}

export interface ReportSection {
    title: string;
    rows: ReportRow[];
    showTotal?: boolean;
    totalLabel?: string;
    totalAmount?: number;
    isFinalTotal?: boolean; // Double underline for Net Income/Total Assets
}

export interface FinancialReportProps {
    title: string;
    subtitle: string; // e.g., "За период с 01.01.2026 по 31.01.2026"
    sections: ReportSection[];
    className?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Format amount according to accounting standards
 * - Negative numbers in parentheses
 * - Two decimal places
 * - Thousands separator
 */
function formatAmount(amount: number): string {
    const value = Math.abs(amount / 100);
    const formatted = formatNumber(value, { decimals: 2, separator: ',' });
    return amount < 0 ? `(${formatted})` : formatted;
}

// ==================== COMPONENT ====================

export function FinancialReport({
    title,
    subtitle,
    sections,
    className,
}: FinancialReportProps) {
    return (
        <div className={clsx('bg-white rounded-lg border border-slate-200 shadow-sm', className)}>
            {/* Report Header */}
            <div className="border-b border-slate-200 p-8 print:p-6">
                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                    {title}
                </h1>
                <p className="text-sm text-slate-600 mt-1 font-medium">{subtitle}</p>
            </div>

            {/* Report Body */}
            <div className="p-8 print:p-6">
                {sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-8 last:mb-0">
                        {/* Section Title */}
                        {section.title && (
                            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                                {section.title}
                            </h2>
                        )}

                        {/* Section Rows */}
                        <div className="space-y-1">
                            {section.rows.map((row, rowIndex) => (
                                <div
                                    key={rowIndex}
                                    className={clsx(
                                        'flex justify-between items-baseline py-1',
                                        row.indent === 1 && 'pl-6',
                                        row.indent === 2 && 'pl-12',
                                        row.isSubtotal && 'border-t border-slate-300 mt-2 pt-2',
                                        row.isBold && 'font-bold'
                                    )}
                                >
                                    {/* Label */}
                                    <div className="flex items-baseline gap-2">
                                        {row.code && (
                                            <span className="text-xs text-slate-500 font-mono">
                                                {row.code}
                                            </span>
                                        )}
                                        <span
                                            className={clsx(
                                                'text-sm text-slate-900',
                                                row.isBold ? 'font-bold' : 'font-medium'
                                            )}
                                        >
                                            {row.label}
                                        </span>
                                    </div>

                                    {/* Amount */}
                                    {row.amount !== undefined && (
                                        <span
                                            className={clsx(
                                                'text-sm font-mono tabular-nums',
                                                row.isBold ? 'font-bold' : 'font-normal',
                                                row.amount < 0 ? 'text-red-600' : 'text-slate-900'
                                            )}
                                        >
                                            {formatAmount(row.amount)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Section Total */}
                        {section.showTotal && (
                            <div
                                className={clsx(
                                    'flex justify-between items-baseline py-2 mt-2',
                                    section.isFinalTotal
                                        ? 'border-t-4 border-double border-slate-900'
                                        : 'border-t border-slate-300',
                                    'font-bold'
                                )}
                            >
                                <span className="text-sm text-slate-900 uppercase tracking-wide">
                                    {section.totalLabel}
                                </span>
                                <span
                                    className={clsx(
                                        'text-base font-mono tabular-nums',
                                        section.totalAmount !== undefined && section.totalAmount < 0
                                            ? 'text-red-600'
                                            : 'text-slate-900'
                                    )}
                                >
                                    {section.totalAmount !== undefined && formatAmount(section.totalAmount)}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Print-specific styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background: white !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .border-slate-200,
                    .border-slate-300 {
                        border-color: black !important;
                    }

                    @page {
                        margin: 2cm;
                    }
                }
            `}</style>
        </div>
    );
}
