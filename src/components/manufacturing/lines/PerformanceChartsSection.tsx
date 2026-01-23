'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function PerformanceChartsSection() {
  const t = useTranslations('manufacturing.production_lines');
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock data - replace with actual data from getLineKPIs()
  const utilizationData = [
    { time: '08:00', running: 4, idle: 1 },
    { time: '09:00', running: 5, idle: 0 },
    { time: '10:00', running: 5, idle: 0 },
    { time: '11:00', running: 4, idle: 1 },
    { time: '12:00', running: 3, idle: 2 },
    { time: '13:00', running: 5, idle: 0 },
    { time: '14:00', running: 4, idle: 1 },
  ];

  const throughputData = [
    { lineName: 'Line 1', target: 500, actual: 480 },
    { lineName: 'Line 2', target: 500, actual: 520 },
    { lineName: 'Line 3', target: 500, actual: 450 },
    { lineName: 'Line 4-C', target: 300, actual: 290 },
    { lineName: 'Line 4-O', target: 250, actual: 260 },
    { lineName: 'Line 5', target: 500, actual: 510 },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900">
            {t('performance_charts')}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {isExpanded && (
        <div className="p-6 border-t border-gray-200 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Utilization Trend */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">
              {t('line_utilization_today')}
            </h4>
            <div className="space-y-2">
              {utilizationData.map((data, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 w-12">{data.time}</span>
                  <div className="flex-1 ml-4 flex items-center gap-1">
                    <div
                      className="h-8 bg-gradient-to-r from-green-500 to-green-600 rounded"
                      style={{ width: `${(data.running / 5) * 100}%` }}
                    />
                    <div
                      className="h-8 bg-gray-300 rounded"
                      style={{ width: `${(data.idle / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">
                    {data.running}/5
                  </span>
                </div>
              ))}
              <div className="flex gap-4 text-xs mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded" />
                  <span>{t('running')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded" />
                  <span>{t('idle')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Throughput Comparison */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">
              {t('throughput_vs_target')}
            </h4>
            <div className="space-y-3">
              {throughputData.map((data, idx) => {
                const maxTarget = Math.max(...throughputData.map((d) => d.target));
                const targetPercent = (data.target / maxTarget) * 100;
                const actualPercent = (data.actual / maxTarget) * 100;

                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{data.lineName}</span>
                      <span className="text-gray-600">
                        {data.actual}/{data.target}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-6 bg-gray-200 rounded"
                        style={{ width: `${targetPercent}%` }}
                      />
                      <div
                        className="h-6 bg-gradient-to-r from-green-500 to-green-600 rounded absolute"
                        style={{
                          width: `${actualPercent}%`,
                          position: 'relative',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-4 text-xs mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 rounded" />
                  <span>{t('target')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded" />
                  <span>{t('actual')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
