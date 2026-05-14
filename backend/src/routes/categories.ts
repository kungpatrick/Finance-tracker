import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import { mergeCategories } from '../services/categoryService.js';

const router = Router();
router.use(authMiddleware);

const CategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
});

const MergeSchema = z.object({
  sourceName: z.string().min(1),
  targetName: z.string().min(1)
});

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  // Fetch system categories (user_id IS NULL) and user-specific categories
  const result = await query('SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1 ORDER BY name ASC', [userId]);
  res.json(result.rows);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, color } = CategorySchema.parse(req.body);
  const result = await query(
    'INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
    [req.user?.id, name, color]
  );
  res.status(201).json(result.rows[0]);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params); // Validate ID here
  const userId = req.user?.id;
  const { name, color } = CategorySchema.parse(req.body);
  const result = await query(
    'UPDATE categories SET name = $1, color = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
    [name, color, id, userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found or system default' });
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const result = await query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, req.user?.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
  res.status(204).send();
}));

router.post('/merge', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sourceName, targetName } = MergeSchema.parse(req.body);
  const userId = req.user?.id;
  await mergeCategories(userId!, sourceName, targetName);
  res.json({ success: true, message: `Merged ${sourceName} into ${targetName}` });
}));

export default router;