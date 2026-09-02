-- Add next_retry_at to transactions
ALTER TABLE transactions
ADD COLUMN next_retry_at TIMESTAMPTZ;

-- Add provider_reference to webhook_events for idempotency
ALTER TABLE webhook_events
ADD COLUMN provider_reference TEXT,
ADD COLUMN status TEXT;

-- We want to ignore duplicates where provider + reference + status are the same
ALTER TABLE webhook_events
ADD CONSTRAINT webhook_events_idempotency_key UNIQUE (provider, provider_reference, status);

-- Add index to speed up reconciliation query
CREATE INDEX idx_transactions_reconciliation 
ON transactions(status, next_retry_at) 
WHERE status IN ('VENDING_PENDING', 'PAYMENT_PENDING');
