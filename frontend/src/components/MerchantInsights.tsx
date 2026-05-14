import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction } from '../hooks/useTransactions';

interface MerchantInsightsProps {
  transactions: Transaction[];
  onMerchantClick?: (name: string) => void;
}

export const MerchantInsights: React.FC<MerchantInsightsProps> = ({ transactions, onMerchantClick }) => {
  const merchantData = useMemo(() => {
    const merchants: Record<string, { total: number, count: number, category: string }> = {};

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const name = t.description.trim();
        if (!merchants[name]) {
          merchants[name] = { total: 0, count: 0, category: t.category };
        }
        merchants[name].total += Number(t.amount);
        merchants[name].count += 1;
      });

    return Object.entries(merchants)
      .map(([name, data]) => ({ 
        name, 
        total: Number(data.total.toFixed(2)), 
        count: data.count, 
        avg: Number((data.total / data.count).toFixed(2)),
        category: data.category 
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Show top 10
  }, [transactions]);

  if (merchantData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 animate-in fade-in duration-500">
      <div className="lg:col-span-8 bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 transition-colors">Top Merchants by Volume</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={merchantData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 'bold', fill: '#6366f1' }}
                width={120}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => [`$${val.toLocaleString()}`, 'Total Spent']}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} onClick={(data) => onMerchantClick?.(data.name)} className="cursor-pointer">
                {merchantData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="#6366f1" opacity={1 - index * 0.05} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Merchant Stats</h3>
        {merchantData.slice(0, 5).map((m, i) => (
          <div key={m.name} className="p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm transition-all hover:border-indigo-300">
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-gray-800 dark:text-white truncate max-w-[150px]">{m.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-bold uppercase">{m.category}</span>
            </div>
            <div className="flex justify-between items-end mt-2">
              <div className="text-xs text-gray-500">
                <span className="font-bold text-gray-700 dark:text-gray-300">{m.count}</span> visits • <span className="font-mono">${m.avg}</span> avg
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">${m.total.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};