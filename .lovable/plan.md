
# MedSetu — AI Healthcare Bridge (Phase 1)

A mobile-first responsive **web app** built on Lovable's stack (React + TanStack Start + Lovable Cloud + Lovable AI Gateway + Google Maps connector). This replaces the requested Flutter/Firebase stack, which Lovable does not support. All listed features will be functional.

## Stack mapping

- **UI**: React + Tailwind, mobile-first card layout, healthcare theme (deep blue `#0A6CB8`, white, healing green `#10B981`), shadcn components.
- **Backend**: Lovable Cloud (Supabase) — Postgres + Auth + Storage + RLS.
- **AI**: Lovable AI Gateway, model `google/gemini-3-flash-preview` (multimodal: text + images for OCR-free report analysis, multilingual replies).
- **Maps**: Google Maps connector (browser key for map + Places New for hospital search; gateway for Routes/Geocoding).
- **Voice**: Lovable AI STT (`openai/gpt-4o-mini-transcribe`) + TTS (`openai/gpt-4o-mini-tts`), both multilingual.
- **i18n**: 11 Indian languages (EN, HI, MR, TE, TA, BN, GU, PA, KN, ML, UR). Static UI strings hand-translated for EN/HI; other languages translated on demand by Gemini and cached. AI responses always in the user's selected language.

## Auth

Lovable Cloud auth — three methods on one screen:

1. **Email + password** (standard).
2. **Google sign-in** (managed OAuth).
3. **Aadhaar mock OTP demo** — 12-digit input, validate format, generate a 6-digit mock OTP shown on-screen (clearly labeled "DEMO"), on verify create/sign in via email-pass under a synthesized `aadhaar+{hash}@medsetu.local` account. Profile screen has an **ABHA ID** text field (mock — stored, not verified).

A `profiles` table auto-populated by trigger on signup stores: `display_name`, `age`, `gender`, `preferred_language`, `abha_id`, `aadhaar_last4`, `phone`.

## Pages

```
/                      Splash → redirect by auth state
/auth                  Login/Register (3 methods + Guest)
/onboarding            Language picker + basic profile (first run)
/_authenticated/
  /home                Dashboard with 5 feature cards + greeting
  /triage              AI Symptom Triage (text + mic + TTS playback)
  /reports             Medical Report Analyzer (upload → Gemini)
  /hospitals           Nearby Hospital Finder (map + list + route)
  /sos                 Emergency SOS (big red button + contacts)
  /medicines           Medicine Reminder (list + add + browser notifs)
  /profile             Profile + language switcher + emergency contacts
  /admin               Government Dashboard (gated by `admin` role)
```

Public `/api/public/heatmap` returns aggregated, anonymized symptom counts by region for the admin heatmap (admin route still verifies role).

## Database (Lovable Cloud / Postgres)

All tables get GRANTs + RLS. Owner-only policies except where noted.

- `profiles` — 1:1 with `auth.users`, includes language and ABHA fields.
- `user_roles` (separate table, enum `app_role`: `user`, `admin`) + `has_role()` security-definer function.
- `symptoms` — id, user_id, input_text, language, ai_response (jsonb: condition, severity, specialist, precautions), region (coarse city/state from geo), created_at.
- `reports` — id, user_id, file_path (Storage), mime, ai_summary, language, created_at.
- `medicines` — id, user_id, name, dosage, schedule (jsonb: times[], days[]), active, created_at.
- `medicine_logs` — id, medicine_id, user_id, taken_at, status.
- `emergency_alerts` — id, user_id, lat, lng, message, language, status, created_at.
- `emergency_contacts` — id, user_id, name, phone, relation.
- `hospitals` — cache of Places results (place_id, name, lat, lng, address, phone, emergency_flag).
- `analytics_daily` (materialized via SQL function): region × condition × severity × date counts. Admin-only SELECT.

Storage bucket `reports` (private, owner-only read/write).

## Server functions (`src/lib/*.functions.ts`)

- `triageSymptoms({ text, language })` — Gemini prompt: "Analyze symptoms, classify severity (Low/Medium/High), suggest specialist + precautions. Respond in {language} as strict JSON." Saves to `symptoms`.
- `analyzeReport({ fileBase64, mime, language })` — Gemini multimodal (no separate OCR; Gemini reads images/PDF directly). Returns simplified explanation in user's language. Saves to `reports`.
- `transcribeAudio({ wavBase64, language })` — Lovable AI STT, SSE streamed back.
- `synthesizeSpeech({ text, language })` — Lovable AI TTS PCM streaming.
- `translateUiStrings({ keys[], language })` — Gemini batch translate, cached server-side (key/language).
- `createSosAlert({ lat, lng })` — translates "Patient needs urgent help" into user's language, inserts row; broadcasts via Supabase realtime to admin channel.
- `getHeatmap()` — admin only; returns aggregates from `analytics_daily`.

## Feature details

**AI Triage** — text area + mic button (Web Audio → WAV → STT). Result card shows colored severity badge, specialist chip, bulleted precautions, "🔊 Listen" button (TTS). Saved to history.

**Report Analyzer** — drag/drop or camera capture. Image or PDF → base64 → Gemini multimodal. Output: plain-language explanation + key terms glossary, all in user's language. Saved history with thumbnail.

**Hospital Finder** — geolocation → Google Maps JS API map (browser key, `loading=async`, plain `Marker`s, no `mapId`). Places API (New) `searchNearby` for `hospital` type via gateway. List sorted by distance, emergency hospitals (24h flag) pinned to top. "Directions" opens Google Maps; inline distance/duration from Routes API.

**SOS** — full-screen red button, 3-second hold to confirm (prevents misfires). On trigger: capture geo, insert `emergency_alerts`, show "Help on the way" with local-language voice playback, list emergency contacts with `tel:` links.

**Medicine Reminder** — add medicine (name, dose, times, days). Browser `Notification` API + service-worker-less interval check while tab is open + cron-style check on each app load. Mark as taken writes to `medicine_logs`.

**Admin Dashboard** — gated by `has_role(auth.uid(), 'admin')`. Tabs: Disease hotspots (region heatmap on Google Map with circle overlays sized by case count), Top conditions (bar chart, Recharts), Severity distribution (pie), Emergency feed (realtime). All from `analytics_daily` + `emergency_alerts`.

**Multilingual** — Single `LanguageProvider` exposing `t(key, fallback)`. EN/HI shipped as JSON. Other languages: on first use of a string, server-side Gemini translate, cached in `ui_translations` table. AI responses always returned in `profile.preferred_language`. STT/TTS pass language codes (e.g. `hi`, `mr`).

## Design system

- Tokens in `src/styles.css`: primary `#0A6CB8`, accent `#10B981`, danger `#EF4444`, surface `#F8FAFC`.
- Fonts via `@fontsource/inter` (UI) + `@fontsource/poppins` (headings).
- Card-based home grid (2 columns mobile, 4 desktop), big iconography, generous spacing, soft shadows.
- Loading skeletons everywhere, toast errors via `sonner`.

## Out of scope for Phase 1 (call out, do later)

- Real Aadhaar/UIDAI/DigiLocker integration (would need official API access).
- Real ABHA fetch of prescriptions (mock field only).
- Push notifications when tab closed (browser limitation; would need PWA + push service).
- Offline mode beyond cached last-view (full offline sync is a follow-up).
- Speech in less common Indian languages may be lower quality (model-dependent).

## Build order

1. Theme + design tokens + LanguageProvider + EN/HI strings.
2. Auth (email, Google, Aadhaar mock) + profiles table + onboarding + language picker.
3. Home dashboard shell + route gates.
4. AI Triage end-to-end (text first, then voice in/out).
5. Report Analyzer (multimodal Gemini).
6. Google Maps connector + Hospital Finder.
7. SOS + emergency contacts + realtime channel.
8. Medicine Reminder + notifications.
9. Admin role + analytics aggregation + dashboard.
10. Polish: skeletons, error boundaries, history pages, SEO/meta per route.

I'll enable Lovable Cloud and the Google Maps connector at the start of the build. Phase 2 work (push notifications, deeper offline, real Aadhaar/ABHA) can be a follow-up after this lands.
