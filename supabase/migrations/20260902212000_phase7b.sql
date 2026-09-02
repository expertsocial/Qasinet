-- Phase 7B: Admin Support & Audit Extensions

-- Add IP Address to Audit Logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  transaction_id UUID REFERENCES transactions(id),
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for Support Tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" 
  ON support_tickets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" 
  ON support_tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage tickets" 
  ON support_tickets FOR ALL 
  USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER set_timestamp_support_tickets 
  BEFORE UPDATE ON support_tickets 
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Seed Default Settings if not exists
INSERT INTO system_settings (key, value, description)
VALUES 
  ('kyanda_config', '{"api_url": "https://api.kyanda.com", "merchant_id": "", "api_key": "", "callback_url": ""}'::jsonb, 'Kyanda API Configuration'),
  ('general_config', '{"site_name": "QasiNet", "currency": "KES", "timezone": "Africa/Nairobi"}'::jsonb, 'General Site Settings')
ON CONFLICT (key) DO NOTHING;
