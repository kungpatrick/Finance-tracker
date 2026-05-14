-- c:\Users\patri\Documents\Patrick_Kung\ReactProgramming\Finance-tracker\supabase_schema.sql

-- 1. If a 'debts' table exists, move any data to 'liabilities' and drop it
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debts') THEN
        INSERT INTO public.liabilities (id, user_id, name, total_amount, remaining_amount, interest_rate, min_payment)
        SELECT id, user_id, name, total_amount, remaining_amount, interest_rate, min_payment 
        FROM public.debts
        ON CONFLICT (id) DO NOTHING;
        
        DROP TABLE public.debts CASCADE;
    END IF;
END $$;

-- 2. Ensure the foreign key in the transactions table is correctly linked to liabilities
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_debt_id_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_debt_id_fkey 
FOREIGN KEY (debt_id) REFERENCES public.liabilities(id) ON DELETE SET NULL;
