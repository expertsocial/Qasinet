-- ==============================================================================
-- QASINET SECURITY HARDENING: ROW LEVEL SECURITY (RLS) AUDIT FIXES
-- Migration: 20260918020000_strict_rls_hardening.sql
-- ==============================================================================

-- 1. Admins Table Protection
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admins table" ON admins;
CREATE POLICY "Admins can view admins table"
  ON admins FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Superadmins manage admins" ON admins;
CREATE POLICY "Superadmins manage admins"
  ON admins FOR ALL
  USING (is_admin());

-- 2. System Settings Protection (Contains API keys and configs)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  USING (is_admin());

-- 3. Audit Logs Protection
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- 4. Payments Table Protection
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = payments.transaction_id 
        AND transactions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (is_admin());

-- 5. Transaction Events Table Protection
ALTER TABLE transaction_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transaction events" ON transaction_events;
CREATE POLICY "Users can view own transaction events"
  ON transaction_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_events.transaction_id 
        AND transactions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all transaction events" ON transaction_events;
CREATE POLICY "Admins can view all transaction events"
  ON transaction_events FOR ALL
  USING (is_admin());

-- 6. Webhook Events Table Protection (Internal only: zero anon/authenticated user access)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook events" ON webhook_events;
CREATE POLICY "Admins can view webhook events"
  ON webhook_events FOR SELECT
  USING (is_admin());

-- 7. Kyanda Transactions Table Protection (Internal vendor calls & raw tokens)
ALTER TABLE kyanda_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view kyanda transactions" ON kyanda_transactions;
CREATE POLICY "Admins can view kyanda transactions"
  ON kyanda_transactions FOR SELECT
  USING (is_admin());
