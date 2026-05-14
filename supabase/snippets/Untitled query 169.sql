-- 1. If 'goals' table exists, move data to 'savings_goals' and drop it
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'goals') THEN
        INSERT INTO public.savings_goals (id, user_id, name, target_amount, current_amount, deadline)
        SELECT id, user_id, name, target_amount, current_amount, deadline 
        FROM public.goals
        ON CONFLICT (id) DO NOTHING;
        
        DROP TABLE public.goals CASCADE;
    END IF;
END $$;

-- 2. Ensure savings_goals has the correct structure
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    deadline DATE
);

-- 3. Fix the Foreign Key in the transactions table
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_goal_id_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_goal_id_fkey 
FOREIGN KEY (goal_id) REFERENCES public.savings_goals(id) ON DELETE SET NULL;

