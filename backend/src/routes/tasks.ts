import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../auth.js';
import { processRecurringTransactionsForUser } from '../services/recurringProcessor.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.use(authMiddleware);

router.post('/process-recurring', asyncHandler(async (req: AuthRequest, res: Response) => {
  const Schema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/)
  });
  const { month } = Schema.parse(req.body);
  const userId = req.user?.id;

  const result = await processRecurringTransactionsForUser(userId!, month);
  if (result.success) res.json({ message: result.message });
  else res.status(500).json({ error: result.message }); // This will be caught by asyncHandler and passed to global error handler
}));

export default router;