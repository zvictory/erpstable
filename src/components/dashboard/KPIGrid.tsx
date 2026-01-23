import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, DollarSign, FileText, AlertTriangle, Layers } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    trend: string;
    trendDirection: 'up' | 'down' | 'neutral';
    icon: any;
    accentColor: string;
}

const MetricCard = ({ title, value, trend, trendDirection, icon: Icon, accentColor }: MetricCardProps) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Background Accent */}
            <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110", accentColor)} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={cn("p-2 rounded-lg bg-slate-50 border border-slate-100", accentColor.replace('bg-', 'text-').replace('opacity-10', ''))}>
                    <Icon size={20} className={cn(accentColor.replace('bg-', 'text-').replace('opacity-10', ''))} />
                </div>
                {trendDirection !== 'neutral' && (
                    <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                        trendDirection === 'up' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    )}>
                        {trendDirection === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trend}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-slate-500 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight font-mono">{value}</h3>
            </div>
        </div>
    );
};

export default function KPIGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard
                title="Всего Денег"
                value="145.2M UZS"
                trend="+12% к прошлому месяцу"
                trendDirection="up"
                icon={DollarSign}
                accentColor="bg-blue-500"
            />
            <MetricCard
                title="Открытые Счета (Входящие)"
                value="32.5M UZS"
                trend="+5% к прошлому месяцу"
                trendDirection="up"
                icon={FileText}
                accentColor="bg-indigo-500"
            />
            <MetricCard
                title="Счета к Оплате (Исходящие)"
                value="18.2M UZS"
                trend="-2% к прошлому месяцу"
                trendDirection="down" // Good thing for bills? Or actually represents decrease in liability? Let's assume down means less debt here or just direction. Usually green means good.
                icon={AlertTriangle}
                accentColor="bg-amber-500"
            />
            <MetricCard
                title="Стоимость Запасов"
                value="850.4M UZS"
                trend="+8% к прошлому месяцу"
                trendDirection="up"
                icon={Layers}
                accentColor="bg-emerald-500"
            />
        </div>
    );
}
