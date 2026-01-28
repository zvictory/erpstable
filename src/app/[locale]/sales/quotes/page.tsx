import { db } from '../../../../db';
import { invoices } from '../../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { Plus, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  // Get all quotes
  const quotes = await db.query.invoices.findMany({
    where: eq(invoices.type, 'QUOTE'),
    with: {
      customer: {
        columns: {
          id: true,
          name: true,
        },
      },
      opportunity: {
        columns: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: desc(invoices.createdAt),
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quotes</h1>
            <p className="text-slate-600 mt-1">{quotes.length} quotes total</p>
          </div>
          <Link href="/sales/pipeline">
            <Button>
              <Plus size={16} className="mr-2" />
              New Quote (from Opportunity)
            </Button>
          </Link>
        </div>

        {/* Quotes List */}
        {quotes.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">No quotes yet</p>
            <p className="text-sm text-slate-400 mb-6">
              Create quotes from opportunities in the pipeline
            </p>
            <Link href="/sales/pipeline">
              <Button>Go to Pipeline</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                    Quote #
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                    Opportunity
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">
                    Valid Until
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">
                    Amount
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/sales/quotes/${quote.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {quote.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {quote.customer.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {quote.opportunity ? (
                        <Link
                          href={`/sales/opportunities/${quote.opportunity.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {quote.opportunity.title}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(quote.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {quote.validUntil
                        ? new Date(quote.validUntil).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(quote.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {quote.quoteAcceptedAt ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                          Accepted
                        </span>
                      ) : quote.validUntil &&
                        new Date(quote.validUntil) < new Date() ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                          Expired
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          Open
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
