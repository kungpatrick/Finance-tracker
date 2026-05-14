-- Function to update account balances based on transaction changes
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETIONS or UPDATES (Reverse the old transaction)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        -- Reverse from the source account
        IF OLD.account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = CASE 
                WHEN OLD.type = 'income' THEN balance - OLD.amount
                WHEN OLD.type = 'expense' THEN balance + OLD.amount
                WHEN OLD.type = 'transfer' THEN balance + OLD.amount
                ELSE balance
            END
            WHERE id = OLD.account_id;
        END IF;

        -- Reverse from the destination account (for transfers)
        IF OLD.type = 'transfer' AND OLD.to_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = balance - OLD.amount
            WHERE id = OLD.to_account_id;
        END IF;
    END IF;

    -- Handle INSERTIONS or UPDATES (Apply the new/current transaction)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Apply to the source account
        IF NEW.account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = CASE 
                WHEN NEW.type = 'income' THEN balance + NEW.amount
                WHEN NEW.type = 'expense' THEN balance - NEW.amount
                WHEN NEW.type = 'transfer' THEN balance - NEW.amount
                ELSE balance
            END
            WHERE id = NEW.account_id;
        END IF;

        -- Apply to the destination account (for transfers)
        IF NEW.type = 'transfer' AND NEW.to_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = balance + NEW.amount
            WHERE id = NEW.to_account_id;
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
