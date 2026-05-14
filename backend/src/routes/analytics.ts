import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getBudgetPrediction } from '../services/predictionService.js';
import { getFinancialSummaryData, getNetWorthHistoryData, getOptimizationData, getCategoryTrendsData } from '../services/analyticsService.js';
import {
  calculateDebtMetrics, calculateDebtPayoffForecast, getMonthlyProgressDetails,
  calculateBudgetSummary, calculateHealthMetrics, calculateProjections, getGlobalAIInsight, calculateOptimizationSuggestions, mapDailyTrajectory, formatCategoryTrends
} from '../utils/financialCalculations.js';

const router = Router();
router.use(authMiddleware);

const QuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

router.get('/summary', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = QuerySchema.parse(req.query);
  const userId = req.user?.id;

  const filterDate = month ? `${month}-01` : new Date().toISOString();
  const prevMonthDate = new Date(new Date(filterDate).setMonth(new Date(filterDate).getMonth() - 1)).toISOString();

  const data = await getFinancialSummaryData(userId!, filterDate, prevMonthDate); // data is now typed

  const totalIncome = parseFloat(data.currentMonth.income || '0');
  const totalSpent = parseFloat(data.currentMonth.expense || '0');
    const totalTransfers = parseFloat(data.currentMonth.transfers || '0');
    const lastMonthTotal = parseFloat(data.lastMonth.total || '0');
    
    const rolloverCredits: Record<string, number> = {};
    data.rolloverSurplus.forEach((row: any) => {
      rolloverCredits[row.category] = parseFloat(row.surplus);
    });

    const totalFixedCosts = parseFloat(data.recurring.total || '0');
    const totalAssets = parseFloat(data.goals.total || '0');
    
    const { totalDebt, monthlyDebtMin, avgInterestRate } = calculateDebtMetrics(data.debts);

    const netCashFlow = totalIncome - totalSpent;
    const { totalBudget, remaining } = calculateBudgetSummary(data.budgets, rolloverCredits, totalSpent, totalTransfers, totalFixedCosts);

    const debtPayoffForecast = calculateDebtPayoffForecast(totalDebt, monthlyDebtMin, netCashFlow, avgInterestRate);

    const netWorth = (netCashFlow + totalAssets) - totalDebt;
    
    const { currentDay, daysRemainingIncludingToday, monthProgress, daysInMonth } = getMonthlyProgressDetails(month);

    const dailySafeToSpend = Math.max(0, remaining / daysRemainingIncludingToday);
    const momTrend = lastMonthTotal > 0 ? ((totalSpent - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    const { dtiRatio, burnRate, savingsRate, healthScore, scoreSavings, scoreBurn, scoreDTI } = calculateHealthMetrics(
      totalIncome, totalSpent, totalBudget, totalFixedCosts, monthlyDebtMin, monthProgress, netCashFlow, totalAssets
    );

    const projections = calculateProjections(netWorth, netCashFlow, totalAssets);

    // Generate global AI insight for the summary
    const globalPrediction = getGlobalAIInsight(
      totalSpent,
      totalBudget,
      currentDay,
      totalFixedCosts,
      data.highestInterestDebt,
      netCashFlow,
      totalAssets,
      data.urgentGoal
    );

    const trendData = mapDailyTrajectory(data.trends, totalDebt, totalAssets);

    res.json({
      totalIncome,
      totalSpent,
      totalBudget,
      totalFixedCosts,
      remaining,
      netCashFlow,
      momTrend,
      savingsRate,
      netWorth,
      totalAssets,
      wealthIncrease: netCashFlow,
      dailySafeToSpend,
      dtiRatio,
      healthScore,
      debtPayoffForecast, // Use the calculated object
      wealthVelocity: Math.round(netCashFlow), // Speed of wealth accumulation this month
      projections, // Use the calculated object
      healthMetrics: {
        savings: Math.round(scoreSavings), // Use calculated scores
        burn: Math.round(scoreBurn), // Use calculated scores
        debt: Math.round(scoreDTI) // Use calculated scores
      },
      burnRate,
      healthFactor: totalBudget > 0 ? (totalSpent / totalBudget) : 0,
      categoryTotals: data.categoryTotals,
      trendData,
      aiInsight: globalPrediction
    });
}));

router.get('/net-worth-history', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const result = await getNetWorthHistoryData(userId!);
  res.json(result.rows);
}));

router.get('/optimization-suggestions', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = QuerySchema.parse(req.query);
  const userId = req.user?.id;

  const filterDate = month ? `${month}-01` : new Date().toISOString();
  const data = await getOptimizationData(userId!, filterDate); // data is now typed
  const { monthProgress } = getMonthlyProgressDetails(month);

  const { suggestions, totalSlack } = calculateOptimizationSuggestions(data.budgets, data.spending, monthProgress);
  const target = data.debtTarget ? { type: 'DEBT', ...data.debtTarget } : (data.goalTarget ? { type: 'GOAL', ...data.goalTarget } : null);

  res.json({ suggestions, totalSlack, target });
})); 

router.get('/category-trends', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const result = await getCategoryTrendsData(userId!);
  const trends = formatCategoryTrends(result.rows);
  res.json(trends);
}));

export default router;