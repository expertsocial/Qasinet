-- ==============================================================================
-- QASINET SERVICE LOCK & AVAILABILITY CONTROL
-- Migration: 20260922190000_service_status.sql
-- ==============================================================================

-- 1. Create service_status table
CREATE TABLE IF NOT EXISTS service_status (
  service_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('enabled', 'locked', 'hidden')),
  reason TEXT NOT NULL,
  customer_facing_message TEXT,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create service_status_audit table
CREATE TABLE IF NOT EXISTS service_status_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('LOCK', 'UNLOCK', 'STATUS_CHANGE')),
  status TEXT NOT NULL CHECK (status IN ('enabled', 'locked', 'hidden')),
  reason TEXT NOT NULL,
  customer_facing_message TEXT,
  admin_id TEXT,
  admin_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row Level Security
ALTER TABLE service_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_status_audit ENABLE ROW LEVEL SECURITY;

-- Allow public read access to service_status so checkout and frontend can evaluate availability
DROP POLICY IF EXISTS "Public read service_status" ON service_status;
CREATE POLICY "Public read service_status" 
  ON service_status FOR SELECT 
  USING (true);

-- Admins manage service_status
DROP POLICY IF EXISTS "Admins manage service_status" ON service_status;
CREATE POLICY "Admins manage service_status" 
  ON service_status FOR ALL 
  USING (is_admin());

-- Admins view and manage service_status_audit
DROP POLICY IF EXISTS "Admins view service_status_audit" ON service_status_audit;
CREATE POLICY "Admins view service_status_audit" 
  ON service_status_audit FOR ALL 
  USING (is_admin());

-- 4. Seed initial lock for Bingwa Sokoni data bundles as requested
INSERT INTO service_status (service_id, status, reason, customer_facing_message, locked_by, locked_at)
VALUES 
  (
    'safaricom-data', 
    'locked', 
    'Awaiting production API credentials.', 
    'Safaricom discounted data bundles are temporarily undergoing provider activation. Please purchase airtime instead.', 
    'system', 
    NOW()
  ),
  (
    'airtel-data', 
    'locked', 
    'Awaiting production API credentials.', 
    'Airtel discounted data bundles are temporarily undergoing provider activation. Please purchase airtime instead.', 
    'system', 
    NOW()
  )
ON CONFLICT (service_id) DO UPDATE SET
  status = EXCLUDED.status,
  reason = EXCLUDED.reason,
  customer_facing_message = EXCLUDED.customer_facing_message,
  locked_by = EXCLUDED.locked_by,
  locked_at = EXCLUDED.locked_at,
  updated_at = NOW();

INSERT INTO service_status_audit (service_id, action, status, reason, customer_facing_message, admin_id, admin_email)
VALUES
  (
    'safaricom-data', 
    'LOCK', 
    'locked', 
    'Awaiting production API credentials.', 
    'Safaricom discounted data bundles are temporarily undergoing provider activation. Please purchase airtime instead.', 
    'system', 
    'system@qasinet.com'
  ),
  (
    'airtel-data', 
    'LOCK', 
    'locked', 
    'Awaiting production API credentials.', 
    'Airtel discounted data bundles are temporarily undergoing provider activation. Please purchase airtime instead.', 
    'system', 
    'system@qasinet.com'
  );
