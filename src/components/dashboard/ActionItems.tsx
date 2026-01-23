'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/navigation';

const actions = [
    {
        id: 1,
        title: "5 Ожидают Утверждения",
        description: "Заказы на закупку ожидают авторизации",
        type: "warning",
        href: "/purchasing/orders?status=pending",
        icon: Clock,
        color: "text-amber-500",
        bg: "bg-amber-50"
    },
    {
        id: 2,
        title: "3 Оповещения о Низком Запасe",
        description: "Сырье ниже точки перезаказа",
        type: "error",
        href: "/inventory/items?filter=low_stock",
        icon: AlertCircle,
        color: "text-red-500",
        bg: "bg-red-50"
    },
    {
        id: 3,
        title: "Заявка Нового Поставщика",
        description: "Проверьте детали 'TechPack Supplies'",
        type: "info",
        href: "/purchasing/vendors/new",
        icon: CheckCircle2,
        color: "text-blue-500",
        bg: "bg-blue-50"
    }
];

export default function ActionItems() {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Задачи</h3>
                <Link href="/tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Посмотреть Все</Link>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
                {actions.map((action) => (
                    <Link
                        key={action.id}
                        href={action.href}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                        <div className={cn("p-2 rounded-lg flex-shrink-0 mt-0.5", action.bg)}>
                            <action.icon size={18} className={action.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                {action.title}
                            </h4>
                            <p className="text-xs text-slate-500 truncate">
                                {action.description}
                            </p>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all mt-2" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
