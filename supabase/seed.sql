-- ==========================================
-- seed.sql
-- Seed Categories, Initial Places, and Settings
-- ==========================================

-- Seed Categories
INSERT INTO public.categories (id, name, description, icon) VALUES
('a0000000-0000-0000-0000-000000000001', 'Landslide Hazard Zone', 'Monitored steep terrain or active movement slope', 'warning'),
('a0000000-0000-0000-0000-000000000002', 'Ground Fissure & Crack', 'Deep geological fracture or road asphalt displacement', 'report_problem'),
('a0000000-0000-0000-0000-000000000003', 'Evacuation Shelter', 'Safe civic center, medical relief base, or school', 'home_pin'),
('a0000000-0000-0000-0000-000000000004', 'Soil Movement Node', 'High soil saturation and creep displacement area', 'grain'),
('a0000000-0000-0000-0000-000000000005', 'Debris Road Blockage', 'Obstruction along transport corridors', 'block')
ON CONFLICT (name) DO NOTHING;

-- Seed Places
INSERT INTO public.places (id, name, description, address, latitude, longitude, category_id, status) VALUES
('b0000000-0000-0000-0000-000000000001', 'Wayanad High Risk Ridge Sector 4', 'Critical slope movement detected following heavy monsoon precipitation.', 'Meppadi, Wayanad, Kerala, India', 11.5524, 76.1245, 'a0000000-0000-0000-0000-000000000001', 'ACTIVE'),
('b0000000-0000-0000-0000-000000000002', 'Central Civic Shelter & Aid Station', '24/7 Evacuation center equipped with emergency power and medical supplies.', 'Civic Center Road, Sector 2, Wayanad', 11.5580, 76.1310, 'a0000000-0000-0000-0000-000000000003', 'ACTIVE'),
('b0000000-0000-0000-0000-000000000003', 'Shimla Highway Ground Fissure', '15cm asphalt crack extending 45 meters across NH-5.', 'National Highway 5, Shimla, Himachal Pradesh', 31.1048, 77.1734, 'a0000000-0000-0000-0000-000000000002', 'ACTIVE'),
('b0000000-0000-0000-0000-000000000004', 'Joshimath Structural Creep Zone', 'Deep soil displacement monitoring node with tilt sensor arrays.', 'Upper Bazaar, Joshimath, Uttarakhand', 30.5568, 79.5657, 'a0000000-0000-0000-0000-000000000004', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Photos
INSERT INTO public.photos (id, place_id, storage_path, public_url, alt_text, is_primary) VALUES
('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'places/wayanad_ridge.jpg', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', 'Wayanad Mountain Ridge Slope', TRUE),
('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'places/civic_shelter.jpg', 'https://images.unsplash.com/photo-1587582423116-ec07293f0395?auto=format&fit=crop&w=800&q=80', 'Civic Shelter Building', TRUE),
('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'places/shimla_fissure.jpg', 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80', 'Ground Fissure on Highway', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Settings
INSERT INTO public.application_settings (key, value) VALUES
('platform_title', '"PRITHVI-SHIELD Command"'::jsonb),
('ai_model', '"Groq Llama-3.3-70b-versatile"'::jsonb),
('voice_provider', '"Retell AI"'::jsonb),
('geofence_default_radius_km', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;
