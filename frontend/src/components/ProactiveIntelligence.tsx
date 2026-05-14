import React, { useMemo } from 'react';
import { Transaction } from '../hooks/useTransactions';
import { Budget } from '../hooks/useBudgets';
import { Goal } from './SavingsGoals';
import { Debt } from './LiabilitiesAndDebts';

interface ProactiveIntelligenceProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  onAction: (action: any) => void;
}

export const ProactiveIntelligence: React.FC<ProactiveIntelligenceProps> = ({
  transactions,
  budgets,
  goals,
  debts,
  onAction
}) => {
  const insights = useMemo(() => {
    const list: { type: 'alert' | 'insight'; message: string; action?: { type: string; title: string; contextName?: string; initialData?: any } }[] = [];

    // 1. Budget Alerts
    const spendingByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    budgets.forEach(b => {
      const spent = spendingByCategory[b.category] || 0;
      const percent = (spent / b.limit_amount) * 100;
      if (percent >= 90 && percent < 100) {
        list.push({
          type: 'alert',
          message: `Warning: You've used ${percent.toFixed(0)}% of your ${b.category} budget.`,
          action: { type: 'OPTIMIZE_BUDGET', title: 'Adjust Budget', contextName: b.category, initialData: b }
        });
      } else if (percent >= 100) {
        list.push({
          type: 'alert',
          message: `Critical: You've exceeded your ${b.category} budget by $${(spent - b.limit_amount).toFixed(2)}.`,
          action: { type: 'OPTIMIZE_BUDGET', title: 'Emergency Re-allocation', contextName: b.category, initialData: b }
        });
      }
    });

    // 2. High Interest Debt Insight
    const highInterestDebt = debts.find(d => (d.interest_rate || 0) > 15 && d.remaining_amount > 0);
    if (highInterestDebt) {
      list.push({
        type: 'insight',
        message: `High interest detected on "${highInterestDebt.name}" (${highInterestDebt.interest_rate}%). A $100 extra payment now saves approx. $${((highInterestDebt.interest_rate || 0) / 12 * 1).toFixed(2)} in interest next month.`,
        action: { type: 'PAY_DEBT', title: 'Accelerated Payoff', contextName: highInterestDebt.name, initialData: { id: highInterestDebt.id, amount: 100 } }
      });
    }

    // 3. Goal Projection Insight
    const firstGoal = goals.find(g => (g.current_amount || 0) < g.target_amount);
    if (firstGoal && !firstGoal.deadline) {
        list.push({
            type: 'insight',
            message: `Savings Goal "${firstGoal.name}" has no deadline. Adding one helps the AI calculate your required monthly savings.`,
            action: { type: 'EDIT_GOAL', title: 'Update Goal Planning', initialData: firstGoal }
        });
    }

    return list;
  }, [transactions, budgets, goals, debts]);

  if (insights.length === 0) return null;

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm overflow-hidden mb-8 transition-colors">
      <div className="bg-indigo-600 px-6 py-3 flex items-center gap-2">
        <span className="text-xl">✨</span>
        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Proactive Intelligence</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {insights.map((item, idx) => (
          <div key={idx} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            <div className="flex gap-3">
              <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${item.type === 'alert' ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} />
              <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                {item.message}
              </p>
            </div>
            {item.action && (
              <button 
                onClick={() => onAction(item.action)}
                className="whitespace-nowrap px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                Take Action Now
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};