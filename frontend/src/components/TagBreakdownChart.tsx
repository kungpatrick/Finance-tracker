import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction } from '../hooks/useTransactions';

interface TagBreakdownChartProps {
  transactions: Transaction[];
}

export const TagBreakdownChart: React.FC<TagBreakdownChartProps> = ({ transactions }) => {
  const data = useMemo(() => {
    const tagMap: Record<string, number> = {};
    
    transactions
      .filter(t => t.type === 'expense' && t.tags)
      .forEach(t => {
        t.tags?.forEach(tag => {
          tagMap[tag] = (tagMap[tag] || 0) + Number(t.amount);
        });
      });

    return Object.entries(tagMap)
      .map(([name, amount]) => ({ name: `#${name}`, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors">Spending by Tag</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
            <XAxis 
              type="number" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(val) => `$${val}`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fontWeight: 'bold', fill: '#6366f1' }}
              width={80}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(val: number) => [`$${val.toLocaleString()}`, 'Total Tagged']}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};