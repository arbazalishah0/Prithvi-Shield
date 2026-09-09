-- ============================================================================
-- PRITHVI-SHIELD / PRAHARI (SIH 2026)
-- Migration 006: Admin-to-Citizen Emergency Messaging & FCM Notification System
-- ============================================================================

-- 1. CITIZEN USERS & COMMUNICATION PROFILE
CREATE TABLE IF NOT EXISTS public.citizen_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_account_id VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    region VARCHAR(100) NOT NULL DEFAULT 'All Regions',
    state VARCHAR(100) DEFAULT 'Assam',
    preferred_language VARCHAR(30) NOT NULL DEFAULT 'English',
    notification_permission BOOLEAN NOT NULL DEFAULT true,
    account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DEVICE FCM TOKENS REGISTRY
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    fcm_token TEXT NOT NULL UNIQUE,
    platform VARCHAR(30) NOT NULL DEFAULT 'android',
    app_version VARCHAR(30) DEFAULT '3.0.0',
    notification_enabled BOOLEAN NOT NULL DEFAULT true,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EMERGENCY ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(30) NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    priority VARCHAR(30) NOT NULL CHECK (priority IN ('Normal', 'High', 'Maximum')),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ALL', 'REGION', 'SELECTED_USERS')),
    target_region VARCHAR(100) DEFAULT 'All Regions',
    language VARCHAR(30) NOT NULL DEFAULT 'English',
    safety_instructions JSONB DEFAULT '[]'::jsonb,
    created_by VARCHAR(100) NOT NULL DEFAULT 'PRAHARI Disaster Management Authority',
    status VARCHAR(30) NOT NULL DEFAULT 'SENT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED')),
    recipients_count INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ALERT RECIPIENTS DELIVERY TRACKING
CREATE TABLE IF NOT EXISTS public.alert_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    fcm_token TEXT,
    notification_status VARCHAR(30) NOT NULL DEFAULT 'SENT' CHECK (notification_status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

-- INDEXES FOR HIGH-SPEED QUERYING
CREATE INDEX IF NOT EXISTS idx_citizen_region ON public.citizen_users(region);
CREATE INDEX IF NOT EXISTS idx_device_user ON public.device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_sent ON public.emergency_alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipient_alert ON public.alert_recipients(alert_id);

-- SEED TEST CITIZENS FOR HIGH-RISK DISASTER REGIONS
INSERT INTO public.citizen_users (user_account_id, full_name, email, phone, region, preferred_language, account_status)
VALUES 
    ('citizen_001', 'Arunav Baruah', 'arunav.baruah@assam.gov.in', '+91 98640 11223', 'Kamrup / Guwahati', 'Assamese', 'ACTIVE'),
    ('citizen_002', 'Dipika Saikia', 'dipika.saikia@gmail.com', '+91 94350 44556', 'Dima Hasao / Haflong', 'Assamese', 'ACTIVE'),
    ('citizen_003', 'Rajesh Sharma', 'rajesh.sharma@uk.gov.in', '+91 98370 77889', 'Chamoli / Joshimath', 'Hindi', 'ACTIVE'),
    ('citizen_004', 'Ananya Nair', 'ananya.nair@kerala.gov.in', '+91 94470 99001', 'Wayanad / Meppadi', 'English', 'ACTIVE'),
    ('citizen_005', 'Tashi Lepcha', 'tashi.lepcha@sikkim.gov.in', '+91 97330 22334', 'Gangtok / North Sikkim', 'English', 'ACTIVE'),
    ('citizen_006', 'Subhashish Das', 'subhashish.das@wb.gov.in', '+91 98300 55667', 'Darjeeling / Kalimpong', 'Bengali', 'ACTIVE')
ON CONFLICT (user_account_id) DO NOTHING;

-- SEED MOCK FCM DEVICE TOKENS
INSERT INTO public.device_tokens (user_id, fcm_token, platform, notification_enabled)
VALUES
    ('citizen_001', 'fcm_token_arunav_kamrup_android_demo_001', 'android', true),
    ('citizen_002', 'fcm_token_dipika_dima_android_demo_002', 'android', true),
    ('citizen_003', 'fcm_token_rajesh_chamoli_android_demo_003', 'android', true),
    ('citizen_004', 'fcm_token_ananya_wayanad_android_demo_004', 'android', true),
    ('citizen_005', 'fcm_token_tashi_gangtok_android_demo_005', 'android', true),
    ('citizen_006', 'fcm_token_subhashish_darjeeling_android_demo_006', 'android', true)
ON CONFLICT (fcm_token) DO NOTHING;

-- SEED INITIAL DISASTER BROADCAST RECORDS
INSERT INTO public.emergency_alerts (
    alert_code, title, message, severity, priority, target_type, target_region, language, safety_instructions, created_by, status, recipients_count, delivered_count, sent_at
) VALUES (
    'ALT-2026-001',
    'CRITICAL LANDSLIDE WARNING',
    'High landslide risk detected near slopes due to torrential 145mm precipitation. Immediate evacuation advised.',
    'CRITICAL',
    'Maximum',
    'REGION',
    'Kamrup / Guwahati',
    'English',
    '["Avoid unstable slope corridors.", "Move towards designated shelter at Haflong Town Hall.", "Keep emergency grab-bag ready.", "Follow instructions from NDRF Battalion 1."]'::jsonb,
    'PRAHARI Command State HQ',
    'DELIVERED',
    1245,
    1180,
    NOW() - INTERVAL '2 hours'
), (
    'ALT-2026-002',
    'HEAVY RAINFALL PRECAUTIONARY ADVISORY',
    'IMD forecast predicts extreme cloudburst over mountain passes. Avoid non-essential hill travel.',
    'HIGH',
    'High',
    'REGION',
    'Wayanad / Meppadi',
    'English',
    '["Do not cross swollen river channels.", "Stay away from identified high-susceptibility hazard zones.", "Report surface ground fissures to PRAHARI hotline 1077."]'::jsonb,
    'Kerala SDMA & PRITHVI-SHIELD',
    'SENT',
    3420,
    3390,
    NOW() - INTERVAL '6 hours'
) ON CONFLICT (alert_code) DO NOTHING;
