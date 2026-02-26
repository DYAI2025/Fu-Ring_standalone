-- ============================================================
-- Astro-Noctum: Supabase Schema + RLS Policies
-- Run this in the Supabase SQL Editor (once)
-- ============================================================

-- ── 1. profiles (auto-created on signup via trigger) ────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  ui_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. birth_data ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS birth_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_utc TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  tz TEXT,
  place_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_birth_data_user ON birth_data(user_id);

-- ── 3. astro_profiles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS astro_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date TEXT,
  birth_time TEXT,
  iana_time_zone TEXT,
  birth_lat DOUBLE PRECISION,
  birth_lng DOUBLE PRECISION,
  birth_place_name TEXT,
  sun_sign TEXT,
  moon_sign TEXT,
  asc_sign TEXT,
  astro_json JSONB,
  astro_computed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. natal_charts (history of calculations) ───────────────
CREATE TABLE IF NOT EXISTS natal_charts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  engine_version TEXT DEFAULT 'bafe-v1',
  zodiac TEXT DEFAULT 'tropical',
  house_system TEXT DEFAULT 'placidus',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_natal_charts_user ON natal_charts(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── birth_data ──────────────────────────────────────────────
ALTER TABLE birth_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own birth_data" ON birth_data;
CREATE POLICY "Users manage own birth_data" ON birth_data
  FOR ALL USING (auth.uid() = user_id);

-- ── astro_profiles ──────────────────────────────────────────
ALTER TABLE astro_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own astro_profile" ON astro_profiles;
CREATE POLICY "Users read own astro_profile" ON astro_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upsert own astro_profile" ON astro_profiles;
CREATE POLICY "Users upsert own astro_profile" ON astro_profiles
  FOR ALL USING (auth.uid() = user_id);

-- ── natal_charts ────────────────────────────────────────────
ALTER TABLE natal_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own charts" ON natal_charts;
CREATE POLICY "Users manage own charts" ON natal_charts
  FOR ALL USING (auth.uid() = user_id);
