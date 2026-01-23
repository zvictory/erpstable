'use client';

import { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface LeanProductionWidgetProps {
  downtime?: Array<{
    category: string;
    minutes: number;
    occurrences: number;
    reason: string;
  }>;
  timeRange?: 'today' | 'week' | 'month';
}

// Six Big Losses framework categories
const SIX_BIG_LOSSES = {
  breakdown: { name: 'Equipment Breakdowns', color: '#ef4444', icon: '🔴', category: 'breakdown' },
  setup_adjustment: { name: 'Setup & Adjustment', color: '#f97316', icon: '🟠', category: 'setup_adjustment' },
  idling_stops: { name: 'Idling & Stops', color: '#eab308', icon: '🟡', category: 'idling_stops' },
  speed_loss: { name: 'Speed Loss', color: '#84cc16', icon: '🟢', category: 'speed_loss' },
  startup_reject: { name: 'Startup Rejects', color: '#06b6d4', icon: '🔵', category: 'startup_reject' },
  quality_defect: { name: 'Quality Defects', color: '#8b5cf6', icon: '🟣', category: 'quality_defect' },
  planned_maintenance: { name: 'Planned Maintenance', color: '#d946ef', icon: '🩷', category: 'planned_maintenance' },
  material_shortage: { name: 'Material Shortage', color: '#6b7280', icon: '⚫', category: 'material_shortage' },
  operator_absence: { name: 'Operator Absence', color: '#a3a3a3', icon: '⚪', category: 'operator_absence' },
};

export function LeanProductionWidget({
  downtime = [],
  timeRange = 'today'
}: LeanProductionWidgetProps) {

  // Process downtime data by Six Big Losses categories
  const processedData = useMemo(() => {
    const result = Object.entries(SIX_BIG_LOSSES).map(([key, loss]) => {
      const categoryData = downtime.find(d => d.category === key) || { minutes: 0, occurrences: 0, reason: '' };
      return {
        category: key,
        name: loss.name,
        icon: loss.icon,
        color: loss.color,
        minutes: categoryData.minutes || 0,
        occurrences: categoryData.occurrences || 0,
        reason: categoryData.reason || '',
      };
    });

    return result.sort((a, b) => b.minutes - a.minutes);
  }, [downtime]);

  // Calculate total and percentages
  const totalDowntimeMinutes = useMemo(() => {
    return processedData.reduce((sum, item) => sum + item.minutes, 0);
  }, [processedData]);

  const dataWithPercentages = useMemo(() => {
    return processedData.map(item => ({
      ...item,
      percentage: totalDowntimeMinutes > 0
        ? ((item.minutes / totalDowntimeMinutes) * 100).toFixed(1)
        : 0,
    }));
  }, [processedData, totalDowntimeMinutes]);

  // Get top issues
  const topIssues = useMemo(() => {
    return dataWithPercentages.slice(0, 3);
  }, [dataWithPercentages]);

  // Get actionable insights
  const insights = useMemo(() => {
    const recommendations: Array<{ category: string; action: string; priority: 'high' | 'medium' | 'low' }> = [];

    dataWithPercentages.forEach((item) => {
      if (item.minutes > 120) {
        recommendations.push({
          category: item.name,
          action: `High downtime in ${item.name.toLowerCase()}. Schedule preventive maintenance or process review.`,
          priority: 'high',
        });
      } else if (item.minutes > 60) {
        recommendations.push({
          category: item.name,
          action: `Monitor ${item.name.toLowerCase()} closely. Consider root cause analysis.`,
          priority: 'medium',
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [dataWithPercentages]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return processedData
      .filter(item => item.minutes > 0)
      .map(item => ({
        name: item.name,
        value: item.minutes,
        color: item.color,
      }));
  }, [processedData]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-blue-600" />
              Six Big Losses Analysis
            </h3>
            <p className="text-sm text-gray-500 mt-1">Lean Production Framework - {timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">
              {Math.floor(totalDowntimeMinutes)}
            </div>
            <div className="text-xs text-gray-500">total downtime (min)</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topIssues.map((item) => (
            <div
              key={item.category}
              className="p-4 rounded-lg border-l-4 bg-gradient-to-br from-slate-50 to-white"
              style={{ borderColor: item.color }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl">{item.icon}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-2">{item.name}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {item.minutes}
                    <span className="text-xs text-gray-500 ml-1">min</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {item.occurrences} event{item.occurrences !== 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  className="text-3xl font-bold text-center"
                  style={{ color: item.color }}
                >
                  {item.percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Distribution of Downtime</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name.split(' ')[0]} ${((entry.value / totalDowntimeMinutes) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value} min`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Downtime by Category</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={processedData.filter(item => item.minutes > 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="icon" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value} min`} />
                  <Bar dataKey="minutes" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {processedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Insights & Recommendations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            Actionable Insights
          </h4>

          {insights.length > 0 ? (
            <ul className="space-y-2">
              {insights.slice(0, 3).map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
                    insight.priority === 'high' ? 'bg-red-200 text-red-800' :
                    insight.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {insight.priority.toUpperCase()}
                  </span>
                  <span>{insight.action}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-blue-800">✓ No significant downtime issues detected. Continue monitoring production lines.</p>
          )}
        </div>

        {/* Full Category Breakdown */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Complete Breakdown - All Categories</h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {dataWithPercentages.map((item) => (
              <div key={item.category} className="flex items-center justify-between p-2 hover:bg-white rounded transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl">{item.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.occurrences} occurrences</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{item.minutes} min</div>
                  <div
                    className="text-xs font-semibold mt-1 px-2 py-1 rounded"
                    style={{ backgroundColor: item.color + '20', color: item.color }}
                  >
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend & Explanation */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Six Big Losses Framework
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            The Six Big Losses framework identifies the main sources of production line downtime and inefficiency.
            By tracking and analyzing these categories, you can prioritize improvements and eliminate the most impactful
            waste sources. Focus efforts on the categories with the highest downtime percentages for maximum ROI.
          </p>
        </div>
      </div>
    </div>
  );
}
