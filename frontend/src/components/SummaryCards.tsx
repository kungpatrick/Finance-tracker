import React, { useMemo } from 'react';
import { Transaction } from '../hooks/useTransactions';

interface SummaryCardsProps {
  transactions: Transaction[];
  comparisonTransactions?: Transaction[];
  totalSavings: number;
  totalDebt: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ 
  transactions, 
  comparisonTransactions = [], 
  totalSavings, 
  totalDebt 
}) => {
  const stats = useMemo(() => {
    if (transactions.length === 0) return { 
      totalExpenses: '0.00', totalIncome: '0.00', netChange: '0.00', avgExpensePerDay: '0.00', 
      maxExpense: '0.00', count: 0, topCategory: 'N/A', netWorth: (totalSavings - totalDebt).toFixed(2), 
      spendPercentChange: '0.0', isSpendingUp: false 
    };

    // Ignore transfers in spending/income stats
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    
    const clearedSpending = expenses.filter(t => t.is_reconciled).reduce((acc, t) => acc + t.amount, 0);

    const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = income.reduce((acc, t) => acc + t.amount, 0);
    const netChange = totalIncome - totalExpenses;

    const maxExpense = expenses.length > 0 ? Math.max(...expenses.map((t) => t.amount)) : 0;
    
    // Find top category by total amount spent
    const categoryTotals = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategory = Object.keys(categoryTotals).length > 0 
      ? (Object.entries(categoryTotals) as [string, number][]).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]
      : 'N/A';

    // Calculate unique days in the current selection
    const uniqueDays = new Set(expenses.map(t => (t.transaction_date || '').split('T')[0])).size;
    const avgExpensePerDay = uniqueDays > 0 ? totalExpenses / uniqueDays : 0;
    // Net Worth = Aggregated Account Balances + External Savings - External Debt
    const netWorth = (totalSavings - totalDebt).toFixed(2);

    // Comparison logic
    const prevTotalExpenses = comparisonTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const spendDiff = totalExpenses - prevTotalExpenses;
    const spendPercentChange = prevTotalExpenses > 0 ? (spendDiff / prevTotalExpenses) * 100 : 0;

    return {
      totalExpenses: totalExpenses.toFixed(2),
      totalIncome: totalIncome.toFixed(2),
      netChange: netChange.toFixed(2),
      avgExpensePerDay: avgExpensePerDay.toFixed(2),
      clearedSpending: clearedSpending.toFixed(2),
      maxExpense: maxExpense.toFixed(2),
      count: transactions.length,
      topCategory,
      netWorth,
      spendPercentChange: spendPercentChange.toFixed(1),
      isSpendingUp: spendDiff > 0
    };
  }, [transactions, comparisonTransactions, totalSavings, totalDebt]);

  const cardClass = "bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-w-[200px] transition-colors";
  const labelClass = "text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block";
  const valueClass = "text-2xl transition-colors";

  return (
    <div className="flex flex-wrap gap-4 mb-8">
      <div className={`${cardClass} border-t-4 border-t-indigo-500`}>
        <span className={labelClass}>Current Net Worth</span>
        <div className={`${valueClass} font-semibold ${Number(stats.netWorth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${stats.netWorth}</div>
      </div>
      <div className={cardClass}>
        <span className={labelClass}>Total Income</span>
        <div className={`${valueClass} font-semibold text-green-600`}>+${stats.totalIncome}</div>
      </div>
      <div className={cardClass}>
        <span className={labelClass}>Total Spending</span>
        <div className="flex flex-col">
          <div className={`${valueClass} font-semibold text-red-600`}>${stats.totalExpenses}</div>
          <span className="text-[10px] text-gray-400 font-medium">Cleared: ${stats.clearedSpending}</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          {comparisonTransactions.length > 0 && (
            <span className={`text-xs font-bold ${stats.isSpendingUp ? 'text-red-500' : 'text-green-500'}`}>
              {stats.isSpendingUp ? '↑' : '↓'} {Math.abs(Number(stats.spendPercentChange))}%
            </span>
          )}
        </div>
      </div>
      <div className={cardClass}>
        <span className={labelClass}>Net Change</span>
        <div className={`${valueClass} font-semibold ${Number(stats.netChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {Number(stats.netChange) >= 0 ? '+' : ''}${stats.netChange}
        </div>
      </div>
      <div className={cardClass}>
        <span className={labelClass}>Avg. Expense / Day</span>
        <div className={`${valueClass} font-semibold text-red-600`}>${stats.avgExpensePerDay}</div>
      </div>
      <div className={cardClass}>
        <span className={labelClass}>Largest Expense</span>
        <div className={`${valueClass} font-semibold text-red-600`}>${stats.maxExpense}</div>
      </div>
      <div className={cardClass}>
        <span className={labelClass}>Top Expense Category</span>
        <div className={`${valueClass} text-blue-600`}>{stats.topCategory}</div>
      </div>
      <div className={cardClass}>
        <span className={labelClass}>Transaction Count</span>
        <div className={`${valueClass} text-blue-600`}>{stats.count}</div>
      </div>
    </div>
  );
};