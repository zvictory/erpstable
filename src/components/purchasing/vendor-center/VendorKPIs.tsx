import { Card, CardContent } from "@/components/ui/Card";
import { formatCurrency } from '@/lib/format';

interface VendorKPIsProps {
    totalVendors: number;
    totalAP: number; // in Tiyin
    ytdSpend: number; // in Tiyin
    avgLeadTime?: string;
}

export function VendorKPIs({
    totalVendors,
    totalAP,
    ytdSpend,
    avgLeadTime = "4 Days"
}: VendorKPIsProps) {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
                <CardContent className="pt-6">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Vendors</label>
                    <div className="text-2xl font-bold text-slate-900 font-numbers">{totalVendors}</div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total AP (Outstanding)</label>
                    <div className="text-2xl font-bold text-rose-600 font-numbers">{formatCurrency(totalAP)}</div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">YTD Spend</label>
                    <div className="text-2xl font-bold text-slate-900 font-numbers">{formatCurrency(ytdSpend)}</div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Lead Time</label>
                    <div className="text-2xl font-bold text-slate-900 font-numbers">{avgLeadTime}</div>
                </CardContent>
            </Card>
        </div>
    );
}
