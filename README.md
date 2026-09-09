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
- `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `FAST2SMS_API_KEY`, and `VOICE_PROVIDER_API_KEY` are strictly isolated inside server-side Edge Functions/backend environment variables and never exposed to the frontend.

---

## 📡 SMS Landslide Early Warning System (Fast2SMS & Supabase Integration)

### 1. Architecture Overview
When **PRITHVI-SHIELD** calculates a final combined landslide risk assessment (XGBoost AI Model + Geotechnical Physics Model + Sentinel-2 Satellite Imagery + Dual GEE Engines):
1. **Assessment Check**: If the final combined risk level is `HIGH` or `CRITICAL`, the system automatically triggers the SMS warning pipeline.
2. **Citizen Radius Lookup**: The system queries registered citizens (`public.citizen_users`) within the configured `SMS_DANGER_RADIUS_KM` (default **5 km**) using Haversine distance calculations.
3. **Alert Deduplication**: Cooldown logic checks `public.sms_alerts` to prevent duplicate SMS warnings to the same phone within `SMS_ALERT_COOLDOWN_MINUTES` (default **30 mins**).
4. **Escalation Override**: Escalation from `HIGH` $\rightarrow$ `CRITICAL` bypasses the cooldown window to dispatch immediate emergency evacuation warnings.
5. **Server-Side Dispatch**: Sends SMS warnings via **Fast2SMS API** (`https://www.fast2sms.com/dev/bulkV2`) from server-side Deno Edge Function or FastAPI backend without exposing API keys.

---

### 2. Required Supabase Configuration & Secrets
Set your server-side environment secrets in Supabase CLI or FastAPI `.env`:
```bash
# Set Fast2SMS API Key (Server-Side Only)
supabase secrets set FAST2SMS_API_KEY=your_fast2sms_api_key

# Optional Configuration Defaults
supabase secrets set SMS_DANGER_RADIUS_KM=5
supabase secrets set SMS_ALERT_COOLDOWN_MINUTES=30
```

---

### 3. Database Migration
Apply SQL migration `supabase/migrations/007_sms_early_warning.sql`:
```bash
# Applies citizen location columns (latitude, longitude) and creates public.sms_alerts log table
supabase db push
```

---

### 4. Deploying the Supabase Edge Function
Deploy the `send-alert-sms` Edge Function:
```bash
supabase functions deploy send-alert-sms
```

---

### 5. How Citizen Location Works
- **App Permission**: When a citizen grants location permission in the Citizen Mobile App (`App for citizen`), their coordinates (`lat`, `lng`) are updated in Supabase (`public.citizen_users`).
- **Privacy Compliance**: Location is used solely to determine whether the citizen falls inside a predicted landslide danger radius.

---

### 6. Test SMS Mode (SIH Demonstration)
Authorized admins can test SMS early warning delivery directly from the Admin Command Center (`prahari_website/dashboard.html`):
1. Open **Admin Dashboard** $\rightarrow$ **SMS Landslide Early Warning Panel**.
2. Enter recipient mobile number (e.g. `+91 98765 43210`).
3. Select simulated risk level (`HIGH` or `CRITICAL`).
4. Click **`[ SEND TEST EMERGENCY SMS ]`**.
5. The message is labeled **"Test Alert — No Real Emergency"** and sent safely.

---

### 7. India Fast2SMS & DLT Requirements
For production SMS delivery in India:
- Ensure your Fast2SMS account has an active balance.
- Standard Quick SMS route (`route: "q"`) or DLT-registered templates can be specified in `fast2sms` request configuration.
- Phone numbers are automatically normalized to 10-digit Indian mobile format (`9876543210`).

---

### 8. Troubleshooting
- **Simulation Mode**: If `FAST2SMS_API_KEY` is absent or unconfigured, the system operates in **Simulation Mode**, generating audit logs in `public.sms_alerts` with status `SIMULATED` without raising runtime errors.
- **Non-Blocking Execution**: SMS dispatch failures never break the core `/analyze-location` endpoint. Predictions return cleanly even if Fast2SMS is unreachable.

