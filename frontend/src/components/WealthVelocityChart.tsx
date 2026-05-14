import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Transaction } from '../hooks/useTransactions';

interface WealthVelocityChartProps {
  transactions: Transaction[];
}

export const WealthVelocityChart: React.FC<WealthVelocityChartProps> = ({ transactions }) => {
  const data = useMemo(() => {
    const monthlyMap: Record<string, number> = {};

    // Process all transactions to calculate net change per month
    transactions.forEach(t => {
      if (t.type === 'transfer') return; // Transfers don't affect net worth speed
      
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const val = Number(t.amount);
      if (t.type === 'income') {
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + val;
      } else {
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) - val;
      }
    });

    return Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, velocity]) => ({
        month,
        velocity: Number(velocity.toFixed(2)),
        displayDate: new Date(month + '-02').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      }));
  }, [transactions]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white transition-colors">Wealth Velocity</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Net Worth growth speed (Income - Expenses)</p>
      </div>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-800" />
            <XAxis 
              dataKey="displayDate" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#9ca3af' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickFormatter={(val) => `$${val.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(val: number) => [`${val >= 0 ? '+' : ''}$${val.toLocaleString()}`, 'Growth Speed']}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.velocity >= 0 ? '#10b981' : '#ef4444'} 
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};