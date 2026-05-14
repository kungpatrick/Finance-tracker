import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import { fundGoal } from '../services/goalService.js';

const router = Router();
router.use(authMiddleware);

const GoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().nonnegative().default(0),
  deadline: z.string().optional(),
});

const GoalIdSchema = z.object({ id: z.string().uuid() });
const FundingSchema = z.object({ amount: z.number().positive() });

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const result = await query('SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY deadline ASC', [userId]);
  res.json(result.rows);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, targetAmount, currentAmount, deadline } = GoalSchema.parse(req.body);
  const result = await query(
    `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, deadline)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, name) DO UPDATE SET target_amount = $3, current_amount = $4, deadline = $5
     RETURNING *`,
    [req.user?.id, name, targetAmount, currentAmount, deadline]
  );
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = GoalIdSchema.parse(req.params);
  const userId = req.user?.id;
  const result = await query('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [id, userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Goal not found' });
  res.status(204).send();
}));

router.post('/:id/fund', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = GoalIdSchema.parse(req.params);
  const { amount } = FundingSchema.parse(req.body);
  const userId = req.user?.id;
  const result = await fundGoal(userId!, id, amount);
  if (!result) return res.status(404).json({ error: 'Goal not found' });
  res.json(result);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = GoalIdSchema.parse(req.params);
  const userId = req.user?.id;
  const { name, targetAmount, currentAmount, deadline } = GoalSchema.parse(req.body);
  const result = await query(
    `UPDATE savings_goals 
     SET name = $1, target_amount = $2, current_amount = $3, deadline = $4
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [name, targetAmount, currentAmount, deadline, id, userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Goal not found or unauthorized' });
  }
  res.json(result.rows[0]);
}));

export default router;