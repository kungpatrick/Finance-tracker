import { query } from '../config/db.js';
import { 
  DailyTrajectoryRow, AIContextDebt, AIContextGoal,
  Debt as DebtType, Budget as BudgetRowType
} from '../utils/finance.js';

interface CurrentMonthTotals {
  income: string;
  expense: string;
  transfers: string;
}

interface LastMonthExpense {
  total: string;
}

interface RolloverSurplusRow {
  category: string;
  surplus: string;
}

interface RecurringTotal {
  total: string;
}

interface GoalsTotal {
  total: string;
}

interface DebtRow {
  remaining_amount: string;
  interest_rate: string;
  min_payment: string;
}

interface CategoryTotalRow {
  category: string;
  total: string;
}

export async function getFinancialSummaryData(userId: string, filterDate: string, prevMonthDate: string) {
  const results = await Promise.all([
    // Current Month Totals
    query(
      `SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
        SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END) as transfers
       FROM transactions 
       WHERE user_id = $1 
       AND transaction_date >= date_trunc('month', $2::timestamp)
       AND transaction_date < date_trunc('month', $2::timestamp) + interval '1 month'`,
      [userId, filterDate]
    ),
    // Last Month Expense
    query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = $1 AND type = 'expense' AND is_verified = TRUE
       AND transaction_date >= date_trunc('month', $2::timestamp) - interval '1 month'
       AND transaction_date < date_trunc('month', $2::timestamp)`,
      [userId, filterDate]
    ),
    // Budgets and Rollover logic
    query('SELECT category, limit_amount, is_rollover FROM budgets WHERE user_id = $1', [userId]),
    query(
      `SELECT b.category, GREATEST(0, b.limit_amount - COALESCE(SUM(t.amount), 0)) as surplus
       FROM budgets b
       LEFT JOIN transactions t ON t.category = b.category 
         AND t.user_id = b.user_id AND t.type = 'expense' AND t.is_verified = TRUE
         AND t.transaction_date >= date_trunc('month', $2::timestamp)
         AND t.transaction_date < date_trunc('month', $2::timestamp) + interval '1 month'
       WHERE b.user_id = $1 AND b.is_rollover = TRUE
       GROUP BY b.category, b.limit_amount`,
      [userId, prevMonthDate]
    ),
    // Auxiliary Metrics
    query('SELECT SUM(amount) as total FROM recurring_transactions WHERE user_id = $1 AND is_active = TRUE', [userId]),
    query('SELECT SUM(current_amount) as total FROM goals WHERE user_id = $1', [userId]),
    query('SELECT remaining_amount, interest_rate, min_payment FROM debts WHERE user_id = $1', [userId]),
    // Categorized Spending
    query(
      `SELECT category, SUM(amount) as total FROM transactions 
       WHERE user_id = $1 AND type = 'expense'
       AND transaction_date >= date_trunc('month', $2::timestamp)
       AND transaction_date < date_trunc('month', $2::timestamp) + interval '1 month'
       GROUP BY category`,
      [userId, filterDate]
    ),
    // Trajectory
    query(
      `WITH RECURSIVE days AS (
        SELECT date_trunc('month', $2::timestamp) as day
        UNION ALL
        SELECT day + interval '1 day' FROM days
        WHERE day < date_trunc('month', $2::timestamp) + interval '1 month' - interval '1 day'
      ),
      daily_flows AS (
        SELECT transaction_date::date as day,
               SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as daily_in,
               SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as daily_out
        FROM transactions
        WHERE user_id = $1 AND transaction_date >= date_trunc('month', $2::timestamp)
        AND transaction_date < date_trunc('month', $2::timestamp) + interval '1 month'
        GROUP BY 1
      )
      SELECT extract(day from d.day)::int as date,
             SUM(COALESCE(df.daily_in, 0) - COALESCE(df.daily_out, 0)) OVER (ORDER BY d.day) as balance,
             COALESCE(df.daily_in, 0) as inflow,
             COALESCE(df.daily_out, 0) as outflow
      FROM days d LEFT JOIN daily_flows df ON d.day = df.day ORDER BY d.day`,
      [userId, filterDate]
    ),
    // AI Context
    query('SELECT id, name, interest_rate, remaining_amount FROM debts WHERE user_id = $1 ORDER BY interest_rate DESC, remaining_amount DESC LIMIT 1', [userId]),
    query('SELECT id, name FROM goals WHERE user_id = $1 AND current_amount < target_amount ORDER BY deadline ASC NULLS LAST, (target_amount - current_amount) DESC LIMIT 1', [userId])
  ]);
  
  return {
    currentMonth: results[0].rows[0] as CurrentMonthTotals,
    lastMonth: results[1].rows[0] as LastMonthExpense,
    budgets: results[2].rows as BudgetRowType[],
    rolloverSurplus: results[3].rows as RolloverSurplusRow[],
    recurring: results[4].rows[0] as RecurringTotal,
    goals: results[5].rows[0] as GoalsTotal,
    debts: results[6].rows as DebtType[],
    categoryTotals: results[7].rows as CategoryTotalRow[],
    trends: results[8].rows as DailyTrajectoryRow[],
    highestInterestDebt: results[9].rows[0] as AIContextDebt | null,
    urgentGoal: results[10].rows[0] as AIContextGoal | null
  };
}

interface NetWorthHistoryRow {
  date: string;
  netWorth: string;
}

export async function getNetWorthHistoryData(userId: string) {
  const sql = `
    WITH monthly_balances AS (
      SELECT 
        date_trunc('month', transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_change
      FROM transactions
      WHERE user_id = $1
      AND transaction_date >= now() - interval '6 months'
      GROUP BY 1
    ),
    equity_anchor AS (
      SELECT 
        COALESCE((SELECT SUM(current_amount) FROM goals WHERE user_id = $1), 0) -
        COALESCE((SELECT SUM(remaining_amount) FROM debts WHERE user_id = $1), 0) as current_equity
    )
    SELECT 
      to_char(month, 'Mon YYYY') as date,
      current_equity + SUM(net_change) OVER (ORDER BY month DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) as "netWorth"
    FROM monthly_balances
    CROSS JOIN equity_anchor
    ORDER BY month ASC;
  `;
  return query(sql, [userId]);
}

interface OptimizationBudgetRow {
  category: string;
  limit_amount: string;
}

interface OptimizationSpendingRow {
  category: string;
  total: string;
}

interface OptimizationDebtTarget {
  id: string; name: string; interest_rate: string;
}

interface OptimizationGoalTarget {
  id: string; name: string;
}

export async function getOptimizationData(userId: string, filterDate: string) {
  const results = await Promise.all([
    query('SELECT category, limit_amount FROM budgets WHERE user_id = $1', [userId]),
    query(
      `SELECT category, SUM(amount) as total FROM transactions 
       WHERE user_id = $1 AND type = 'expense' AND is_verified = TRUE
       AND transaction_date >= date_trunc('month', $2::timestamp)
       AND transaction_date < date_trunc('month', $2::timestamp) + interval '1 month'
       GROUP BY category`,
      [userId, filterDate]
    ),
    query('SELECT id, name, interest_rate FROM debts WHERE user_id = $1 ORDER BY interest_rate DESC LIMIT 1', [userId]),
    query('SELECT id, name FROM goals WHERE user_id = $1 AND current_amount < target_amount ORDER BY deadline ASC LIMIT 1', [userId])
  ]);

  return {
    budgets: results[0].rows as OptimizationBudgetRow[],
    spending: results[1].rows as OptimizationSpendingRow[],
    debtTarget: results[2].rows[0] as OptimizationDebtTarget | null,
    goalTarget: results[3].rows[0] as OptimizationGoalTarget | null
  };
}

interface CategoryTrendRow {
  category: string;
  month: string;
  total: string;
}

export async function getCategoryTrendsData(userId: string) {
  const sql = `
    SELECT 
      category,
      to_char(transaction_date, 'Mon') as month,
      SUM(amount) as total
    FROM transactions
    WHERE user_id = $1 
    AND transaction_date >= now() - interval '4 months'
    AND type = 'expense'
    GROUP BY 1, 2, date_trunc('month', transaction_date)
    ORDER BY date_trunc('month', transaction_date) ASC;
  `;
  return query(sql, [userId]) as Promise<{ rows: CategoryTrendRow[] }>;
}