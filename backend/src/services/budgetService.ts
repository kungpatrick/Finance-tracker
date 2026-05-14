import { query } from '../config/db.js';

export async function bulkUpdateBudgets(userId: string, updates: any[]) {
  await query('BEGIN');
  try {
    for (const update of updates) {
      await query(
        `INSERT INTO budgets (user_id, category, limit_amount, is_rollover) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id, category) 
         DO UPDATE SET limit_amount = EXCLUDED.limit_amount, is_rollover = COALESCE(EXCLUDED.is_rollover, budgets.is_rollover)`,
        [userId, update.category, update.limitAmount, update.isRollover ?? null]
      );
    }
    await query('COMMIT');
    return true;
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}