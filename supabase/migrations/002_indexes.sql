-- ==========================================
-- 002_indexes.sql
-- Targeted B-Tree & Spatial Indexes
-- ==========================================

-- PROFILES INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- PLACES INDEXES
CREATE INDEX IF NOT EXISTS idx_places_category_id ON public.places(category_id);
CREATE INDEX IF NOT EXISTS idx_places_status ON public.places(status);
CREATE INDEX IF NOT EXISTS idx_places_coords ON public.places(latitude, longitude);

-- PHOTOS INDEXES
CREATE INDEX IF NOT EXISTS idx_photos_place_id ON public.photos(place_id);
CREATE INDEX IF NOT EXISTS idx_photos_is_primary ON public.photos(is_primary);

-- AI CONVERSATIONS & MESSAGES INDEXES
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);

-- VOICE SESSIONS INDEXES
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON public.voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON public.voice_sessions(status);
