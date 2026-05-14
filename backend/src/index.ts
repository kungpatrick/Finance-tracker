import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import categoryRoutes from './routes/categories.js';
import goalRoutes from './routes/goals.js';
import recurringRoutes from './routes/recurring.js';
import debtRoutes from './routes/debts.js';
import analyticsRoutes from './routes/analytics.js';
import tasksRoutes from './routes/tasks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tasks', tasksRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]:', err); // Log the full error object
  res.status(500).json({ error: 'Internal Server Error', message: err.message || 'An unexpected error occurred' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Finance Tracker Backend running on http://0.0.0.0:${PORT}`);
});
