-- ==========================================
-- 004_storage.sql
-- Supabase Storage Bucket Configuration
-- ==========================================

-- CREATE STORAGE BUCKET 'place-photos'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'place-photos',
    'place-photos',
    TRUE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- STORAGE BUCKET RLS POLICIES
CREATE POLICY "Public Read Access for Place Photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'place-photos');

CREATE POLICY "Admin Upload Access for Place Photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'place-photos' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin Delete Access for Place Photos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'place-photos' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
