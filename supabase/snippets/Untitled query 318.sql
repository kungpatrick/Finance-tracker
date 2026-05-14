ALTER TABLE public.transactions ADD COLUMN recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL;
