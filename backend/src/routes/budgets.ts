import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import { bulkUpdateBudgets } from '../services/budgetService.js';

const router = Router();

const BudgetSchema = z.object({
  category: z.string().min(1),
  limitAmount: z.coerce.number().nonnegative(),
  isRollover: z.boolean().default(false),
});

router.use(authMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const result = await query('SELECT * FROM budgets WHERE user_id = $1', [userId]);
  res.json(result.rows);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { category, limitAmount, isRollover } = BudgetSchema.parse(req.body);
  const userId = req.user?.id;

  const result = await query(
    `INSERT INTO budgets (user_id, category, limit_amount, is_rollover) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (user_id, category) 
     DO UPDATE SET limit_amount = EXCLUDED.limit_amount, is_rollover = EXCLUDED.is_rollover
     RETURNING *`,
    [userId, category, limitAmount, isRollover]
  );
  res.json(result.rows[0]);
}));

router.patch('/bulk', asyncHandler(async (req: AuthRequest, res: Response) => {
  const BulkBudgetSchema = z.object({
    updates: z.array(z.object({
      category: z.string().min(1),
      limitAmount: z.coerce.number().nonnegative(),
      isRollover: z.boolean().optional(),
    }))
  });
  const { updates } = BulkBudgetSchema.parse(req.body);
  const userId = req.user?.id;
  await bulkUpdateBudgets(userId!, updates);
  res.json({ success: true });
}));

export default router;