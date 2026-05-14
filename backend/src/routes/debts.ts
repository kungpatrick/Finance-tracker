import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import { payDebt } from '../services/debtService.js';
import { generateAmortizationSchedule } from '../utils/financialCalculations.js';

const router = Router();
router.use(authMiddleware);

const DebtSchema = z.object({
  name: z.string().min(1),
  totalAmount: z.coerce.number().positive(),
  remainingAmount: z.coerce.number().nonnegative(),
  interestRate: z.coerce.number().nonnegative().default(0),
  minPayment: z.coerce.number().nonnegative().default(0),
});

const DebtIdSchema = z.object({ id: z.string().uuid() });

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const result = await query('SELECT * FROM liabilities WHERE user_id = $1 ORDER BY interest_rate DESC', [userId]);
  res.json(result.rows);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, totalAmount, remainingAmount, interestRate, minPayment } = DebtSchema.parse(req.body);
  const result = await query(
    `INSERT INTO liabilities (user_id, name, total_amount, remaining_amount, interest_rate, min_payment)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, name) DO UPDATE SET total_amount = $3, remaining_amount = $4, interest_rate = $5, min_payment = $6
     RETURNING *`,
    [req.user?.id, name, totalAmount, remainingAmount, interestRate, minPayment]
  );
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = DebtIdSchema.parse(req.params);
  const userId = req.user?.id;
  const result = await query('DELETE FROM liabilities WHERE id = $1 AND user_id = $2', [id, userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Debt record not found' });
  res.status(204).send();
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = DebtIdSchema.parse(req.params);
  const userId = req.user?.id;
  const { name, totalAmount, remainingAmount, interestRate, minPayment } = DebtSchema.parse(req.body);
  const result = await query(
    `UPDATE liabilities 
     SET name = $1, total_amount = $2, remaining_amount = $3, interest_rate = $4, min_payment = $5
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [name, totalAmount, remainingAmount, interestRate, minPayment, id, userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Debt record not found or unauthorized' });
  }
  res.json(result.rows[0]);
}));

router.post('/:id/pay', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { amount } = z.object({ amount: z.number().positive() }).parse(req.body);
  const userId = req.user?.id;
  const result = await payDebt(userId!, id, amount);
  if (!result) return res.status(404).json({ error: 'Debt record not found' });
  res.json(result);
}));

router.get('/:id/amortization', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const userId = req.user?.id;

  const result = await query('SELECT * FROM liabilities WHERE id = $1 AND user_id = $2', [id, userId]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Debt not found' });
  
  const debt = result.rows[0];
  const principal = parseFloat(debt.remaining_amount);
  const monthlyPaymentValue = parseFloat(debt.min_payment);
  const schedule = generateAmortizationSchedule(principal, parseFloat(debt.interest_rate), monthlyPaymentValue);
  
  if ('error' in schedule) {
    return res.status(400).json({ 
      error: schedule.error, 
      message: 'The minimum payment is not enough to cover the monthly interest. This debt will grow indefinitely.' 
    });
  }

  res.json(schedule);
}));

export default router;