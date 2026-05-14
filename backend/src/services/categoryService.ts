import { query } from '../config/db.js';

export async function mergeCategories(userId: string, sourceName: string, targetName: string) {
  await query('BEGIN');
  try {
    // 1. Update all transactions
    await query('UPDATE transactions SET category = $1 WHERE category = $2 AND user_id = $3', [targetName, sourceName, userId]);
    
    // 2. Update recurring transactions to the new category
    await query('UPDATE recurring_transactions SET category = $1 WHERE category = $2 AND user_id = $3', [targetName, sourceName, userId]);
    
    // 3. Merge Budgets
    await query(`
      INSERT INTO budgets (user_id, category, limit_amount)
      SELECT user_id, $1, limit_amount FROM budgets WHERE category = $2 AND user_id = $3
      ON CONFLICT (user_id, category) 
      DO UPDATE SET limit_amount = budgets.limit_amount + EXCLUDED.limit_amount
    `, [targetName, sourceName, userId]);
    await query('DELETE FROM budgets WHERE category = $2 AND user_id = $3', [targetName, sourceName, userId]);
    
    // 4. Delete the source category
    await query('DELETE FROM categories WHERE name = $1 AND user_id = $2', [sourceName, userId]);
    
    await query('COMMIT');
    return true;
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}