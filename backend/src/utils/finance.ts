export interface TransactionInput {
  amount: number;
  category: string;
  type: 'income' | 'expense' | 'transfer';
  transaction_date?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  splits?: any[];
}

export interface AIContextDebt {
  id: string;
  name: string;
  interest_rate: number;
  remaining_amount: number;
}

export interface AIContextGoal {
  id: string;
  name: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  total_amount: string;
  remaining_amount: string;
  interest_rate: string;
  min_payment: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: string;
  is_rollover: boolean;
}

export interface DailyTrajectoryRow {
  date: number;
  balance: string;
  inflow: string;
  outflow: string;
}