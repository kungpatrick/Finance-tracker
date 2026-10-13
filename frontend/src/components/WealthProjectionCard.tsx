import React, { useMemo } from 'react';

interface WealthProjectionCardProps {
  currentNetWorth: number;
  monthlyNetFlow: number;
  totalDebt?: number;
}

export const WealthProjectionCard: React.FC<WealthProjectionCardProps> = ({ 
  currentNetWorth, 
  monthlyNetFlow,
  totalDebt = 0 
}) => {
  const projections = useMemo(() => {
    // Project based on the "habit" (average monthly flow)
    const oneYear = currentNetWorth + (monthlyNetFlow * 12);
    const fiveYear = currentNetWorth + (monthlyNetFlow * 60);
    
    return { oneYear, fiveYear };
  }, [currentNetWorth, monthlyNetFlow]);

  const payoffMilestone = useMemo(() => {
    const debt = Math.max(0, totalDebt);
    if (debt <= 0.01) {
      return {
        title: 'Debt-Free! 🎉',
        subtext: 'Zero outstanding debts',
        badge: '✨ 100% Debt-Free',
        badgeColor: 'bg-emerald-100 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-200',
      };
    }

    if (monthlyNetFlow <= 0) {
      return {
        title: 'Action Needed',
        subtext: `$${debt.toLocaleString(undefined, { maximumFractionDigits: 0 })} debt · Net growth ≤ $0/mo`,
        badge: '⚠️ Payoff Paused',
        badgeColor: 'bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-200',
      };
    }

    const months = Math.ceil(debt / monthlyNetFlow);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);
    const dateFormatted = targetDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

    return {
      title: dateFormatted,
      subtext: `~${months} ${months === 1 ? 'month' : 'months'} to pay off $${debt.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      badge: `🎯 ${months} mo horizon`,
      badgeColor: 'bg-indigo-100 dark:bg-white/20 text-indigo-700 dark:text-white',
    };
  }, [totalDebt, monthlyNetFlow]);

  return (
    <div className="bg-white dark:bg-gradient-to-br dark:from-indigo-600 dark:to-violet-700 p-6 rounded-2xl shadow-sm dark:shadow-xl text-gray-900 dark:text-white mb-6 border border-gray-200 dark:border-white/10 relative overflow-hidden transition-all hover:shadow-indigo-500/20">
      {/* Decorative background element */}
      <div className="absolute -right-8 -top-8 w-48 h-48 bg-indigo-50 dark:bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-100/50 dark:bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-100 mb-1">Wealth Projection</h3>
            <p className="text-xs text-gray-500 dark:text-indigo-200/80">Future trajectory based on current spending & income habits</p>
          </div>
          <div className="px-3 py-1 bg-indigo-50 dark:bg-white/10 backdrop-blur-md rounded-full border border-indigo-100 dark:border-white/20">
            <span className="text-[10px] font-bold uppercase tracking-tight text-indigo-700 dark:text-white">AI Analysis Active ✨</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="space-y-0.5">
            <p className="text-gray-400 dark:text-indigo-100/70 text-[10px] font-bold uppercase tracking-wider">1 Year Target</p>
            <div className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
              ${projections.oneYear.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${monthlyNetFlow >= 0 ? 'bg-green-100 dark:bg-green-400/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-400/20 text-red-700 dark:text-red-300'}`}>
              {monthlyNetFlow >= 0 ? '↑' : '↓'} ${Math.abs(monthlyNetFlow * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} from current
            </div>
          </div>
          
          <div className="space-y-0.5">
            <p className="text-gray-400 dark:text-indigo-100/70 text-[10px] font-bold uppercase tracking-wider">5 Year Vision</p>
            <div className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
              ${projections.fiveYear.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${monthlyNetFlow >= 0 ? 'bg-green-100 dark:bg-green-400/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-400/20 text-red-700 dark:text-red-300'}`}>
              {monthlyNetFlow >= 0 ? '↑' : '↓'} ${Math.abs(monthlyNetFlow * 60).toLocaleString(undefined, { maximumFractionDigits: 0 })} from current
            </div>
          </div>

          <div className="space-y-0.5 border-t md:border-t-0 md:border-l border-gray-100 dark:border-white/10 pt-4 md:pt-0 md:pl-8">
            <p className="text-gray-400 dark:text-indigo-100/70 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span>Debt-Free Horizon</span>
              <span>🏁</span>
            </p>
            <div className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
              {payoffMilestone.title}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${payoffMilestone.badgeColor}`}>
                {payoffMilestone.badge}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-indigo-100/70 font-medium">
                {payoffMilestone.subtext}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">📊</span>
            <p className="text-[11px] text-gray-500 dark:text-indigo-100/60 font-medium">
              Calculation logic: Currently averaging <span className="text-indigo-600 dark:text-white font-bold">${monthlyNetFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> in net growth per month.
              {totalDebt > 0 && monthlyNetFlow > 0 ? (
                <> Estimated to clear all debts by <span className="font-bold text-indigo-600 dark:text-white">{payoffMilestone.title}</span>.</>
              ) : null}
            </p>
          </div>
          {totalDebt > 0 ? (
            <span className="text-[10px] font-bold uppercase tracking-tight text-rose-600 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/40">
              Outstanding Debt: ${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-600 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
              Debt-Free Baseline
            </span>
          )}
        </div>
      </div>
    </div>
  );
};