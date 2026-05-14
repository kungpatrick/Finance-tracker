/**
 * Mock AI Prediction Service for 2026 Finance Tracker.
 * In a real-world scenario, this would use a model to analyze historical velocity.
 */
export interface PredictionResult {
  isRisk: boolean;
  message: string;
  projectedTotal: number;
  runwayDays?: number;
  action?: { type: 'PAY_DEBT' | 'FUND_GOAL'; targetId?: string };
}

export const getBudgetPrediction = (
  totalSpent: number, 
  limit: number, 
  daysPassed: number, 
  daysInMonth: number = 30,
  upcomingFixedCosts: number = 0, 
  highestInterestDebt?: { id: string; name: string; interestRate: number; remainingAmount: number }, 
  currentNetCashFlow: number = 0, 
  totalSavingsBalance: number = 0,
  urgentGoal?: { id: string; name: string }
): PredictionResult => {
  const safetyMargin = 1.05; // 5% uncertainty buffer for 2026 volatility
  
  // Stability check: Projections are highly volatile in the first 3 days
  if (daysPassed < 3) {
    return { isRisk: false, message: "Gathering baseline spending velocity...", projectedTotal: totalSpent + upcomingFixedCosts };
  }

  // Calculate velocity based on variable spending (excluding known fixed costs)
  const variableSpent = Math.max(0, totalSpent - (daysPassed / daysInMonth * upcomingFixedCosts));
  const velocity = variableSpent / daysPassed;
  const projection = (velocity * (daysInMonth - daysPassed) * safetyMargin) + totalSpent + upcomingFixedCosts;
  const overage = projection - limit;

  // Calculate Liquidity Runway: How many days until user hits $0 across all savings?
  // Liquidity is the available buffer (Savings + Monthly surplus/deficit)
  const liquidity = totalSavingsBalance + currentNetCashFlow;
  const currentRunway = velocity > 0 ? Math.max(0, Math.floor(liquidity / velocity)) : 999;

  if (limit > 0 && projection > limit) {
    return {
      isRisk: true,
      message: `Projected overage of $${overage.toFixed(2)} including upcoming bills. Target daily spend: $${Math.max(0, (limit - totalSpent - upcomingFixedCosts) / (daysInMonth - daysPassed)).toFixed(2)}.`,
      projectedTotal: projection,
      runwayDays: currentRunway
    };
  }

  let debtAdvice = "";
  let action = undefined;

  if (highestInterestDebt && highestInterestDebt.interestRate > 10 && highestInterestDebt.remainingAmount > 0) { // Example threshold for high interest
    if (currentNetCashFlow > 0 && highestInterestDebt.interestRate > 5) { // If net cash flow is positive and debt is high interest
      debtAdvice = ` You have a positive cash flow. Consider directing funds towards your ${highestInterestDebt.name} debt (${highestInterestDebt.interestRate}% interest) to save on interest.`;
      action = { type: 'PAY_DEBT' as const, targetId: highestInterestDebt.id };
    } else if (totalSavingsBalance > 0 && highestInterestDebt.interestRate > 5) { // If there are savings and debt is high interest
      debtAdvice = ` You have savings of $${totalSavingsBalance.toLocaleString()}. Consider using some to pay down your ${highestInterestDebt.name} debt (${highestInterestDebt.interestRate}% interest) to reduce high-cost interest payments.`;
      action = { type: 'PAY_DEBT' as const, targetId: highestInterestDebt.id };
    } else {
      debtAdvice = ` Prioritize repayment of your ${highestInterestDebt.name} debt (${highestInterestDebt.interestRate}% interest).`;
    }
  } else if (!action && currentNetCashFlow > 200 && urgentGoal) {
    const suggestionAmount = Math.floor(currentNetCashFlow * 0.5);
    debtAdvice = ` You have a healthy surplus this month! Consider moving $${suggestionAmount} to your "${urgentGoal.name}" goal.`;
    action = { type: 'FUND_GOAL' as const, targetId: urgentGoal.id };
  }

  // Slack Detection: If we are deep into the month and spending is very low
  const progress = daysPassed / daysInMonth;
  if (!action && limit > 0 && progress > 0.5 && totalSpent < (limit * progress * 0.5)) {
    const slack = Math.floor(limit - projection);
    if (slack > 50) {
      debtAdvice = ` You're spending way below budget! You could reallocate ~$${slack} of your remaining ${limit} budget to accelerate your financial goals.`;
    }
  }

  return { 
    isRisk: false, 
    message: `You are spending at a sustainable rate for this budget.${debtAdvice}`, 
    projectedTotal: projection,
    runwayDays: currentRunway,
    action
  };
};