import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { getAuditLogs } from '@/app/actions/audit';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        entity?: string;
        action?: string;
        userId?: string;
        dateFrom?: string;
        dateTo?: string;
    };
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
    const t = await getTranslations('audit');
    const session = await auth();

    // Admin-only access
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        redirect('/');
    }

    // Fetch logs with filters
    const result = await getAuditLogs({
        entity: searchParams.entity,
        action: searchParams.action,
        userId: searchParams.userId ? Number(searchParams.userId) : undefined,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
    });

    if (!result.success) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{result.error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">{t('page_title')}</h1>
                <p className="text-slate-500 mt-1">{t('page_subtitle')}</p>
            </div>

            <AuditLogViewer
                initialLogs={result.logs || []}
                initialFilters={searchParams}
            />
        </div>
    );
}
