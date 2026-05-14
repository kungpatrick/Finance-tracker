import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../hooks/useTransactions';

interface SpendingTrendChartProps {
  transactions: Transaction[];
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ transactions }) => {
  const data = useMemo(() => {
    const dailyMap: { [key: string]: number } = {};

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        // Group by the raw date string (YYYY-MM-DD)
        const date = t.transaction_date.split('T')[0];
        dailyMap[date] = (dailyMap[date] || 0) + t.amount;
      }
    });

    // Convert to sorted array for the chart
    return Object.keys(dailyMap)
      .sort()
      .map((date) => ({
        date,
        amount: Number(dailyMap[date].toFixed(2)),
        displayDate: new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [transactions]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors">Spending Trends</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:fill-gray-400"
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:fill-gray-400"
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#6366f1"
              fillOpacity={1}
              fill="url(#trendGradient)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};