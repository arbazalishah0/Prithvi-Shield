-- ============================================================
-- PRAHARI & SAFEGROUND UNIFIED SUPABASE DATABASE SCHEMA
-- Multi-Source Landslide Risk Intelligence, Citizen Incident
-- Reporting, Storage & Admin Operations
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE (Linked to Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
    profile_image TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================
-- 2. REPORTS TABLE (Citizen Incident Reports)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'Soil Movement',
    description TEXT NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'analyzed', 'approved', 'rejected', 'resolved')),
    risk_level TEXT NOT NULL DEFAULT 'pending' CHECK (risk_level IN ('low', 'medium', 'high', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_citizen_id ON public.reports(citizen_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_risk_level ON public.reports(risk_level);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- ============================================================
-- 3. REPORT_IMAGES TABLE (Storage References)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    mime_type TEXT DEFAULT 'image/jpeg',
    is_authentic BOOLEAN DEFAULT TRUE,
    authenticity_score DOUBLE PRECISION DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON public.report_images(report_id);

-- ============================================================
-- 4. PREDICTIONS TABLE (ML & Geotechnical Physics Outputs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL DEFAULT 'XGBoost_Physics_Ensemble',
    prediction TEXT NOT NULL,
    probability DOUBLE PRECISION, -- Stored as float 0.0 - 1.0 (or percentage)
    factor_of_safety DOUBLE PRECISION,
    pore_pressure_kpa DOUBLE PRECISION,
    wetting_front_depth_m DOUBLE PRECISION,
    elevation_m DOUBLE PRECISION,
    slope_deg DOUBLE PRECISION,
    rainfall_24h DOUBLE PRECISION,
    rainfall_72h DOUBLE PRECISION,
    soil_moisture DOUBLE PRECISION,
    ndvi DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_report_id ON public.predictions(report_id);

-- ============================================================
-- 5. ADMIN_ACTIONS TABLE (Audit & Triage Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- e.g. 'status_change', 'comment', 'evacuation_order'
    previous_status TEXT,
    new_status TEXT,
    comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_report_id ON public.admin_actions(report_id);

-- ============================================================
-- 6. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_reports_updated_at ON public.reports;
CREATE TRIGGER trigger_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ============================================================
-- 7. AUTOMATIC AUTH PROFILE CREATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'citizen')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- --- PROFILES POLICIES ---
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- --- REPORTS POLICIES ---
CREATE POLICY "Citizens can view their own reports or admins view all"
ON public.reports FOR SELECT
USING (auth.uid() = citizen_id OR public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Citizens can insert their own reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = citizen_id OR auth.role() = 'service_role');

CREATE POLICY "Admins can update report status"
ON public.reports FOR UPDATE
USING (public.is_admin() OR auth.role() = 'service_role');

-- --- REPORT IMAGES POLICIES ---
CREATE POLICY "Users view their own report images or admins view all"
ON public.report_images FOR SELECT
USING (auth.uid() = citizen_id OR public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Citizens can insert report images"
ON public.report_images FOR INSERT
WITH CHECK (auth.uid() = citizen_id OR auth.role() = 'service_role');

-- --- PREDICTIONS POLICIES ---
CREATE POLICY "Predictions viewable by reporter or admin"
ON public.predictions FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.reports WHERE id = public.predictions.report_id AND (citizen_id = auth.uid() OR public.is_admin()))
    OR auth.role() = 'service_role'
);

CREATE POLICY "Backend service can insert predictions"
ON public.predictions FOR INSERT
WITH CHECK (true);

-- --- ADMIN ACTIONS POLICIES ---
CREATE POLICY "Admin actions viewable by admins and reporters"
ON public.admin_actions FOR SELECT
USING (public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Admins can insert actions"
ON public.admin_actions FOR INSERT
WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- ============================================================
-- 9. SUPABASE STORAGE BUCKET & POLICIES
-- ============================================================
-- Storage bucket creation
INSERT INTO storage.buckets (id, name, public)
VALUES ('landslide-reports', 'landslide-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload report images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'landslide-reports' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landslide-reports');

-- ============================================================
-- 10. REALTIME PUBLICATION ENABLEMENT
-- ============================================================
BEGIN;
  -- Drop publication if exists or add tables
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.reports, 
    public.report_images, 
    public.predictions, 
    public.admin_actions;
COMMIT;

-- ============================================================
-- 11. UNIFIED PRITHVI-SHIELD ECOSYSTEM TABLES (Sections 24, 25, 26, 27)
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

CREATE TABLE IF NOT EXISTS public.hazard_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_code TEXT UNIQUE NOT NULL,
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
    forensics JSONB DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    relationship TEXT DEFAULT 'Family',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.risk_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    risk_score DOUBLE PRECISION NOT NULL,
    rainfall DOUBLE PRECISION,
    slope DOUBLE PRECISION,
    soil_moisture DOUBLE PRECISION,
    factor_of_safety DOUBLE PRECISION,
    pore_pressure_kpa DOUBLE PRECISION,
    prediction_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prithvi Shield Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('prithvi-shield-storage', 'prithvi-shield-storage', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. SMART EVACUATION & RESCUE INTELLIGENCE TABLES
-- ============================================================

-- Emergency Shelters Directory
CREATE TABLE IF NOT EXISTS public.emergency_shelters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 200,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    available_capacity INTEGER GENERATED ALWAYS AS (GREATEST(0, capacity - current_occupancy)) STORED,
    safety_score DOUBLE PRECISION NOT NULL DEFAULT 95.0,
    risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULL', 'STANDBY', 'CLOSED')),
    contact_phone TEXT DEFAULT '',
    shelter_type TEXT DEFAULT 'Community Hall',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Road Risk Status & Dynamically Blocked Segments
CREATE TABLE IF NOT EXISTS public.road_risk_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_id TEXT NOT NULL,
    road_name TEXT DEFAULT 'Sector Road',
    geometry JSONB DEFAULT '{}'::jsonb,
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    risk_level TEXT NOT NULL DEFAULT 'SAFE' CHECK (risk_level IN ('SAFE', 'CAUTION', 'DANGEROUS', 'BLOCKED')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CAUTION', 'RESTRICTED', 'BLOCKED')),
    blockage_reason TEXT DEFAULT '',
    source TEXT DEFAULT 'AI_RISK_ENGINE',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calculated Evacuation Routes
CREATE TABLE IF NOT EXISTS public.evacuation_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT DEFAULT '',
    origin_latitude DOUBLE PRECISION NOT NULL,
    origin_longitude DOUBLE PRECISION NOT NULL,
    destination_shelter_id UUID REFERENCES public.emergency_shelters(id) ON DELETE SET NULL,
    route_type TEXT DEFAULT 'SAFEST' CHECK (route_type IN ('SAFEST', 'FASTEST_SAFE', 'ALTERNATIVE_SAFE')),
    route_geojson JSONB NOT NULL DEFAULT '{}'::jsonb,
    distance_km DOUBLE PRECISION NOT NULL,
    estimated_time_minutes INTEGER NOT NULL,
    safety_score DOUBLE PRECISION NOT NULL,
    risk_exposure TEXT NOT NULL DEFAULT 'LOW',
    route_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (route_status IN ('ACTIVE', 'COMPLETED', 'ABANDONED', 'REROUTED')),
    explanation JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Citizen Evacuation Telemetry Status (Privacy-Aware)
CREATE TABLE IF NOT EXISTS public.citizen_evacuation_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'SAFE' CHECK (current_status IN (
        'SAFE', 'MONITORING', 'EVACUATION_RECOMMENDED', 'EVACUATING', 'REACHED_SHELTER', 'SOS_ACTIVE', 'LOCATION_UNAVAILABLE'
    )),
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    assigned_shelter_id UUID REFERENCES public.emergency_shelters(id) ON DELETE SET NULL,
    active_route_id UUID REFERENCES public.evacuation_routes(id) ON DELETE SET NULL,
    consent_enabled BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Road Hazard & Blockage Incidents (Crowdsourced + Verified)
CREATE TABLE IF NOT EXISTS public.road_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id TEXT DEFAULT 'ANONYMOUS',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'Landslide', 'Road Blockage', 'Ground Crack', 'Falling Rocks', 'Water Seepage', 'Flooding', 'Bridge Damage', 'Damaged Road'
    )),
    severity TEXT NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT DEFAULT '',
    media_url TEXT DEFAULT '',
    verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'RESOLVED')),
    authenticity_score DOUBLE PRECISION DEFAULT 100.0,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SOS Emergency Requests & AI Rescue Prioritization
CREATE TABLE IF NOT EXISTS public.sos_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT DEFAULT 'CITIZEN',
    user_name TEXT DEFAULT 'Citizen in Distress',
    user_phone TEXT DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    people_count INTEGER NOT NULL DEFAULT 1,
    injury_status BOOLEAN NOT NULL DEFAULT FALSE,
    injury_details TEXT DEFAULT '',
    battery_level INTEGER DEFAULT 100,
    network_status TEXT DEFAULT 'CONNECTED',
    current_risk TEXT NOT NULL DEFAULT 'HIGH',
    evacuation_status TEXT DEFAULT 'SOS_ACTIVE',
    rescue_priority_score DOUBLE PRECISION NOT NULL DEFAULT 85.0,
    priority_category TEXT NOT NULL DEFAULT 'CRITICAL RESCUE' CHECK (priority_category IN (
        'CRITICAL RESCUE', 'HIGH PRIORITY', 'MEDIUM PRIORITY', 'LOW PRIORITY', 'MONITORING'
    )),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPATCHED', 'RESCUED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rescue Teams Directory
CREATE TABLE IF NOT EXISTS public.rescue_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_name TEXT NOT NULL,
    leader_name TEXT DEFAULT '',
    phone_number TEXT DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    availability_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'DISPATCHED', 'ON_SCENE', 'OFFLINE')),
    capability TEXT DEFAULT 'Landslide Search & Rescue, Medical First Aid',
    current_assignment UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rescue Assignments & Tracking
CREATE TABLE IF NOT EXISTS public.rescue_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_request_id UUID NOT NULL REFERENCES public.sos_requests(id) ON DELETE CASCADE,
    rescue_team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE CASCADE,
    route_geojson JSONB DEFAULT '{}'::jsonb,
    assignment_status TEXT NOT NULL DEFAULT 'EN_ROUTE' CHECK (assignment_status IN ('EN_ROUTE', 'ON_SITE', 'PATIENT_SECURED', 'COMPLETED', 'ABORTED')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for Fast Geospatial & Priority Lookups
CREATE INDEX IF NOT EXISTS idx_emergency_shelters_coords ON public.emergency_shelters(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_road_risk_status_road_id ON public.road_risk_status(road_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_priority ON public.sos_requests(rescue_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_sos_requests_status ON public.sos_requests(status);
CREATE INDEX IF NOT EXISTS idx_road_incidents_coords ON public.road_incidents(latitude, longitude);

-- Publication Update
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.users,
  public.hazard_reports, 
  public.image_verification, 
  public.sos_alerts, 
  public.risk_predictions,
  public.emergency_shelters,
  public.road_risk_status,
  public.evacuation_routes,
  public.citizen_evacuation_status,
  public.road_incidents,
  public.sos_requests,
  public.rescue_teams,
  public.rescue_assignments;

