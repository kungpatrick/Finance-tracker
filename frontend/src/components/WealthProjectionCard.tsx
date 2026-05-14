import React, { useMemo } from 'react';

interface WealthProjectionCardProps {
  currentNetWorth: number;
  monthlyNetFlow: number;
}

export const WealthProjectionCard: React.FC<WealthProjectionCardProps> = ({ currentNetWorth, monthlyNetFlow }) => {
  const projections = useMemo(() => {
    // Project based on the "habit" (average monthly flow)
    const oneYear = currentNetWorth + (monthlyNetFlow * 12);
    const fiveYear = currentNetWorth + (monthlyNetFlow * 60);
    
    return { oneYear, fiveYear };
  }, [currentNetWorth, monthlyNetFlow]);

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-0.5">
            <p className="text-gray-400 dark:text-indigo-100/70 text-[10px] font-bold uppercase tracking-wider">1 Year Target</p>
            <div className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
              ${projections.oneYear.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${monthlyNetFlow >= 0 ? 'bg-green-100 dark:bg-green-400/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-400/20 text-red-700 dark:text-red-300'}`}>
              {monthlyNetFlow >= 0 ? '↑' : '↓'} ${Math.abs(monthlyNetFlow * 12).toLocaleString()} from current
            </div>
          </div>
          
          <div className="space-y-0.5">
            <p className="text-gray-400 dark:text-indigo-100/70 text-[10px] font-bold uppercase tracking-wider">5 Year Vision</p>
            <div className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
              ${projections.fiveYear.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${monthlyNetFlow >= 0 ? 'bg-green-100 dark:bg-green-400/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-400/20 text-red-700 dark:text-red-300'}`}>
              {monthlyNetFlow >= 0 ? '↑' : '↓'} ${Math.abs(monthlyNetFlow * 60).toLocaleString()} from current
            </div>
          </div>
        </div>
        
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10 flex items-center gap-2">
          <span className="text-xs">📊</span>
          <p className="text-[11px] text-gray-500 dark:text-indigo-100/60 font-medium">
            Calculation logic: Currently averaging <span className="text-indigo-600 dark:text-white font-bold">${monthlyNetFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> in net growth per month.
          </p>
        </div>
      </div>
    </div>
  );
};