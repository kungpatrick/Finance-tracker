import { query } from '../config/db.js';

export const processRecurringTransactionsForUser = async (userId: string, month: string) => {
  const targetMonth = `${month}-01`;

  try {
    // Optimized atomic operation: Insert all missing recurring transactions for the month in one trip
    const sql = `
      INSERT INTO transactions (user_id, amount, category, type, description, transaction_date)
      SELECT 
        rt.user_id, 
        rt.amount, 
        rt.category, 
        'expense', 
        rt.description,
        (date_trunc('month', $2::timestamp) + (rt.day_of_month - 1) * interval '1 day')
      FROM recurring_transactions rt
      LEFT JOIN transactions t ON 
        t.user_id = rt.user_id AND 
        t.description = rt.description AND 
        t.category = rt.category AND 
        t.amount = rt.amount AND 
        t.transaction_date >= date_trunc('month', $2::timestamp) AND 
        t.transaction_date < date_trunc('month', $2::timestamp) + interval '1 month'
      WHERE rt.user_id = $1 
      AND rt.is_active = TRUE 
      AND t.id IS NULL;
    `;

    await query(sql, [userId, targetMonth]);

    return { success: true, message: 'Recurring transactions processed.' };
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    return { success: false, message: 'Failed to process recurring transactions.' };
  }
};