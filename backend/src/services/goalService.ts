import { query } from '../config/db.js';

export async function fundGoal(userId: string, id: string, amount: number) {
  const sql = `
    WITH updated_goal AS (
      UPDATE goals 
      SET current_amount = current_amount + $1
      WHERE id = $2 AND user_id = $3
      RETURNING name
    )
    INSERT INTO transactions (user_id, amount, category, type, description)
    SELECT $3, $1, 'Savings', 'transfer', 'Funding goal: ' || name
    FROM updated_goal
    RETURNING *;
  `;
  const result = await query(sql, [amount, id, userId]);
  return result.rows[0];
}