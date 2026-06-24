-- =========================================================================
-- SUPABASE POSTGRESQL MIGRATION SCHEMA FOR BIOVISED
-- =========================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create 'teachers' table
CREATE TABLE IF NOT EXISTS public.teachers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    avatar VARCHAR(1024),
    rating NUMERIC(3, 2) DEFAULT 4.5,
    accuracy INTEGER DEFAULT 90,
    video_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    bio TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create 'playlists' table
CREATE TABLE IF NOT EXISTS public.playlists (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    thumbnail VARCHAR(1024),
    description TEXT,
    teacher_id VARCHAR(255) REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create 'videos' table
CREATE TABLE IF NOT EXISTS public.videos (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(1024) NOT NULL,
    duration VARCHAR(50),
    category VARCHAR(255) DEFAULT 'lecture',
    playlist_id VARCHAR(255) REFERENCES public.playlists(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create 'test_series' table
CREATE TABLE IF NOT EXISTS public.test_series (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    total_tests INTEGER DEFAULT 20,
    category VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create 'profiles' table for user properties and onboarding context
CREATE TABLE IF NOT EXISTS public.profiles (
    uid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    exam_type VARCHAR(100) DEFAULT 'NEET',
    appearing_year VARCHAR(50) DEFAULT '2026',
    preferred_subjects JSONB,
    watched_content JSONB,
    saved_content JSONB,
    hidden_content JSONB,
    liked_content JSONB,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    login_type VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ROW-LEVEL SECURITY policies (Supabase standards)
-- =========================================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple read access policy for anonymous and authenticated users
CREATE POLICY "Allow public read-only access for teachers" ON public.teachers
    FOR SELECT USING (true);

CREATE POLICY "Allow public read-only access for playlists" ON public.playlists
    FOR SELECT USING (true);

CREATE POLICY "Allow public read-only access for videos" ON public.videos
    FOR SELECT USING (true);

CREATE POLICY "Allow public read-only access for test_series" ON public.test_series
    FOR SELECT USING (true);

-- Allow individual user access profiles policies
CREATE POLICY "Allow individual read profile" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow individual write profile" ON public.profiles
    FOR ALL USING (true);
