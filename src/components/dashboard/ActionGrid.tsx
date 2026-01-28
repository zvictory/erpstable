'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileText, Banknote, Package } from 'lucide-react';

const actions = [
  {
    labelKey: 'new_invoice',
    icon: FileText,
    iconColor: 'text-blue-600',
    href: '/sales/customers?invoiceId=new',
  },
  {
    labelKey: 'new_bill',
    icon: FileText,
    iconColor: 'text-purple-600',
    href: '/purchasing/vendors?billId=new',
  },
  {
    labelKey: 'receive_payment',
    icon: Banknote,
    iconColor: 'text-green-600',
    href: '/sales/payments/new',
  },
  {
    labelKey: 'add_product',
    icon: Package,
    iconColor: 'text-slate-600',
    href: '/inventory/items?action=new',
  },
];

export default function ActionGrid() {
  const t = useTranslations('dashboard.actions');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.labelKey}
            href={action.href}
            className="bg-white h-24 p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className="flex flex-col h-full justify-between">
              <Icon className={`w-6 h-6 ${action.iconColor}`} />
              <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                {t(action.labelKey as any)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
