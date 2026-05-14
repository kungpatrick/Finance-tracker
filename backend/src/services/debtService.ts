import { query } from '../config/db.js';

export async function payDebt(userId: string, id: string, amount: number) {
  const sql = `
    WITH updated_debt AS (
      UPDATE debts 
      SET remaining_amount = GREATEST(0, remaining_amount - $1)
      WHERE id = $2 AND user_id = $3
      RETURNING name
    )
    INSERT INTO transactions (user_id, amount, category, type, description)
    SELECT $3, $1, 'Debt Payment', 'expense', 'Payment towards ' || name
    FROM updated_debt
    RETURNING *;
  `;
  const result = await query(sql, [amount, id, userId]);
  return result.rows[0];
}