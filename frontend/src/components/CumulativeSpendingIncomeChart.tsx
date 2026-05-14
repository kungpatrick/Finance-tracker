import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '../hooks/useTransactions';

interface CumulativeSpendingIncomeChartProps {
  transactions: Transaction[];
}

export const CumulativeSpendingIncomeChart: React.FC<CumulativeSpendingIncomeChartProps> = ({ transactions }) => {
  const data = useMemo(() => {
    // Sort transactions by date to ensure correct cumulative calculation
    const sortedTransactions = [...transactions].sort((a, b) =>
      new Date(a.transaction_date || 0).getTime() - new Date(b.transaction_date || 0).getTime()
    );

    const dailyDataMap: { [date: string]: { expenses: number; income: number } } = {};

    sortedTransactions.forEach(t => {
      const date = (t.transaction_date || '').split('T')[0]; // Get YYYY-MM-DD
      if (!dailyDataMap[date]) {
        dailyDataMap[date] = { expenses: 0, income: 0 };
      }
      if (t.type === 'expense') {
        dailyDataMap[date].expenses += t.amount;
      } else if (t.type === 'income') {
        dailyDataMap[date].income += t.amount;
      }
    });

    const chartData: { date: string; cumulativeExpense: number; cumulativeIncome: number; displayDate: string }[] = [];
    let cumulativeExpense = 0;
    let cumulativeIncome = 0;

    // Get all unique dates and sort them
    const uniqueDates = Object.keys(dailyDataMap).sort();

    uniqueDates.forEach(date => {
      cumulativeExpense += dailyDataMap[date].expenses;
      cumulativeIncome += dailyDataMap[date].income;

      chartData.push({
        date,
        cumulativeExpense: Number(cumulativeExpense.toFixed(2)),
        cumulativeIncome: Number(cumulativeIncome.toFixed(2)),
        displayDate: new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      });
    });

    return chartData;
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Spending & Income</h3>
        <p className="text-center text-gray-500">No data to display for cumulative trends.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors">Spending & Income</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:fill-gray-400" minTickGap={30} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:fill-gray-400" tickFormatter={(val) => `$${val}`} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number, name: string, props) => [`$${value.toFixed(2)}`, props?.payload?.[0]?.name || name]} />
            <Legend />
            <Line type="monotone" dataKey="cumulativeExpense" stroke="#ef4444" strokeWidth={2} dot={false} name="Cumulative Expense" /> {/* Red for expense */}
            <Line type="monotone" dataKey="cumulativeIncome" stroke="#22c55e" strokeWidth={2} dot={false} name="Cumulative Income" /> {/* Green for income */}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};