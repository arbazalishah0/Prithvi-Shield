-- ============================================================================
-- PRITHVI-SHIELD / PRAHARI (SIH 2026)
-- Migration 007: SMS Landslide Early-Warning & Fast2SMS Alert Pipeline
-- ============================================================================

-- 1. EXTEND CITIZEN USERS SCHEMA WITH GEOGRAPHIC LOCATION
ALTER TABLE IF EXISTS public.citizen_users 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. CREATE SMS ALERTS AUDIT & COOLDOWN LOG TABLE
CREATE TABLE IF NOT EXISTS public.sms_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    risk_level VARCHAR(30) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    message TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'Fast2SMS',
    provider_message_id TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED', 'SIMULATED', 'SKIPPED_COOLDOWN')),
    error_message TEXT,
    is_test BOOLEAN NOT NULL DEFAULT FALSE,
    danger_radius_km DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR HIGH-SPEED QUERYING AND COOLDOWN CHECKS
CREATE INDEX IF NOT EXISTS idx_sms_alerts_phone ON public.sms_alerts(phone);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_created ON public.sms_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_status ON public.sms_alerts(status);
CREATE INDEX IF NOT EXISTS idx_citizen_coords ON public.citizen_users(latitude, longitude);

-- 3. SEED TEST CITIZEN LOCATIONS IN HIGH-RISK SECTORS FOR SIH DEMO
UPDATE public.citizen_users SET latitude = 27.3389, longitude = 88.6065, location_updated_at = NOW() WHERE user_account_id = 'citizen_005'; -- Tashi (Gangtok)
UPDATE public.citizen_users SET latitude = 11.5542, longitude = 76.1264, location_updated_at = NOW() WHERE user_account_id = 'citizen_004'; -- Ananya (Wayanad)
UPDATE public.citizen_users SET latitude = 30.5564, longitude = 79.5662, location_updated_at = NOW() WHERE user_account_id = 'citizen_003'; -- Rajesh (Joshimath)
UPDATE public.citizen_users SET latitude = 26.1445, longitude = 91.7362, location_updated_at = NOW() WHERE user_account_id = 'citizen_001'; -- Arunav (Guwahati)

-- INSERT ADDITIONAL TEST CITIZENS IF NOT PRESENT
INSERT INTO public.citizen_users (user_account_id, full_name, email, phone, region, state, preferred_language, account_status, latitude, longitude)
VALUES 
    ('citizen_007', 'Rahul Sharma (Mobile Demo User)', 'rahul.sharma@safeground.in', '+91 98765 43210', 'Sikkim Sector', 'Sikkim', 'English', 'ACTIVE', 27.3380, 88.6050),
    ('citizen_008', 'Priya Verma', 'priya.verma@safeground.in', '+91 91234 56789', 'Wayanad Sector', 'Kerala', 'English', 'ACTIVE', 11.5510, 76.1250)
ON CONFLICT (user_account_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
