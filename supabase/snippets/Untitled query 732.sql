-- Enable the UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  group_id UUID, -- For linking split transactions
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL,
  type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer')),
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT TRUE
);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create a policy: Users can only see their own transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Create a policy: Users can only insert their own transactions
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_group ON transactions(group_id);

-- Optionally, create policies for UPDATE and DELETE as well
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions"
ON transactions FOR UPDATE
USING (auth.uid() = user_id)
 WITH CHECK (auth.uid() = user_id);

 DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
 CREATE POLICY "Users can delete their own transactions"
ON transactions FOR DELETE
USING (auth.uid() = user_id);

-- Create budgets table for category-specific limits
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL,
  limit_amount DECIMAL(12, 2) NOT NULL,
  is_rollover BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, category)
);

-- Enable RLS on Budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
CREATE POLICY "Users can manage their own budgets" 
ON budgets FOR ALL 
USING (auth.uid() = user_id);

-- Create categories table for dynamic management
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID DEFAULT NULL, -- NULL for system-wide default categories
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  UNIQUE(user_id, name)
);

-- Enable RLS on Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view system or own categories" ON categories;
CREATE POLICY "Users can view system or own categories" 
ON categories FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
CREATE POLICY "Users can insert own categories" 
ON categories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON categories;
CREATE POLICY "Users can update own categories"
ON categories FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
CREATE POLICY "Users can delete own categories"
ON categories FOR DELETE
USING (auth.uid() = user_id);

-- Seed initial categories
INSERT INTO categories (name, color) VALUES 
('General', '#64748b'), ('Food', '#10b981'), ('Rent', '#6366f1'), 
('Entertainment', '#f59e0b'), ('Shopping', '#ec4899'), ('Health', '#ef4444')
ON CONFLICT DO NOTHING;

-- Create goals table for tracking savings aspirations
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  deadline DATE,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Enable RLS on Goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own goals" ON goals;
CREATE POLICY "Users can manage their own goals" 
ON goals FOR ALL 
USING (auth.uid() = user_id);

-- Create recurring transactions table for automated forecasting
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_transactions(user_id);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can manage their own recurring transactions" 
ON recurring_transactions FOR ALL 
USING (auth.uid() = user_id);

-- Create debts table for liability tracking
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) DEFAULT 0,
  min_payment DECIMAL(12, 2) DEFAULT 0,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own debts" ON debts;
CREATE POLICY "Users can manage their own debts" 
ON debts FOR ALL 
USING (auth.uid() = user_id);