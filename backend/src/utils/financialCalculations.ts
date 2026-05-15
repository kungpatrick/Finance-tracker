import { getBudgetPrediction } from '../services/predictionService.js';
import { 
  Debt, Budget, AIContextDebt, AIContextGoal, 
  DailyTrajectoryRow 
} from '../types/finance.js';

export function calculateDebtMetrics(debts: Debt[]) {
  const totalDebt = debts.reduce((sum: number, d: Debt) => sum + parseFloat(d.remaining_amount || '0'), 0);
  const monthlyDebtMin = debts.reduce((sum: number, d: Debt) => sum + parseFloat(d.min_payment || '0'), 0);
  const totalWeight = debts.reduce((sum: number, d: Debt) => sum + (parseFloat(d.remaining_amount) * parseFloat(d.interest_rate || '0')), 0);
  const avgInterestRate = totalDebt > 0 ? (totalWeight / totalDebt) / 100 : 0;
  return { totalDebt, monthlyDebtMin, avgInterestRate };
}

export function calculateDebtPayoffForecast(totalDebt: number, monthlyDebtMin: number, netCashFlow: number, avgInterestRate: number) {
  const repaymentCapacity = monthlyDebtMin + Math.max(0, netCashFlow * 0.5);
  const monthsToDebtFree = repaymentCapacity > 0 ? Math.ceil(totalDebt / repaymentCapacity) : 999;
  
  const monthsAtMin = monthlyDebtMin > 0 ? Math.ceil(totalDebt / monthlyDebtMin) : 999;
  const monthlyInterestCost = (totalDebt * avgInterestRate) / 12;
  const estimatedInterestSaved = Math.max(0, Math.round((monthsAtMin - monthsToDebtFree) * monthlyInterestCost));
  const totalProjectedInterest = Math.round(monthsToDebtFree * monthlyInterestCost);
  
  return {
    months: monthsToDebtFree,
    date: new Date(new Date().setMonth(new Date().getMonth() + monthsToDebtFree)).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
    capacity: repaymentCapacity,
    interestSaved: estimatedInterestSaved,
    projectedInterestCost: totalProjectedInterest
  };
}

export function getMonthlyProgressDetails(monthStr: string | undefined) {
  const currentMonthStr = monthStr || new Date().toISOString().slice(0, 7);
  const year = Number(currentMonthStr.split('-')[0]);
  const monthNum = Number(currentMonthStr.split('-')[1]);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === monthNum;
  const isFutureMonth = new Date(year, monthNum - 1, 1) > today;

  let currentDay;
  let daysRemainingIncludingToday;
  let monthProgress;

  if (isCurrentMonth) {
    currentDay = today.getDate();
    daysRemainingIncludingToday = Math.max(1, (daysInMonth - currentDay) + 1);
    monthProgress = Math.max(0.01, currentDay / daysInMonth);
  } else if (isFutureMonth) {
    currentDay = 0;
    daysRemainingIncludingToday = daysInMonth;
    monthProgress = 0.01; // Small initial progress for future month projections
  } else {
    // Past month
    currentDay = daysInMonth;
    daysRemainingIncludingToday = 1;
    monthProgress = 1.0;
  }
  return { currentDay, daysRemainingIncludingToday, monthProgress, daysInMonth };
}

export function calculateBudgetSummary(budgets: Budget[], rolloverCredits: Record<string, number>, totalSpent: number, totalTransfers: number, totalFixedCosts: number) {
  const totalBudget = budgets.reduce((sum: number, b: Budget) => sum + parseFloat(b.limit_amount) + (b.is_rollover ? (rolloverCredits[b.category] || 0) : 0), 0);
  const remaining = Math.max(totalBudget - (totalSpent + totalTransfers) - totalFixedCosts, 0);
  return { totalBudget, remaining };
}

export function calculateHealthMetrics(totalIncome: number, totalSpent: number, totalBudget: number, totalFixedCosts: number, monthlyDebtMin: number, monthProgress: number, netCashFlow: number, totalAssets: number) {
  const dtiRatio = totalIncome > 0 ? ((totalFixedCosts + monthlyDebtMin) / totalIncome) * 100 : 0;
  const burnRate = totalBudget > 0 ? Math.min(5, (totalSpent / totalBudget) / monthProgress) : 0;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  const scoreSavings = Math.min(100, (savingsRate / 20) * 100); // Target 20% savings rate
  const scoreBurn = burnRate <= 1 ? 100 : Math.max(0, 100 - (burnRate - 1) * 100); // Target burn rate <= 1
  const scoreDTI = dtiRatio < 36 ? 100 : Math.max(0, 100 - (dtiRatio - 36) * 2); // Target DTI < 36%
  const healthScore = Math.round((scoreSavings * 0.4) + (scoreBurn * 0.3) + (scoreDTI * 0.3));

  return { dtiRatio, burnRate, savingsRate, healthScore, scoreSavings, scoreBurn, scoreDTI };
}

export function calculateProjections(netWorth: number, netCashFlow: number, totalAssets: number) {
  return {
    oneYear: Math.round(netWorth + (netCashFlow * 12) + (totalAssets * 0.05)), // Assuming 5% asset growth
    fiveYear: Math.round(netWorth + (netCashFlow * 60) + (totalAssets * 0.276)), // Includes ~5% compounded growth
  };
}

export function getGlobalAIInsight(
  totalSpent: number,
  totalBudget: number,
  currentDay: number,
  totalFixedCosts: number,
  highestInterestDebt: AIContextDebt | null,
  netCashFlow: number,
  totalAssets: number,
  urgentGoal: AIContextGoal | null
) {
  return getBudgetPrediction(
    limit: ettrestDebt,
    urgentGoal
  });
}

interface BudgetRow { category: string; limit_amount: string; }
interface SpendingRow { category: string; total: string; }
rt function calculateOptimizationSuggestions(
  budgets: BudgetRow[], 
  spending: SpendingRow[], 
  monthProgress: number
) {
  const suggestions = budgets.map(b => {
    const spent = parseFloat(spending.find(s => s.category === b.category)?.total || '0');
    const limit = parseFloat(b.limit_amount);
    const projected = spent / monthProgress;
    const slack = limit - projected;

    if (limit > 50 && spent < (limit * monthProgress * 0.6) && slack > 20) {
      return {
        category: b.category,
        currentLimit: limit,
        suggestedLimit: Math.round(projected + 20),
        slack: Math.max(0, Math.round(limit - (projected + 20)))
      };
    }
    return null;
  }).filter(Boolean);
  
  const totalSlack = suggestions.reduce((sum, s) => sum + s!.slack, 0);
  return { suggestions, totalSlack };
}

export function mapDailyTrajectory(trends: DailyTrajectoryRow[], totalDebt: number, totalAssets: number) {
  return trends.map((row) => {
    const balance = parseFloat(row.balance);
    return {
      date: row.date.toString(),
      balance,
      debtRemaining: totalDebt,
      netWorthDaily: (balance + totalAssets) - totalDebt,
      inflow: parseFloat(row.inflow),
      outflow: parseFloat(row.outflow)
    };
  });
}

export function formatCategoryTrends(rows: any[]) {
  const trends: Record<string, number[]> = {};
  rows.forEach(row => {
    if (!trends[row.category]) {
      trends[row.category] = [];
    }
    trends[row.category].push(parseFloat(row.total || '0'));
  });
  return trends;
}

export function generateAmortizationSchedule(principal: number, interestRate: number, monthlyPayment: number) {
  const annualRate = interestRate / 100;
  const monthlyRate = annualRate / 12;
  if (monthlyRate > 0 && (principal * monthlyRate) >= monthlyPayment) return { error: 'Negative Amortization' };
  const schedule = [];
  let balance = principal;
  let month = 0;
  while (balance > 0 && month < 360) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.max(0, Math.min(balance, monthlyPayment - interest));
    if (principalPaid <= 0 && balance > 0) break;
    balance -= principalPaid;
    month++;
    schedule.push({ month, interest, principalPaid, balance: Math.max(0, balance) });
  }
  return schedule;
}