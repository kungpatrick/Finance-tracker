import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Debt } from './LiabilitiesAndDebts';

interface AmortizationModalProps {
  debt: Debt;
  onClose: () => void;
}

export const AmortizationModal: React.FC<AmortizationModalProps> = ({ debt, onClose }) => {
  const schedule = useMemo(() => {
    const data = [];
    let balance = debt.remaining_amount;
    const monthlyRate = (debt.interest_rate || 0) / 12 / 100;
    const payment = debt.min_payment || 0;
    let month = 0;
    const maxMonths = 600; // 50 years safety cap

    data.push({
      month: 0,
      balance: Number(balance.toFixed(2)),
    });

    // Check if payment covers interest
    if (payment <= balance * monthlyRate && monthlyRate > 0) {
      return null; // Infinite debt
    }

    while (balance > 0 && month < maxMonths) {
      month++;
      const interest = balance * monthlyRate;
      const principal = Math.min(payment - interest, balance);
      balance -= principal;

      data.push({
        month,
        balance: Number(balance.toFixed(2)),
      });
    }
    return data;
  }, [debt]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1300] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-gray-200 dark:border-gray-700 transition-colors">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2"
        >
          ✕
        </button>
        
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Payoff Schedule: {debt.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Payoff estimate at {debt.interest_rate}% APR with ${debt.min_payment?.toFixed(2)}/mo payment.
          </p>
        </div>

        {!schedule ? (
          <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold">Critical Payoff Alert</p>
              <p className="text-sm italic">The monthly payment does not cover the accruing interest. The balance will never reach zero at this rate.</p>
            </div>
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={schedule} margin={{ top: 10, right: 30, left: 10, bottom: 15 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-800" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  minTickGap={40}
                  label={{ value: 'Months to Payoff', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'Balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};