CREATE TABLE IF NOT EXISTS recurring_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  day_of_month INT CHECK (day_of_month BETWEEN 1 AND 31) NOT NULL,
  last_processed_month DATE, -- Format: YYYY-MM-01 to prevent double-billing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recurring rules" ON recurring_rules
  FOR ALL USING (auth.uid() = user_id);
