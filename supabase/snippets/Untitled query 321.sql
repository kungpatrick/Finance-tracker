-- 1. Create the Savings Goals table first
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    deadline DATE
);

-- 2. Create the Liabilities (Debts) table
CREATE TABLE IF NOT EXISTS public.liabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    remaining_amount DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    min_payment DECIMAL(12, 2) DEFAULT 0
);

-- 3. Add the linking columns to the transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.savings_goals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.liabilities(id) ON DELETE SET NULL;

-- 4. Create or Update the synchronization function
CREATE OR REPLACE FUNCTION sync_goal_debt_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETIONS or UPDATES (Reverse the old transaction effect)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (OLD.goal_id IS NOT NULL OR OLD.debt_id IS NOT NULL))) THEN
        IF OLD.goal_id IS NOT NULL THEN
            UPDATE savings_goals 
            SET current_amount = current_amount - OLD.amount 
            WHERE id = OLD.goal_id;
        END IF;

        IF OLD.debt_id IS NOT NULL THEN
            UPDATE liabilities 
            SET remaining_amount = remaining_amount + OLD.amount 
            WHERE id = OLD.debt_id;
        END IF;
    END IF;

    -- Handle INSERTIONS or UPDATES (Apply the new transaction effect)
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (NEW.goal_id IS NOT NULL OR NEW.debt_id IS NOT NULL))) THEN
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Enable the trigger
DROP TRIGGER IF EXISTS tr_sync_goal_debt ON transactions;
CREATE TRIGGER tr_sync_goal_debt
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION sync_goal_debt_balances();

-- 6. Enable RLS and Policies (if not already done)
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own goals" ON public.savings_goals;
CREATE POLICY "Users can manage their own goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own liabilities" ON public.liabilities;
CREATE POLICY "Users can manage their own liabilities" ON public.liabilities FOR ALL USING (auth.uid() = user_id);

