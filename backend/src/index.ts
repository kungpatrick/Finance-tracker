import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import categoryRoutes from './routes/categories.js';
import goalRoutes from './routes/goals.js';
import recurringRoutes from './routes/recurring.js';
import debtRoutes from './routes/debts.js';
import analyticsRoutes from './routes/analytics.js';
import tasksRoutes from './routes/tasks.js';
import errorHandler from './routes/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins, credentials: true }));
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
app.use(errorHandler);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Finance Tracker Backend running on http://0.0.0.0:${PORT}`);
});
