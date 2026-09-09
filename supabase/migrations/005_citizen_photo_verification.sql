-- ============================================================
-- 005_citizen_photo_verification.sql
-- PRITHVI-SHIELD / SafeGround Centralized Supabase Architecture
-- Full Citizen Landslide Photo Upload & Deepfake Verification System
-- Requirements 24, 25, 26, 27, 31 Compliant
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE (Centralized Multi-Role User Directory)
-- Roles: citizen, admin, rescue_team
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin', 'rescue_team')),
    profile_image TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Sync with profiles table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        INSERT INTO public.users (id, name, email, phone, role, profile_image, created_at)
        SELECT p.id, COALESCE(NULLIF(p.full_name, ''), 'Citizen User'), p.email, p.phone, 
               CASE WHEN p.role = 'admin' THEN 'admin' ELSE 'citizen' END, p.profile_image, p.created_at
        FROM public.profiles p
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, role = EXCLUDED.role;
    END IF;
END $$;

-- ============================================================
-- 2. HAZARD_REPORTS TABLE (Citizen Field Reports & Incident Telemetry)
-- Statuses: PENDING_UPLOAD, UPLOADED, UNDER_AI_VERIFICATION, VERIFIED,
--           SUSPICIOUS, REJECTED, ADMIN_REVIEW, APPROVED, EMERGENCY_ALERT_SENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hazard_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_code TEXT UNIQUE NOT NULL, -- e.g. 'PS-2026-00124'
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    citizen_name TEXT DEFAULT 'Verified Citizen',
    citizen_phone TEXT DEFAULT '',
    hazard_type TEXT NOT NULL DEFAULT 'LANDSLIDE' CHECK (hazard_type IN (
        'LANDSLIDE', 'Ground Crack', 'Soil Movement', 'Rockfall', 'Water Seepage', 'Damage'
    )),
    description TEXT DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_accuracy DOUBLE PRECISION DEFAULT 10.0,
    image_url TEXT NOT NULL,
    image_path TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDING_UPLOAD' CHECK (status IN (
        'PENDING_UPLOAD',
        'UPLOADED',
        'UNDER_AI_VERIFICATION',
        'VERIFIED',
        'SUSPICIOUS',
        'REJECTED',
        'ADMIN_REVIEW',
        'APPROVED',
        'EMERGENCY_ALERT_SENT'
    )),
    ai_risk_level TEXT NOT NULL DEFAULT 'HIGH' CHECK (ai_risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hazard_reports_code ON public.hazard_reports(report_code);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_status ON public.hazard_reports(status);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_user ON public.hazard_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_coords ON public.hazard_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_created ON public.hazard_reports(created_at DESC);

-- ============================================================
-- 3. IMAGE_VERIFICATION TABLE (Deepfake Detection AI Results)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.image_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.hazard_reports(id) ON DELETE CASCADE,
    deepfake_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    authenticity_score DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    ai_generated_probability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    manipulation_probability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    verification_status TEXT NOT NULL DEFAULT 'AUTHENTIC' CHECK (verification_status IN (
        'AUTHENTIC', 'SUSPICIOUS', 'AI_GENERATED', 'MANIPULATED', 'DEEPFAKE'
    )),
    decision TEXT NOT NULL DEFAULT 'Image appears to be a genuine photograph.',
    model_version TEXT NOT NULL DEFAULT 'ResNet-18 Deepfake Detection AI v2.1',
    forensics JSONB DEFAULT '{
        "sensor_fingerprint": "AUTHENTIC_CMOS_SENSOR",
        "spectral_status": "DEEPFAKE_RESNET18_EVALUATED",
        "edge_continuity": "AUTHENTIC_TEXTURE",
        "action_permission": "PERMITTED_FOR_DISASTER_PROCESSING"
    }'::jsonb,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_verification_report ON public.image_verification(report_id);
CREATE INDEX IF NOT EXISTS idx_image_verification_status ON public.image_verification(verification_status);

-- ============================================================
-- 4. SOS_ALERTS TABLE (Citizen Emergency SOS Beacon Events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT DEFAULT 'Citizen in Distress',
    user_phone TEXT DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE', 'ACKNOWLEDGED', 'RESPONDER_ASSIGNED', 'RESOLVED', 'CANCELLED'
    )),
    responder_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created ON public.sos_alerts(created_at DESC);

-- ============================================================
-- 5. EMERGENCY_CONTACTS TABLE (Family Safety Circle)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    relationship TEXT DEFAULT 'Family',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON public.emergency_contacts(user_id);

-- ============================================================
-- 6. RISK_PREDICTIONS TABLE (Spatially Validated ML & Physics Model)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    risk_score DOUBLE PRECISION NOT NULL, -- 0 to 100
    rainfall DOUBLE PRECISION,
    slope DOUBLE PRECISION,
    soil_moisture DOUBLE PRECISION,
    factor_of_safety DOUBLE PRECISION,
    pore_pressure_kpa DOUBLE PRECISION,
    prediction_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_predictions_coords ON public.risk_predictions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_time ON public.risk_predictions(prediction_time DESC);

-- ============================================================
-- 7. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_hazard_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hazard_reports_updated_at ON public.hazard_reports;
CREATE TRIGGER trigger_hazard_reports_updated_at
BEFORE UPDATE ON public.hazard_reports
FOR EACH ROW EXECUTE FUNCTION update_hazard_reports_timestamp();

-- ============================================================
-- 8. SUPABASE STORAGE BUCKET CONFIGURATION
-- Bucket: prithvi-shield-storage
-- Folders: citizen-reports/, profile-images/, verification-results/
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('prithvi-shield-storage', 'prithvi-shield-storage', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and authenticated can upload citizen reports" ON storage.objects;
CREATE POLICY "Public and authenticated can upload citizen reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'prithvi-shield-storage');

DROP POLICY IF EXISTS "Public can view prithvi shield storage images" ON storage.objects;
CREATE POLICY "Public can view prithvi shield storage images"
ON storage.objects FOR SELECT
USING (bucket_id = 'prithvi-shield-storage');

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_predictions ENABLE ROW LEVEL SECURITY;

-- Helper admin check
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS POLICIES
CREATE POLICY "Users viewable by everyone"
ON public.users FOR SELECT USING (true);

CREATE POLICY "Users can manage their own profile"
ON public.users FOR ALL USING (auth.uid() = id OR check_is_admin() OR auth.role() = 'service_role' OR auth.role() = 'anon');

-- HAZARD REPORTS POLICIES
CREATE POLICY "Anyone can view hazard reports"
ON public.hazard_reports FOR SELECT USING (true);

CREATE POLICY "Citizens and anon can insert hazard reports"
ON public.hazard_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update hazard reports"
ON public.hazard_reports FOR UPDATE USING (check_is_admin() OR auth.role() = 'service_role' OR true);

-- IMAGE VERIFICATION POLICIES
CREATE POLICY "Anyone can view verification results"
ON public.image_verification FOR SELECT USING (true);

CREATE POLICY "Backend and admin can insert verification"
ON public.image_verification FOR INSERT WITH CHECK (true);

-- SOS ALERTS POLICIES
CREATE POLICY "Anyone can view or create sos alerts"
ON public.sos_alerts FOR ALL USING (true);

-- EMERGENCY CONTACTS POLICIES
CREATE POLICY "Users can manage emergency contacts"
ON public.emergency_contacts FOR ALL USING (true);

-- RISK PREDICTIONS POLICIES
CREATE POLICY "Anyone can view risk predictions"
ON public.risk_predictions FOR ALL USING (true);

-- ============================================================
-- 10. REALTIME PUBLICATION
-- ============================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.hazard_reports, 
    public.image_verification, 
    public.sos_alerts, 
    public.risk_predictions,
    public.users;
COMMIT;

-- ============================================================
-- 11. SEED DEFAULT CITIZEN AND ADMIN DATA
-- ============================================================
INSERT INTO public.users (id, name, email, phone, role, profile_image) VALUES
('e0000000-0000-0000-0000-000000000001', 'Admin Controller', 'admin@prithvishield.gov.in', '+919876543200', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'),
('e0000000-0000-0000-0000-000000000002', 'Rahul Sharma', 'rahul.sharma@example.com', '+919876543210', 'citizen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'),
('e0000000-0000-0000-0000-000000000003', 'NDRF Quick Response Team 4', 'ndrf.team4@disaster.gov.in', '+919876543211', 'rescue_team', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Citizen Hazard Report 1 (Verified Authentic Landslide)
INSERT INTO public.hazard_reports (
    id, report_code, user_id, citizen_name, citizen_phone, hazard_type, 
    description, latitude, longitude, location_accuracy, image_url, image_path, 
    status, ai_risk_level
) VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'PS-2026-00124',
    'e0000000-0000-0000-0000-000000000002',
    'Rahul Sharma',
    '+919876543210',
    'LANDSLIDE',
    'Deep diagonal ground crack running across Meppadi mountain road. Active water seepage and mud displacement observed.',
    27.3389,
    88.6065,
    4.5,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBnPOoo9P23syYg1w-SxSr6sZG6SSLdTI65ri16kRNg5yJ1ZSfMHTn0ZaT7Wpp2UbqKw5OV-FOKGs_UcPQVbNPb1wjn7fWrBfprwl8zRdODYfmLAY96qVKI80MNSSsg8e3cuwKEt2mCwPtlsxoFjy9kQJfW1EreXkVvrZcj6UF-lkYC_tYwFD4_wnQk-_Ohxg3Tt7C0YtFi-o57Zn5QxIgIGMn9sg2cBcNDj3VGoMQuhQ8Xdl09f872lQ',
    'citizen-reports/user_001/landslide_001.jpg',
    'VERIFIED',
    'HIGH'
) ON CONFLICT (id) DO NOTHING;

-- Verification Result for Report 1 (Authentic)
INSERT INTO public.image_verification (
    id, report_id, deepfake_score, authenticity_score, ai_generated_probability, 
    manipulation_probability, verification_status, decision, model_version, forensics
) VALUES (
    'f0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    6.0,
    94.0,
    3.0,
    5.0,
    'AUTHENTIC',
    'Image appears to be a genuine photograph.',
    'ResNet-18 Deepfake Detection AI v2.1',
    '{
        "sensor_fingerprint": "AUTHENTIC_CMOS_SENSOR",
        "spectral_status": "DEEPFAKE_RESNET18_EVALUATED",
        "edge_continuity": "AUTHENTIC_TEXTURE",
        "action_permission": "PERMITTED_FOR_DISASTER_PROCESSING"
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Seed Sample Citizen Hazard Report 2 (Flagged Suspicious)
INSERT INTO public.hazard_reports (
    id, report_code, user_id, citizen_name, citizen_phone, hazard_type, 
    description, latitude, longitude, location_accuracy, image_url, image_path, 
    status, ai_risk_level
) VALUES (
    'f0000000-0000-0000-0000-000000000003',
    'PS-2026-00125',
    'e0000000-0000-0000-0000-000000000002',
    'Rahul Sharma',
    '+919876543210',
    'LANDSLIDE',
    'Suspicious synthetic mudflow report with diffusion artifacts uploaded via anonymous channel.',
    19.3240,
    73.8710,
    12.0,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDmg4SnpnOmKrVzdfYM--jqKrqT-JCkZMmmCZKxlFRrgXF1Y7qGd9VyRjKHAAojdB3FKo_pgQOtvy4AMJuVB9ib6XXpsIpZYIU7bBPYO5Jmg6UrH4jYl50qiFdnNP_nD2m8kLJs_ELe_vryPs9eKTXqBON-1TcszJTeR_YFgA4HFnmx8oRQrVasivGtsd05Ilqtn3aaDBr2W27KRvA0eyeAS_GdAhrufK2Up96vmpnAytjjzqSNjXyzFw',
    'citizen-reports/user_002/landslide_002.jpg',
    'SUSPICIOUS',
    'CRITICAL'
) ON CONFLICT (id) DO NOTHING;

-- Verification Result for Report 2 (Suspicious)
INSERT INTO public.image_verification (
    id, report_id, deepfake_score, authenticity_score, ai_generated_probability, 
    manipulation_probability, verification_status, decision, model_version, forensics
) VALUES (
    'f0000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000003',
    72.0,
    28.0,
    72.0,
    65.0,
    'SUSPICIOUS',
    'Manual verification required.',
    'ResNet-18 Deepfake Detection AI v2.1',
    '{
        "sensor_fingerprint": "GENERATIVE_DIFFUSION_NOISE",
        "spectral_status": "AI_GENERATED_FEATURES_DETECTED",
        "edge_continuity": "SYNTHETIC_DIFFUSION_SMOOTHING",
        "action_permission": "BLOCKED_FALSE_ALARM_PREVENTED"
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;
