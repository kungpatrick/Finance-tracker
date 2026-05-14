import { z } from 'zod';

export const CATEGORIES = [
  'General',
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
];

export const transactionSchema = z.object({
  amount: z.number().refine((n) => !isNaN(n), { message: "Amount must be a valid number" }),
  description: z.string().trim().min(1, "Description is required").max(255),
  type: z.enum(['expense', 'income', 'transfer']),
  category: z.string().min(1, "Category is required"),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  user_id: z.string().uuid("Invalid user identification"),
  account_id: z.string().uuid().nullable(),
  to_account_id: z.string().uuid().nullable().optional(),
  receipt_url: z.string().url().optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;