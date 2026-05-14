import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../hooks/useTransactions';

interface NetWorthTrendChartProps {
  transactions: Transaction[];
  currentNetWorth: number;
}

export const NetWorthTrendChart: React.FC<NetWorthTrendChartProps> = ({ transactions, currentNetWorth }) => {
  const data = useMemo(() => {
    // 1. Sort transactions descending by date
    const sorted = [...transactions].sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );

    const history: { date: string; value: number; displayDate: string }[] = [];
    let runningNetWorth = currentNetWorth;

    // Get unique dates in descending order
    const dates = Array.from(new Set(transactions.map(t => t.transaction_date.split('T')[0]))).sort().reverse();
    
    if (dates.length === 0) return [];

    // Add today's starting point
    history.push({
      date: 'Today',
      value: Number(runningNetWorth.toFixed(2)),
      displayDate: 'Today'
    });

    // Group transactions by date
    const grouped = sorted.reduce((acc, t) => {
      const d = t.transaction_date.split('T')[0];
      if (!acc[d]) acc[d] = 0;
      // "Rewinding": to see yesterday's balance, we subtract today's income and add today's expenses
      if (t.type === 'income') acc[d] -= t.amount;
      else if (t.type === 'expense') acc[d] += t.amount;
      // Transfers don't change net worth
      return acc;
    }, {} as Record<string, number>);

    dates.forEach(date => {
      runningNetWorth += (grouped[date] || 0);
      history.push({
        date,
        value: Number(runningNetWorth.toFixed(2)),
        displayDate: new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    });

    return history.reverse(); // Flip back to chronological
  }, [transactions, currentNetWorth]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors">Net Worth Progress</h3>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
            <XAxis 
              dataKey="displayDate" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#9ca3af' }} 
              minTickGap={40}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickFormatter={(val) => `$${val.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(val: number) => [`$${val.toLocaleString()}`, 'Net Worth']}
            />
            <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#nwGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};