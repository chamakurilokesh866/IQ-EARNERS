-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates tables and storage bucket for quiz schedule and reports.
--
-- Extensions required by this script:
-- - pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
-- Tables: quiz_schedule, reports, settings, payments, quizzes, quiz_completions,
--         tournaments, profiles, leaderboard, referrals, upi_request_state,
--         blocked_users, unblocked_users, active_sessions, admin_login_history,
--         sponsor_requests (admin list/delete), referrals.payment_id
-- RPC: next_referral_code()
-- Storage: create bucket "uploads" manually (see bottom of file)

-- Quiz schedule table
CREATE TABLE IF NOT EXISTS quiz_schedule (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Quiz Material',
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  release_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  screenshot_url TEXT DEFAULT '',
  page_url TEXT DEFAULT '',
  username TEXT DEFAULT '',
  uid TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Settings table (for admin toggles, entry fee, QR URL, OTP length, etc.) – used on Vercel
-- data JSONB keys: currency, entryFee, targetAudience, progressBaseCount, createUsernameOtpLength (4 or 6), etc.
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT 0
);

-- Insert default row if not exists
INSERT INTO settings (id, data, updated_at) VALUES ('main', '{"currency":"INR","entryFee":100,"targetAudience":100}', extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- Payments table (for Cashfree + QR payments – works on Vercel)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  cashfree_order_id TEXT,
  payment_session_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'tournament',
  status TEXT NOT NULL DEFAULT 'pending',
  gateway TEXT DEFAULT 'qr',
  meta JSONB DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  confirmed_at BIGINT,
  profile_id TEXT
);

-- payments.meta (JSONB) examples — no extra columns needed:
--   Manual/QR: name, paymentKey, screenshotUrl, email, deny_reason, approved_at, denied_at
--   Withdrawal (type = 'withdraw'): uid, username, upiId; payout: paidOut, paidOutAt (merged on update)
--   Cashfree: customerName, utr, etc.

-- If upgrading existing DB, run in Supabase SQL Editor:
-- ALTER TABLE payments ADD COLUMN IF NOT EXISTS profile_id TEXT;

-- Quizzes table (for quiz PDF uploads – works on Vercel)
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT DEFAULT '',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL
);

-- Multi-language quiz support + AI-generated quiz fields (run if upgrading)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions_multi_lang JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS languages JSONB;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions_by_language JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'daily';
-- Ensure created_at has a default for new inserts
ALTER TABLE quizzes ALTER COLUMN created_at SET DEFAULT (extract(epoch from now()) * 1000)::bigint;

-- Tournaments table (for tournament creation – works on Vercel)
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL DEFAULT 0
);

-- Profiles table (usernames, referral codes, wallet, password hash – works on Vercel)
-- data JSONB can store: paid, memberId, passwordHash (scrypt salt:hash for login)
CREATE TABLE IF NOT EXISTS profiles (
  uid TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  referral_code TEXT UNIQUE,
  wallet NUMERIC NOT NULL DEFAULT 0,
  country TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Fast lookups (see lib/profiles.ts: getProfileByUsername uses ilike; getProfileByEmail uses data @> '{"email":...}')
-- Unique index on username already exists; GIN helps JSON containment for signup/login email checks.
CREATE INDEX IF NOT EXISTS idx_profiles_data_gin ON profiles USING GIN (data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (LOWER(username));

-- Leaderboard table (scores, country for flags – works on Vercel)
CREATE TABLE IF NOT EXISTS leaderboard (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  total_time_seconds NUMERIC,
  country TEXT,
  tournament_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

-- Referrals table (referral tracking – works on Vercel)
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_uid TEXT NOT NULL,
  referrer_code TEXT NOT NULL,
  referred_uid TEXT,
  referred_username TEXT,
  visitor_id TEXT,
  status TEXT NOT NULL DEFAULT 'visited',
  amount NUMERIC NOT NULL DEFAULT 50,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);
-- Linked when a referral is credited to a payment (see referrals.ts updateReferral)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS payment_id TEXT;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_uid ON referrals (referrer_uid);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals (created_at DESC);

-- Notices table (broadcast banners)
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  url TEXT,
  created_at BIGINT NOT NULL
);

-- Sequence for unique referral codes (IQREF-10-001, IQREF-10-002, ...)
CREATE SEQUENCE IF NOT EXISTS referral_code_seq START 10001;

-- RPC to get next unique referral code
CREATE OR REPLACE FUNCTION next_referral_code()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  n BIGINT;
BEGIN
  SELECT nextval('referral_code_seq') INTO n;
  RETURN n;
END;
$$;

-- UPI request state (1st place prize – works on Vercel)
CREATE TABLE IF NOT EXISTS upi_request_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  active JSONB,
  pending_next JSONB,
  history JSONB DEFAULT '[]'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT 0
);

INSERT INTO upi_request_state (id, active, pending_next, history, updated_at)
VALUES ('main', NULL, NULL, '[]'::jsonb, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- Certificate templates (URLs stored in settings.data; images in Storage uploads/certificates/)

-- Blocked users table (used during login to block access)
CREATE TABLE IF NOT EXISTS blocked_users (
  username TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT '',
  blocked_at BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_username_lower ON blocked_users (LOWER(username));

-- Unblocked users: when a blocked user pays and is approved, record unblock timestamp
-- Used to filter quizzes: unblocked users only see quizzes created after their unblock date
CREATE TABLE IF NOT EXISTS unblocked_users (
  username TEXT PRIMARY KEY,
  unblocked_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT 0
);

-- Sponsors / promotions / collaborations – incoming brand enquiries
CREATE TABLE IF NOT EXISTS sponsor_requests (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  brand TEXT NOT NULL,
  budget TEXT,
  message TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'sponsor',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_reply TEXT,
  uid TEXT,
  form_data JSONB,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);
ALTER TABLE sponsor_requests ADD COLUMN IF NOT EXISTS form_data JSONB;
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_created_at ON sponsor_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_status ON sponsor_requests (status);

-- Quiz completions (persists across refresh/Vercel – prevents re-taking)
CREATE TABLE IF NOT EXISTS quiz_completions (
  id TEXT PRIMARY KEY,
  username_lower TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  date_local TEXT NOT NULL,
  score NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  total_time_seconds NUMERIC NOT NULL DEFAULT 0,
  rows JSONB DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  UNIQUE(username_lower, quiz_id)
);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_username ON quiz_completions (username_lower);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_quiz ON quiz_completions (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_date ON quiz_completions (date_local);

-- User stats (streak, achievements, history, quiz start tracking – works on Vercel)
CREATE TABLE IF NOT EXISTS user_stats (
  username_lower TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT 0
);

-- Integrity events (quiz anti-cheat logging)
CREATE TABLE IF NOT EXISTS integrity_events (
  id TEXT PRIMARY KEY,
  username TEXT,
  type TEXT NOT NULL,
  reason TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integrity_events_username ON integrity_events (LOWER(username));

-- Inspect/DevTools alerts (when user opens browser DevTools – notify admin, optional block by IP)
CREATE TABLE IF NOT EXISTS inspect_alerts (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  user_agent TEXT DEFAULT '',
  username TEXT DEFAULT '',
  page_url TEXT DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  blocked_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_inspect_alerts_ip ON inspect_alerts (ip);
CREATE INDEX IF NOT EXISTS idx_inspect_alerts_created ON inspect_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspect_alerts_username ON inspect_alerts (LOWER(username));

-- Blocked IPs (from inspect alerts – blocks entire IP, not just username)
CREATE TABLE IF NOT EXISTS blocked_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'Unauthorized use of developer tools',
  blocked_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  alert_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_at ON blocked_ips (blocked_at DESC);

-- Enrollments (tournament participation – paid per tournament)
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT NOT NULL,
  tournament_id TEXT NOT NULL,
  unique_code TEXT,
  paid_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  UNIQUE(username, tournament_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_username ON enrollments (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_enrollments_tournament ON enrollments (tournament_id);

-- Active quiz sessions (single-device lock: one user per tournament at a time)
CREATE TABLE IF NOT EXISTS active_quiz_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT NOT NULL,
  tournament_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  device_fingerprint TEXT,
  started_at BIGINT NOT NULL,
  UNIQUE(username, tournament_id)
);
CREATE INDEX IF NOT EXISTS idx_active_quiz_sessions_username_tournament ON active_quiz_sessions (LOWER(username), tournament_id);

-- Inspect appeals (blocked-by-inspect users can appeal + pay fee)
CREATE TABLE IF NOT EXISTS inspect_appeals (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  email TEXT DEFAULT '',
  message TEXT DEFAULT '',
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  resolved_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_inspect_appeals_ip ON inspect_appeals (ip);
CREATE INDEX IF NOT EXISTS idx_inspect_appeals_status ON inspect_appeals (status);
CREATE INDEX IF NOT EXISTS idx_inspect_appeals_created_at ON inspect_appeals (created_at DESC);

-- User login sessions (single active login per account — activeSessions.ts)
CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  uid TEXT NOT NULL,
  sid TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  last_seen BIGINT,
  logged_out_at BIGINT,
  user_agent TEXT,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_active_sessions_uid ON active_sessions (uid);
CREATE INDEX IF NOT EXISTS idx_active_sessions_uid_sid ON active_sessions (uid, sid);
CREATE INDEX IF NOT EXISTS idx_active_sessions_created_at ON active_sessions (created_at DESC);

-- Admin login audit trail (adminLoginHistory.ts — dashboard “Login History” card)
CREATE TABLE IF NOT EXISTS admin_login_history (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  username TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  timestamp BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_login_history_timestamp ON admin_login_history (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_history_username ON admin_login_history (LOWER(username));

-- Storage: Create 'uploads' bucket and policies (for quiz PDFs, QR, certificates)
-- Run in SQL Editor. If you get "relation storage.buckets does not exist", create the bucket manually:
-- Dashboard → Storage → New bucket → Name: uploads, Public: ON, then run only the policies below (or skip; service role can upload without policies).
-- file_size_limit: 209715200 = 200MB (for large mock-exam PDFs, e.g. 100+ pages)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  209715200,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read for uploads bucket (so PDF/QR URLs work)
DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
CREATE POLICY "Public read uploads" ON storage.objects FOR SELECT TO public USING (bucket_id = 'uploads');
-- Allow API (service role) to upload/update/delete
DROP POLICY IF EXISTS "Allow uploads bucket insert" ON storage.objects;
CREATE POLICY "Allow uploads bucket insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
DROP POLICY IF EXISTS "Allow uploads bucket update" ON storage.objects;
CREATE POLICY "Allow uploads bucket update" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads');
DROP POLICY IF EXISTS "Allow uploads bucket delete" ON storage.objects;
CREATE POLICY "Allow uploads bucket delete" ON storage.objects FOR DELETE USING (bucket_id = 'uploads');

-- Mock Exams table
CREATE TABLE IF NOT EXISTS mock_exams (
  id TEXT PRIMARY KEY DEFAULT 'main',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL
);

-- Spins table (track user spins per quiz - rewards: 1, 5, 10, bad luck, scratch card)
CREATE TABLE IF NOT EXISTS spins (
  id TEXT PRIMARY KEY,
  username_lower TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value NUMERIC NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  UNIQUE(username_lower, quiz_id)
);
CREATE INDEX IF NOT EXISTS idx_spins_username ON spins (username_lower);
CREATE INDEX IF NOT EXISTS idx_spins_quiz ON spins (quiz_id);

-- Creator Applications
CREATE TABLE IF NOT EXISTS creator_applications (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  followers INT NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  cv_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_feedback TEXT DEFAULT '',
  suggested_role TEXT DEFAULT '',
  otp TEXT DEFAULT '',
  otp_expires_at BIGINT DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_creator_applications_status ON creator_applications (status);
CREATE INDEX IF NOT EXISTS idx_creator_applications_created_at ON creator_applications (created_at DESC);

-- Creator Profiles
CREATE TABLE IF NOT EXISTS creator_profiles (
  uid TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Creator',
  password_hash TEXT DEFAULT '',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  wallet NUMERIC NOT NULL DEFAULT 0,
  referrals INT NOT NULL DEFAULT 0,
  creator_type TEXT NOT NULL DEFAULT 'referral',
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_email_lower ON creator_profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_creator_profiles_handle_lower ON creator_profiles (LOWER(handle));

-- Common query performance indexes for admin dashboards / timeline views
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_profile_id ON payments (profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_schedule_release_at ON quiz_schedule (release_at);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrity_events_created_at ON integrity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_paid_at ON enrollments (paid_at DESC);

-- ============================================================================
-- Enterprise / Organization normalized schema (future-ready)
-- NOTE:
-- - Current code persists org state in settings.data.enterpriseState (JSONB).
-- - These tables are added now for scalable migration without breaking existing app.
-- - Safe to run multiple times (IF NOT EXISTS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS enterprise_organizations (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  plan TEXT NOT NULL DEFAULT 'free',
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  domain TEXT,
  member_count INT NOT NULL DEFAULT 0,
  quiz_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  approved BOOLEAN NOT NULL DEFAULT true,
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_password_hash TEXT NOT NULL,
  primary_color TEXT,
  accent_color TEXT,
  tagline TEXT
);
CREATE INDEX IF NOT EXISTS idx_enterprise_organizations_slug ON enterprise_organizations (slug);
CREATE INDEX IF NOT EXISTS idx_enterprise_organizations_active ON enterprise_organizations (active, suspended);
CREATE INDEX IF NOT EXISTS idx_enterprise_organizations_created_at ON enterprise_organizations (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_org_members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  role TEXT NOT NULL DEFAULT 'student',
  active BOOLEAN NOT NULL DEFAULT true,
  joined_at BIGINT NOT NULL,
  last_login_at BIGINT,
  quizzes_taken INT NOT NULL DEFAULT 0,
  total_score NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(org_id, username)
);
ALTER TABLE enterprise_org_members ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE enterprise_org_members ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE enterprise_org_members ADD COLUMN IF NOT EXISTS last_login_at BIGINT;
CREATE INDEX IF NOT EXISTS idx_enterprise_org_members_org_id ON enterprise_org_members (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_members_email_lower ON enterprise_org_members (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_enterprise_org_members_role ON enterprise_org_members (org_id, role);

CREATE TABLE IF NOT EXISTS enterprise_org_quizzes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  quiz_type TEXT NOT NULL DEFAULT 'practice',
  category TEXT NOT NULL DEFAULT 'General',
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  question_count INT NOT NULL DEFAULT 0,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL
);
ALTER TABLE enterprise_org_quizzes ADD COLUMN IF NOT EXISTS quiz_type TEXT NOT NULL DEFAULT 'practice';
CREATE INDEX IF NOT EXISTS idx_enterprise_org_quizzes_org_id ON enterprise_org_quizzes (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_quizzes_visibility ON enterprise_org_quizzes (org_id, published, archived);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_quizzes_created_at ON enterprise_org_quizzes (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_org_attempts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  username TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  time_seconds NUMERIC NOT NULL DEFAULT 0,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_attempts_org_id ON enterprise_org_attempts (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_attempts_quiz_id ON enterprise_org_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_attempts_member_id ON enterprise_org_attempts (member_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_attempts_created_at ON enterprise_org_attempts (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_org_integrity_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  member_id TEXT,
  member_name TEXT,
  username TEXT,
  quiz_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_integrity_org_id ON enterprise_org_integrity_events (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_integrity_created_at ON enterprise_org_integrity_events (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_org_audit_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  actor_member_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  detail TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_audit_org_id ON enterprise_org_audit_events (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_audit_created_at ON enterprise_org_audit_events (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_org_notifications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_notifications_org_id ON enterprise_org_notifications (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_org_notifications_created_at ON enterprise_org_notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  org_name TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date BIGINT NOT NULL,
  end_date BIGINT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  auto_renew BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_enterprise_subscriptions_org_id ON enterprise_subscriptions (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_subscriptions_status ON enterprise_subscriptions (status);

CREATE TABLE IF NOT EXISTS enterprise_api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  org_id TEXT,
  org_name TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  rate_limit INT NOT NULL DEFAULT 100,
  requests_today INT NOT NULL DEFAULT 0,
  requests_month INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at BIGINT NOT NULL,
  last_used_at BIGINT,
  expires_at BIGINT,
  usage_day TEXT,
  usage_month TEXT
);
CREATE INDEX IF NOT EXISTS idx_enterprise_api_keys_org_id ON enterprise_api_keys (org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_api_keys_active ON enterprise_api_keys (active);
CREATE INDEX IF NOT EXISTS idx_enterprise_api_keys_created_at ON enterprise_api_keys (created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  secret_hash TEXT NOT NULL,
  secret_prefix TEXT NOT NULL,
  failure_count INT NOT NULL DEFAULT 0,
  last_triggered_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_enterprise_webhooks_active ON enterprise_webhooks (active);

-- Optional snapshot table for enterprise state (orgs/members/quizzes/api keys) in addition to settings.data.enterpriseState
CREATE TABLE IF NOT EXISTS enterprise_state_store (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT 0
);
