import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface HealthMetrics {
  savings: number;
  burn: number;
  debt: number;
}

interface Props {
  metrics: HealthMetrics;
}

export const FinancialHealthRadar: React.FC<Props> = ({ metrics }) => {
  const data = [
    { subject: 'Savings Rate', value: metrics.savings, fullMark: 100 },
    { subject: 'Burn Rate', value: metrics.burn, fullMark: 100 },
    { subject: 'Debt Health', value: metrics.debt, fullMark: 100 },
  ];

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-[400px] flex flex-col">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Financial Health Radar</h3>
      <div className="text-xs text-gray-500 mb-4">
        Higher scores represent better financial stability.
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Health Score"
              dataKey="value"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.6}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};