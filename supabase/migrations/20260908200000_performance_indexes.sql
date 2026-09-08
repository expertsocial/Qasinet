-- ====================================================================
-- Performance Index Optimization for Transactions Table
-- Ensures fast B-Tree lookups for M-Pesa reconciliation, search queries,
-- and reverse-chronological pagination without sequential table scans.
-- ====================================================================

-- 1. Date Sorting & Date Range Filtering (created_at DESC)
-- Accelerates default transaction list pagination and date-range queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at_desc
ON transactions (created_at DESC);

-- 2. M-Pesa Receipt Code Lookup (payment_reference)
-- Critical for Safaricom Daraja callback matching, reconciliation search,
-- and filtering non-null / non-empty receipt codes
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference
ON transactions (payment_reference)
WHERE payment_reference IS NOT NULL;

-- 3. QasiNet Reference Lookup (qsn_reference)
-- Used in /track, /receipt/[id], and admin lookup
CREATE INDEX IF NOT EXISTS idx_transactions_qsn_reference
ON transactions (qsn_reference);

-- 4. Customer Phone & Destination Lookup
-- Accelerates search by payer phone and meter/account number
CREATE INDEX IF NOT EXISTS idx_transactions_guest_phone
ON transactions (guest_phone)
WHERE guest_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_destination
ON transactions (destination);

-- 5. Service Foreign Key & Status
CREATE INDEX IF NOT EXISTS idx_transactions_service_id
ON transactions (service_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
ON transactions (status);
