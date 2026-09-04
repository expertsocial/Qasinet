-- Fix state machine transitions to allow re-vending and manual reconciliation of failed/pending transactions

CREATE OR REPLACE FUNCTION check_transaction_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- If status hasn't changed, allow
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define allowed transitions
  IF OLD.status = 'CREATED' THEN
    IF NEW.status NOT IN ('PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'VENDING_PENDING', 'SUCCESS', 'PAYMENT_FAILED', 'TIMEOUT', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status = 'PAYMENT_PENDING' THEN
    IF NEW.status NOT IN ('PAYMENT_CONFIRMED', 'VENDING_PENDING', 'SUCCESS', 'PAYMENT_FAILED', 'TIMEOUT', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status = 'PAYMENT_CONFIRMED' THEN
    IF NEW.status NOT IN ('VENDING_PENDING', 'SUCCESS', 'VENDING_FAILED', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status = 'VENDING_PENDING' THEN
    IF NEW.status NOT IN ('SUCCESS', 'VENDING_FAILED', 'TIMEOUT', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status = 'VENDING_FAILED' THEN
    -- Allow retrying vending or reconciling failed states
    IF NEW.status NOT IN ('VENDING_PENDING', 'SUCCESS', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status = 'SUCCESS' THEN
    IF NEW.status NOT IN ('REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status IN ('PAYMENT_FAILED', 'REVERSED', 'TIMEOUT') THEN
    IF NEW.status NOT IN ('PAYMENT_CONFIRMED', 'VENDING_PENDING', 'SUCCESS', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSE
    -- Unknown states
    RAISE EXCEPTION 'Unknown starting state %', OLD.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_transaction_state_machine ON transactions;
CREATE TRIGGER enforce_transaction_state_machine
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_transaction_state_transition();
