-- 1. Create Transactions Table
-- 1. Create Accounts Table
CREATE TABLE public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'other')) NOT NULL,
    institution TEXT,
    balance DECIMAL(12, 2) DEFAULT 0,
    cleared_balance DECIMAL(12, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Savings Goals Table
CREATE TABLE public.savings_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    deadline DATE
);

-- 3. Create Liabilities Table (Debts)
CREATE TABLE public.liabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    remaining_amount DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    min_payment DECIMAL(12, 2) DEFAULT 0
);

-- 4. Create Recurring Rules Table
CREATE TABLE public.recurring_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category TEXT NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    day_of_month INT CHECK (day_of_month BETWEEN 1 AND 31) NOT NULL,
    last_processed_month DATE, 
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Transactions Table
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES public.savings_goals(id) ON DELETE SET NULL,
    recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL,
    debt_id UUID REFERENCES public.liabilities(id) ON DELETE SET NULL,
    is_reconciled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    splits JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster tag searches
CREATE INDEX idx_transactions_tags ON transactions USING GIN (tags);

-- Create indexes for faster goal and debt reconciliation lookups
CREATE INDEX idx_transactions_goal_id ON public.transactions(goal_id);
CREATE INDEX idx_transactions_debt_id ON public.transactions(debt_id);

-- Composite index for user-specific date range queries (Dashboard & Analytics)
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date);

-- Index for filtering transactions by account
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);

-- Add type constraint to transactions
ALTER TABLE public.transactions ADD COLUMN type TEXT CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL DEFAULT 'expense';

-- 6. Create Budgets Table
CREATE TABLE public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    limit_amount DECIMAL(12, 2) NOT NULL,
    UNIQUE(user_id, category)
);

-- 7. Create Categories Table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) DEFAULT 'expense',
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 8. Create Transaction Rules Table
CREATE TABLE public.transaction_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description_pattern TEXT NOT NULL,
    auto_category TEXT,
    alias_name TEXT,
    auto_tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    preferred_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Recurring_Transactions Table
create table public.recurring_transactions (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  amount numeric(12, 2) not null,
  category text not null,
  description text null,
  day_of_month integer not null,
  is_active boolean null default true,
  constraint recurring_transactions_pkey primary key (id),
  constraint recurring_transactions_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint recurring_transactions_day_of_month_check check (
    (
      (day_of_month >= 1)
      and (day_of_month <= 31)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_recurring_user_id on public.recurring_transactions using btree (user_id) TABLESPACE pg_default;

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

create policy "Users can manage their own recurring transactions"
on "public"."recurring_transactions"
to public
using (
 (auth.uid() = user_id)
);

-- Foreign key indexes to speed up RLS-checked queries on lookup tables
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_savings_goals_user_id ON public.savings_goals(user_id);
CREATE INDEX idx_liabilities_user_id ON public.liabilities(user_id);
CREATE INDEX idx_recurring_rules_user_id ON public.recurring_rules(user_id);
CREATE INDEX idx_transaction_rules_user_id ON public.transaction_rules(user_id);
-- Note: budgets and categories already have implicit indexes via UNIQUE constraints on user_id.

-- 9. Account Balance Automation Trigger Logic
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETIONS or UPDATES (Reverse the old transaction)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        -- Reverse from the source account
        IF OLD.account_id IS NOT NULL THEN
            UPDATE accounts 
            SET 
                balance = CASE 
                    WHEN OLD.type = 'income' THEN balance - OLD.amount
                    WHEN OLD.type = 'expense' THEN balance + OLD.amount
                    WHEN OLD.type = 'transfer' THEN balance + OLD.amount
                    ELSE balance
                END,
                cleared_balance = CASE 
                    WHEN OLD.is_reconciled AND OLD.type = 'income' THEN cleared_balance - OLD.amount
                    WHEN OLD.is_reconciled AND OLD.type = 'expense' THEN cleared_balance + OLD.amount
                    WHEN OLD.is_reconciled AND OLD.type = 'transfer' THEN cleared_balance + OLD.amount
                    ELSE cleared_balance
                END
            WHERE id = OLD.account_id;
        END IF;

        -- Reverse from the destination account (for transfers)
        IF OLD.type = 'transfer' AND OLD.to_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET 
                balance = balance - OLD.amount,
                cleared_balance = CASE WHEN OLD.is_reconciled THEN cleared_balance - OLD.amount ELSE cleared_balance END
            WHERE id = OLD.to_account_id;
        END IF;
    END IF;

    -- Handle INSERTIONS or UPDATES (Apply the new/current transaction)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Apply to the source account
        IF NEW.account_id IS NOT NULL THEN
            UPDATE accounts 
            SET 
                balance = CASE 
                    WHEN NEW.type = 'income' THEN balance + NEW.amount
                    WHEN NEW.type = 'expense' THEN balance - NEW.amount
                    WHEN NEW.type = 'transfer' THEN balance - NEW.amount
                    ELSE balance
                END,
                cleared_balance = CASE 
                    WHEN NEW.is_reconciled AND NEW.type = 'income' THEN cleared_balance + NEW.amount
                    WHEN NEW.is_reconciled AND NEW.type = 'expense' THEN cleared_balance - NEW.amount
                    WHEN NEW.is_reconciled AND NEW.type = 'transfer' THEN cleared_balance - NEW.amount
                    ELSE cleared_balance
                END
            WHERE id = NEW.account_id;
        END IF;

        -- Apply to the destination account (for transfers)
        IF NEW.type = 'transfer' AND NEW.to_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET 
                balance = balance + NEW.amount,
                cleared_balance = CASE WHEN NEW.is_reconciled THEN cleared_balance + NEW.amount ELSE cleared_balance END
            WHERE id = NEW.to_account_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 9b. Goal and Debt Synchronization Logic
CREATE OR REPLACE FUNCTION sync_goal_debt_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETIONS or UPDATES (Reverse the old transaction effect)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        -- If it was linked to a goal, subtract from current_amount
        IF OLD.goal_id IS NOT NULL THEN
            UPDATE savings_goals 
            SET current_amount = current_amount - OLD.amount 
            WHERE id = OLD.goal_id;
        END IF;

        -- If it was linked to a debt, add back to remaining_amount
        IF OLD.debt_id IS NOT NULL THEN
            UPDATE liabilities 
            SET remaining_amount = remaining_amount + OLD.amount 
            WHERE id = OLD.debt_id;
        END IF;
    END IF;

    -- Handle INSERTIONS or UPDATES (Apply the new transaction effect)
    -- Note: We only apply this if the transaction is an 'expense' (funding/paying)
    -- and hasn't been handled by the frontend hooks already, OR we move 
    -- the logic entirely to the trigger for better integrity.
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.goal_id IS NOT NULL THEN
            UPDATE savings_goals 
            SET current_amount = current_amount + NEW.amount 
            WHERE id = NEW.goal_id;
        END IF;

        IF NEW.debt_id IS NOT NULL THEN
            UPDATE liabilities 
            SET remaining_amount = remaining_amount - NEW.amount 
            WHERE id = NEW.debt_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_update_account_balance ON transactions;
CREATE TRIGGER tr_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Create the goal/debt trigger
DROP TRIGGER IF EXISTS tr_sync_goal_debt ON transactions;
CREATE TRIGGER tr_sync_goal_debt
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION sync_goal_debt_balances();

-- 10. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

-- 11. Create Unified Policies
CREATE POLICY "Users can manage their own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own liabilities" ON public.liabilities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own recurring rules" ON public.recurring_rules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own rules" ON public.transaction_rules FOR ALL USING (auth.uid() = user_id);