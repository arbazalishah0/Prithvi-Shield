# PRITHVI-SHIELD / SafeGround — Full-Stack AI Landslide Early Warning & Citizen Safety Platform

PRITHVI-SHIELD is a production-grade disaster intelligence system built with a **Vite / Vanilla JS Citizen App**, **Prahari Command Admin Dashboard**, **Supabase PostgreSQL & Storage**, **Groq AI (Llama-3.3-70b)**, **Retell Voice AI**, and **Leaflet GIS Maps**.

---

## 🏛 System Architecture

```
                    CITIZEN APP & ADMIN DASHBOARD
                                 |
        +------------------------+------------------------+
        |                        |                        |
     AUTH UI                  MAP UI                    AI UI
        |                        |                        |
        +------------------------+------------------------+
                                 |
                          SUPABASE CLIENT
                                 |
        +------------------------+------------------------+
        |                        |                        |
    PostgreSQL                Storage               Edge Functions
  (RLS Enabled)            (place-photos)                 |
                                                   +------+------+
                                                   |             |
                                                 Groq       Retell Voice
```

---

## 🗄 Database Schema (Supabase PostgreSQL)

- **`profiles`**: User profiles with strict `user` vs `admin` roles.
- **`categories`**: Classification tags (`Landslide Hazard Zone`, `Evacuation Shelter`, `Ground Fissure`, etc.).
- **`places`**: Geographic monitoring points with coordinates, address, and status.
- **`photos`**: Image metadata linking Supabase Storage paths to places.
- **`ai_conversations` & `ai_messages`**: Persistent user chat history with structured AI tool calls.
- **`voice_sessions`**: Real-time voice session audio state logs.
- **`application_settings` & `audit_logs`**: System audit trails and global configuration.

---

## 🚀 Setup & Deployment Guide

### 1. Database Migrations
Execute the SQL files in `supabase/migrations/` sequentially inside your Supabase SQL Editor:
1. `001_initial_schema.sql`
2. `002_indexes.sql`
3. `003_rls_policies.sql`
4. `004_storage.sql`
5. `seed.sql`

### 2. Edge Functions Setup
Deploy the Supabase Edge Functions:
```bash
supabase functions deploy ai-chat
supabase functions deploy voice-session
```

Set server-side secrets:
```bash
supabase secrets set GROQ_API_KEY=your_groq_key
supabase secrets set VOICE_PROVIDER_API_KEY=your_retell_key
supabase secrets set VOICE_AGENT_ID=your_agent_id
```

### 3. Local Development
```bash
# Start Citizen App
cd "App for citizen"
npm install
npm run dev

# Start Prahari Command Admin Website
cd "../prahari_website"
python -m http.server 5500
```

---

## 🔒 Security & Row Level Security (RLS)
- Public users can view published active places, categories, and public photos.
- Authenticated users can create and view their own AI conversations, messages, and voice sessions.
- Only verified `admin` users can insert, update, archive/delete places or upload photos to Supabase Storage.
- `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, and `VOICE_PROVIDER_API_KEY` are strictly isolated inside server-side Edge Functions and never exposed to the frontend.
