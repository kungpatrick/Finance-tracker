import crypto from 'node:crypto';
import { query } from '../config/db.js';
import { getBudgetPrediction } from './predictionService.js';
import { 
  AIContextDebt, 
  AIContextGoal, 
  TransactionInput 
} from '../types/finance.js';

interface TransactionAIContext {
  budget_limit: string | null;
  current_total: string | null;
  fixed_costs: string | null;
  current_month_income: string | null;
  total_savings_balance: string | null;
  highest_interest_debt: AIContextDebt | null;
  urgent_goal: AIContextGoal | null;
}

export async function getTransactionAIContext(userId: string, category: string, date: string): Promise<TransactionAIContext> {
  const sql = `
    SELECT 
      (SELECT limit_amount FROM budgets WHERE user_id = $1 AND category = $2) as budget_limit,
      (SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND category = $2 AND type = 'expense' AND transaction_date >= date_trunc('month', $3::timestamp) AND transaction_date < date_trunc('month', $3::timestamp) + interval '1 month') as current_total,
      (SELECT SUM(amount) FROM recurring_transactions WHERE user_id = $1 AND category = $2 AND is_active = TRUE) as fixed_costs,
      (SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = 'income' AND transaction_date >= date_trunc('month', $3::timestamp) AND transaction_date < date_trunc('month', $3::timestamp) + interval '1 month') as current_month_income,
      (SELECT SUM(current_amount) FROM goals WHERE user_id = $1) as total_savings_balance,
      (SELECT json_build_object('id', id, 'name', name, 'interest_rate', interest_rate, 'remaining_amount', remaining_amount) FROM debts WHERE user_id = $1 ORDER BY interest_rate DESC, remaining_amount DESC LIMIT 1) as highest_interest_debt,
      (SELECT json_build_object('id', id, 'name', name) FROM goals WHERE user_id = $1 AND current_amount < target_amount ORDER BY deadline ASC NULLS LAST, (target_amount - current_amount) DESC LIMIT 1) as urgent_goal;
  `;
  const res = await query(sql, [userId, category, date]);
  return res.rows[0] as TransactionAIContext;
}

export async function createTransaction(userId: string, validatedData: TransactionInput) {
  const { amount, category, type, transaction_date, description, splits } = validatedData;
  const groupId = splits && splits.length > 0 ? crypto.randomUUID() : null;
  
  const transactionsToInsert = splits && splits.length > 0 
    ? splits.map((s: any) => ({
        amount: s.amount,
        category: s.category,
        description: s.description || description,
        type,
        date: transaction_date || new Date().toISOString()
      }))
    : [{ amount, category, description, type, date: transaction_date || new Date().toISOString() }];

  await query('BEGIN');
  try {
    const params: any[] = [];
    const valueRows = transactionsToInsert.map((tx: any, i: number) => {
      const offset = i * 8;
      params.push(userId, groupId, tx.amount, tx.category, tx.type, tx.description, tx.date, true);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
    });

    const insertSql = `
      INSERT INTO transactions (user_id, group_id, amount, category, type, description, transaction_date, is_verified)
      VALUES ${valueRows.join(',')}
      RETURNING *
    `;

    const insertRes = await query(insertSql, params);
    const insertedRows = insertRes.rows;

    const mainCat = transactionsToInsert[0].category;
    const context = await getTransactionAIContext(userId, mainCat, transactionsToInsert[0].date);
    await query('COMMIT');

    const alert = calculateTransactionAlert(type, mainCat, context, transactionsToInsert[0].date);
    return { transactions: insertedRows, alert };
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}

export async function updateTransaction(id: string, userId: string, validatedData: TransactionInput) {
  const { amount, category, type, transaction_date, description } = validatedData;
  const result = await query(
    `UPDATE transactions 
     SET amount = $1, category = $2, type = $3, transaction_date = COALESCE($4, transaction_date), description = $5
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [amount, category, type, transaction_date || null, description, id, userId]
  );
  
  if (result.rowCount === 0) return null;

  const data = result.rows[0];
  const context = await getTransactionAIContext(userId, data.category, data.transaction_date);
  const alert = calculateTransactionAlert(data.type, data.category, context, data.transaction_date);

  return { transaction: data, alert };
}

export function calculateTransactionAlert(type: string, category: string, context: TransactionAIContext, txDate: string) {
  const limit = parseFloat(context.budget_limit || '0');
  const totalSpent = parseFloat(context.current_total || '0');
  const fixedCosts = parseFloat(context.fixed_costs || '0');
  const currentMonthIncome = parseFloat(context.current_month_income || '0');
  const totalSavingsBalance = parseFloat(context.total_savings_balance || '0');
  const currentNetCashFlow = currentMonthIncome - totalSpent;
  const highestInterestDebt = context.highest_interest_debt;
  const urgentGoal = context.urgent_goal;

  const prediction = getBudgetPrediction(
    totalSpent,
    limit,
    new Date(txDate).getDate(),
    fixedCosts,
    highestInterestDebt,
    currentNetCashFlow,
    totalSavingsBalance,
    urgentGoal
  );

  if (type === 'expense' && limit > 0 && totalSpent >= limit * 0.8) {
    return { 
      warning: true, 
      message: `Budget Alert: ${category} is at ${((totalSpent / limit) * 100).toFixed(0)}%.`,
      insight: prediction.message,
      action: prediction.action
    };
  }
  
  return prediction.message ? {
    warning: false,
    message: null,
    insight: prediction.message,
    action: prediction.action
  } : null;
}