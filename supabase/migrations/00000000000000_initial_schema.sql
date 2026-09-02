-- ==============================================================================
-- QASINET INITIAL SCHEMA
-- Phase 5A: Production Database and Backend Foundation
-- ==============================================================================

-- Create custom types for state machines
CREATE TYPE transaction_status AS ENUM (
  'CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_CONFIRMED',
  'VENDING_PENDING',
  'SUCCESS',
  'PAYMENT_FAILED',
  'VENDING_FAILED',
  'REVERSED',
  'TIMEOUT',
  'UNKNOWN'
);

-- ==========================================
-- AUTHORIZATION & PROFILES
-- ==========================================

-- Admins table for separate authorization
CREATE TABLE admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles table extending auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- SERVICES & PRICING
-- ==========================================

CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'Kyanda', 'Safaricom'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  name TEXT NOT NULL, -- e.g., 'Airtime', 'Electricity'
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, 
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Safaricom 500MB', 'Prepaid Token'
  provider_product_id TEXT, -- The ID Kyanda expects
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id),
  product_id UUID REFERENCES products(id), -- Either applies to a service globally or a specific product
  provider_cost_percentage NUMERIC(5,2), -- For dynamic costs like 95% of face value
  provider_cost_fixed NUMERIC(10,2), -- For fixed costs
  selling_price_percentage NUMERIC(5,2), -- 100% face value usually
  selling_price_fixed NUMERIC(10,2), -- e.g. Fixed 20 KES fee
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_target_check CHECK (
    (service_id IS NOT NULL AND product_id IS NULL) OR 
    (service_id IS NULL AND product_id IS NOT NULL)
  )
);

-- ==========================================
-- TRANSACTIONS & PAYMENTS
-- ==========================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qsn_reference TEXT NOT NULL UNIQUE, -- QSN-YYYYMMDD-XXXXXX
  user_id UUID REFERENCES auth.users(id), -- Nullable for guests
  guest_phone TEXT, -- Required if user_id is null
  service_id UUID NOT NULL REFERENCES services(id),
  product_id UUID REFERENCES products(id),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  destination TEXT NOT NULL, -- Phone number, Meter number, Smartcard
  
  -- Financials (Calculated Server-Side)
  amount NUMERIC(10,2) NOT NULL, -- Face value / Principal
  selling_price NUMERIC(10,2) NOT NULL, -- What customer pays
  provider_cost NUMERIC(10,2) NOT NULL, -- What QasiNet pays Kyanda
  profit NUMERIC(10,2) NOT NULL, -- selling_price - provider_cost
  
  -- Tracking
  status transaction_status NOT NULL DEFAULT 'CREATED',
  failure_reason TEXT,
  payment_reference TEXT,
  kyanda_reference TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT transaction_owner_check CHECK (
    user_id IS NOT NULL OR guest_phone IS NOT NULL
  )
);

CREATE TABLE transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  status transaction_status NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'MPESA', 'CARD'
  amount NUMERIC(10,2) NOT NULL,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kyanda_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  kyanda_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  raw_request JSONB,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- WEBHOOKS, LOGS & SETTINGS
-- ==========================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'KYANDA', 'PAYSTACK', 'MPESA'
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE saved_beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Phone', 'TV', 'Electricity', etc.
  destination TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id)
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Services/Products/Pricing (Public Read, Admin Write)
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active providers" ON service_providers FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active pricing" ON pricing FOR SELECT USING (is_active = true);

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (is_admin());

-- Transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
-- Note: Guests viewing their transactions via /track will be handled securely via a Postgres Function or Server Action bypassing RLS (using Service Role).
CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (is_admin());

-- Saved Beneficiaries
CREATE POLICY "Users can manage own beneficiaries" ON saved_beneficiaries FOR ALL USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Receipts
CREATE POLICY "Users can view own receipts" ON receipts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transactions WHERE transactions.id = receipts.transaction_id AND transactions.user_id = auth.uid()
  )
);

-- Enable Admin Bypass for all tables
CREATE POLICY "Admins can manage providers" ON service_providers FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage services" ON services FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage pricing" ON pricing FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage receipts" ON receipts FOR ALL USING (is_admin());


-- ==========================================
-- TRIGGERS
-- ==========================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_transactions BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_services BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
