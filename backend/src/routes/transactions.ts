import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import { suggestCategory } from '../services/categorizationService.js';
import { 
  createTransaction,
  updateTransaction, 
  getTransactionAIContext,
  calculateTransactionAlert
} from '../services/transactionService.js';

const router = Router();

const TransactionSchema = z.object({
  amount: z.coerce.number().positive(),
  category: z.string().min(1),
  type: z.enum(['income', 'expense', 'transfer']).default('expense'),
  transaction_date: z.string().optional(),
  description: z.string().max(255).optional(),
  splits: z.array(z.object({
    amount: z.coerce.number().positive(),
    category: z.string().min(1),
    description: z.string().optional(),
  })).optional()
}).refine(data => {
  if (data.splits && data.splits.length > 0) {
    const splitTotal = data.splits.reduce((sum, s) => sum + s.amount, 0);
    return Math.abs(splitTotal - data.amount) < 0.01;
  }
  return true;
}, { message: "Sum of splits must equal the total amount", path: ["splits"] });

const TransactionIdSchema = z.object({ id: z.string().uuid() });

const TransactionQuerySchema = z.object({
  limit: z.coerce.number().int().positive().default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  search: z.string().optional(),
  type: z.enum(['all', 'income', 'expense', 'transfer']).default('all'),
  category: z.string().optional()
});

const SuggestQuerySchema = z.object({
  description: z.string().default('')
});

// Apply authMiddleware to all transaction routes
router.use(authMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit, offset, month, search, type, category } = TransactionQuerySchema.parse(req.query);
  const userId = req.user?.id;

    const filterDate = month ? `${month}-01` : new Date().toISOString();
    const searchFilter = search ? `%${search}%` : null;

    const [transactions, totalCountResult, lastMonthResult, lastMonthCategoryResult] = await Promise.all([
      query(
        `SELECT * FROM transactions 
         WHERE user_id = $1
         AND ($5::text IS NULL OR (description ILIKE $5 OR category ILIKE $5))
         AND ($6::text IS NULL OR type = $6)
         AND ($7::text IS NULL OR category = $7)
         AND transaction_date >= date_trunc('month', $4::timestamp)
         AND transaction_date < date_trunc('month', $4::timestamp) + interval '1 month'
         ORDER BY transaction_date DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset, filterDate, searchFilter, type !== 'all' ? type : null, category || null]
      ),
      query(
        `SELECT COUNT(*) FROM transactions 
         WHERE user_id = $1
         AND ($3::text IS NULL OR (description ILIKE $3 OR category ILIKE $3))
         AND ($4::text IS NULL OR type = $4)
         AND ($5::text IS NULL OR category = $5)
         AND transaction_date >= date_trunc('month', $2::timestamp)
         AND transaction_date < date_trunc('month', $2::timestamp) + interval '1 month'`,
        [userId, filterDate, searchFilter, type !== 'all' ? type : null, category || null]
      ),
      query(
        `SELECT SUM(amount) as total FROM transactions 
         WHERE user_id = $1 AND type = 'expense'
         AND transaction_date >= date_trunc('month', $2::timestamp) - interval '1 month'
         AND transaction_date < date_trunc('month', $2::timestamp)`,
        [userId, filterDate]
      ),
      query(
        `SELECT category, SUM(amount) as total FROM transactions 
         WHERE user_id = $1 AND type = 'expense'
         AND transaction_date >= date_trunc('month', $2::timestamp) - interval '1 month'
         AND transaction_date < date_trunc('month', $2::timestamp)
         GROUP BY category`,
        [userId, filterDate]
      )
    ]);

    res.json({
      data: transactions.rows,
      totalCount: parseInt(totalCountResult.rows[0].count),
      lastMonthTotal: parseFloat(lastMonthResult.rows[0].total || '0'),
      lastMonthCategoryTotals: lastMonthCategoryResult.rows
    });
}));

router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const validatedData = TransactionSchema.parse(req.body);
  const { amount, category, type, transaction_date, description } = validatedData;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const result = await createTransaction(userId, validatedData);
  res.status(201).json(result);
}));

router.get('/suggest-category', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { description } = SuggestQuerySchema.parse(req.query);
  const userId = req.user?.id;
  const category = await suggestCategory(description, userId);
  res.json({ category });
}));

router.post('/import', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    await query('BEGIN');
    // Validate the array of transactions
    const transactionsToImport = z.array(TransactionSchema).parse(req.body);

    if (transactionsToImport.length === 0) {
      return res.status(400).json({ error: 'No transactions provided for import' });
    }

    // Parameterized bulk insert to prevent SQL Injection
    const params: any[] = [];
    const valueRows = transactionsToImport.map((t, i) => {
      const offset = i * 6;
      const date = t.transaction_date || new Date().toISOString();
      params.push(userId, t.amount, t.category, t.type, t.description || null, date);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    });

    const sql = `
      INSERT INTO transactions (user_id, amount, category, type, description, transaction_date)
      VALUES ${valueRows.join(',')}
      RETURNING id;
    `;
    const result = await query(sql, params);
    await query('COMMIT');
    res.status(201).json({ message: `${result.rowCount} transactions imported successfully.`, importedIds: result.rows.map(row => row.id) });
  } catch (err: any) {
    await query('ROLLBACK');
    throw err; // Re-throw for asyncHandler to catch and pass to global error handler
  }
}));

router.delete('/bulk', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!req.body || !req.body.ids) {
    return res.status(400).json({ error: 'Missing transaction IDs for deletion' });
  }

  const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(req.body);

  console.log(`[DELETE /api/transactions/bulk] User: ${userId}, IDs: ${ids.length} transactions`);
  
  if (ids.length === 0) return res.json({ success: true, count: 0 });

  // Use ANY($1) to allow node-postgres to handle the array mapping correctly
  const result = await query(
    'DELETE FROM transactions WHERE id = ANY($1) AND user_id = $2', 
    [ids, userId]
  );
  
  res.json({ success: true, count: result.rowCount || 0 });
}));

// Bulk Status Update (Reconciliation)
router.patch('/bulk-status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!req.body || !req.body.ids) {
    return res.status(400).json({ error: 'Missing transaction IDs for status update' });
  }

  const { ids, is_reconciled } = z.object({ 
    ids: z.array(z.string().uuid()), 
    is_reconciled: z.boolean() 
  }).parse(req.body);

  if (ids.length === 0) return res.json({ success: true, count: 0 });
  console.log(`[PATCH /api/transactions/bulk-status] User: ${userId}, IDs: ${ids.length} transactions, Reconciled: ${is_reconciled}`);
  console.log('IDs to update status:', ids);

  // Use ANY($1) to allow node-postgres to handle the array mapping correctly
  const result = await query(
    'UPDATE transactions SET is_reconciled = $1 WHERE id = ANY($2) AND user_id = $3',
    [is_reconciled, ids, userId]
  );
  
  res.json({ success: true, count: result.rowCount || 0 });
}));

router.patch('/bulk-verify', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(req.body);
  const userId = req.user?.id;
  const result = await query('UPDATE transactions SET is_verified = TRUE WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'No transactions found for verification' });
  res.status(204).send();
}));

router.patch('/bulk-category', asyncHandler(async (req: AuthRequest, res: Response) => {
  const BulkCategorySchema = z.object({
    ids: z.array(z.string().uuid()),
    category: z.string().min(1)
  });
  const { ids, category } = BulkCategorySchema.parse(req.body);
  const userId = req.user?.id;
  const result = await query('UPDATE transactions SET category = $1 WHERE id = ANY($2) AND user_id = $3', [category, ids, userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'No transactions found for category update' });
  res.status(204).send();
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const userId = req.user?.id;
  const result = await query(
    'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Transaction not found' });
  res.status(204).send();
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = TransactionIdSchema.parse(req.params);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const validatedData = TransactionSchema.parse(req.body);
  const { amount, category, type, transaction_date, description } = validatedData;

  const result = await query(
    `UPDATE transactions 
     SET amount = $1, category = $2, type = $3, transaction_date = COALESCE($4, transaction_date), description = $5
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [amount, category, type, transaction_date || null, description, id, userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Transaction not found or unauthorized' });

  const data = result.rows[0];
  const context = await getTransactionAIContext(userId, data.category, data.transaction_date);
  const alertStatus = calculateTransactionAlert(data.type, data.category, context, data.transaction_date);

  res.json({ transaction: data, alert: alertStatus });
}));
export default router;