-- ==========================================
-- 003_rls_policies.sql
-- Row Level Security & Access Control Policies
-- ==========================================

-- ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION TO CHECK IF CURRENT USER IS ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by owner or admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())); -- Prevent self-role elevation

-- 2. CATEGORIES POLICIES
CREATE POLICY "Categories are viewable by everyone"
    ON public.categories FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can insert/update/delete categories"
    ON public.categories FOR ALL
    USING (is_admin());

-- 3. PLACES POLICIES
CREATE POLICY "Active places are viewable by everyone"
    ON public.places FOR SELECT
    USING (status = 'ACTIVE' OR is_admin());

CREATE POLICY "Only admins can insert/update/delete places"
    ON public.places FOR ALL
    USING (is_admin());

-- 4. PHOTOS POLICIES
CREATE POLICY "Photos are viewable by everyone"
    ON public.photos FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can upload/update/delete photos"
    ON public.photos FOR ALL
    USING (is_admin());

-- 5. AI CONVERSATIONS POLICIES
CREATE POLICY "Users can view their own AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert their own AI conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update/delete their own AI conversations"
    ON public.ai_conversations FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. AI MESSAGES POLICIES
CREATE POLICY "Users can view messages in their conversations"
    ON public.ai_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE id = conversation_id AND user_id = auth.uid()
        ) OR is_admin()
    );

CREATE POLICY "Users can insert messages into their conversations"
    ON public.ai_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

-- 7. VOICE SESSIONS POLICIES
CREATE POLICY "Users can view their own voice sessions"
    ON public.voice_sessions FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert/update their own voice sessions"
    ON public.voice_sessions FOR ALL
    USING (auth.uid() = user_id);

-- 8. APPLICATION SETTINGS POLICIES
CREATE POLICY "Admins can manage application settings"
    ON public.application_settings FOR ALL
    USING (is_admin());

CREATE POLICY "Public settings are viewable by everyone"
    ON public.application_settings FOR SELECT
    USING (TRUE);

-- 9. AUDIT LOGS POLICIES
CREATE POLICY "Only admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (is_admin());
