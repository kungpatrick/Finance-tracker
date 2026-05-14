import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.use(authMiddleware);

const RecurringSchema = z.object({
  amount: z.coerce.number().positive(),
  category: z.string().min(1),
  description: z.string().max(255).optional(),
  dayOfMonth: z.number().int().min(1).max(31),
  isActive: z.boolean().default(true), // For updates, default to true if not provided
});

const RecurringIdSchema = z.object({ id: z.string().uuid() });

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const result = await query(
    'SELECT * FROM recurring_transactions WHERE user_id = $1 AND is_active = TRUE ORDER BY day_of_month ASC',
    [userId]
  );
  res.json(result.rows);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, category, description, dayOfMonth } = RecurringSchema.parse(req.body);
  const result = await query(
    `INSERT INTO recurring_transactions (user_id, amount, category, description, day_of_month)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.user?.id, amount, category, description, dayOfMonth]
  );
  res.status(201).json(result.rows[0]);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = RecurringIdSchema.parse(req.params);
  const userId = req.user?.id;
  const { amount, category, description, dayOfMonth, isActive } = RecurringSchema.parse(req.body);
  const result = await query(
    `UPDATE recurring_transactions 
     SET amount = $1, category = $2, description = $3, day_of_month = $4, is_active = $5
     WHERE id = $6 AND user_id = $7
     RETURNING *`, // Removed '?? true' to allow explicit false
    [amount, category, description, dayOfMonth, isActive, id, userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Recurring transaction not found or unauthorized' });
  }
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = RecurringIdSchema.parse(req.params);
  const userId = req.user?.id;
  const result = await query('DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2', [id, userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Recurring transaction not found' });
  res.status(204).send();
}));

export default router;