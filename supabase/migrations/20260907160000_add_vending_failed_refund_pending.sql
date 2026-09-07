-- Migration: Add VENDING_FAILED_REFUND_PENDING to transaction_status enum
-- and update the state machine trigger to handle refund-pending states

-- Add value to transaction_status enum if not already present
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'VENDING_FAILED_REFUND_PENDING';

-- Update the state machine transition function
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
    IF NEW.status NOT IN ('VENDING_PENDING', 'SUCCESS', 'VENDING_FAILED', 'VENDING_FAILED_REFUND_PENDING', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status = 'VENDING_PENDING' THEN
    IF NEW.status NOT IN ('SUCCESS', 'VENDING_FAILED', 'VENDING_FAILED_REFUND_PENDING', 'TIMEOUT', 'REVERSED') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.status IN ('VENDING_FAILED', 'VENDING_FAILED_REFUND_PENDING') THEN
    -- Allow retrying vending, marking as refunded/reversed, or manually reconciling to SUCCESS
    IF NEW.status NOT IN ('VENDING_PENDING', 'SUCCESS', 'REVERSED', 'VENDING_FAILED_REFUND_PENDING') THEN
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
