-- ═══════════════════════════════════════════════════════════════════
-- Golf Charity Subscription Platform — Supabase SQL Schema
-- Run this in your Supabase SQL Editor to initialize the database
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'lapsed', 'trialing');
CREATE TYPE draw_status AS ENUM ('scheduled', 'simulation', 'published', 'cancelled');
CREATE TYPE draw_logic AS ENUM ('random', 'algorithmic');
CREATE TYPE match_type AS ENUM ('five_match', 'four_match', 'three_match');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'rejected');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE user_role AS ENUM ('subscriber', 'admin');
CREATE TYPE notification_type AS ENUM ('draw_result', 'winner_alert', 'subscription_renewal', 'system');

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT,
  avatar_url            TEXT,
  role                  user_role NOT NULL DEFAULT 'subscriber',
  is_email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token    TEXT,
  password_reset_token  TEXT,
  password_reset_expires TIMESTAMPTZ,
  refresh_token         TEXT,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─────────────────────────────────────────
-- CHARITIES
-- ─────────────────────────────────────────

CREATE TABLE charities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT NOT NULL,
  short_bio       TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  website_url     TEXT,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  total_received  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_charities_slug ON charities(slug);
CREATE INDEX idx_charities_featured ON charities(is_featured);
CREATE INDEX idx_charities_active ON charities(is_active);

-- ─────────────────────────────────────────
-- CHARITY EVENTS
-- ─────────────────────────────────────────

CREATE TABLE charity_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  charity_id    UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  event_date    DATE NOT NULL,
  location      TEXT,
  image_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_charity_events_charity ON charity_events(charity_id);
CREATE INDEX idx_charity_events_date ON charity_events(event_date);

-- ─────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────

CREATE TABLE subscriptions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                      subscription_plan NOT NULL,
  status                    subscription_status NOT NULL DEFAULT 'inactive',
  stripe_customer_id        TEXT,
  stripe_subscription_id    TEXT UNIQUE,
  stripe_price_id           TEXT,
  amount_paid               NUMERIC(10,2) NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'gbp',
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  charity_id                UUID REFERENCES charities(id) ON DELETE SET NULL,
  charity_percentage        NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ─────────────────────────────────────────
-- PAYMENT HISTORY
-- ─────────────────────────────────────────

CREATE TABLE payment_history (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id       UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id     TEXT,
  stripe_payment_intent TEXT,
  amount                NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'gbp',
  status                TEXT NOT NULL,
  prize_pool_contribution NUMERIC(10,2),
  charity_contribution    NUMERIC(10,2),
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_history_user ON payment_history(user_id);
CREATE INDEX idx_payment_history_sub ON payment_history(subscription_id);

-- ─────────────────────────────────────────
-- GOLF SCORES
-- ─────────────────────────────────────────

CREATE TABLE golf_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score           SMALLINT NOT NULL CHECK (score >= 1 AND score <= 45),
  played_at       DATE NOT NULL,
  course_name     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_golf_scores_user ON golf_scores(user_id);
CREATE INDEX idx_golf_scores_played_at ON golf_scores(user_id, played_at DESC);

-- ─────────────────────────────────────────
-- DRAWS
-- ─────────────────────────────────────────

CREATE TABLE draws (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,
  draw_month            DATE NOT NULL,                   -- first day of the draw month
  logic                 draw_logic NOT NULL DEFAULT 'random',
  status                draw_status NOT NULL DEFAULT 'scheduled',
  winning_numbers       SMALLINT[5],                     -- the 5 drawn numbers
  total_prize_pool      NUMERIC(12,2),
  jackpot_pool          NUMERIC(12,2),
  four_match_pool       NUMERIC(12,2),
  three_match_pool      NUMERIC(12,2),
  jackpot_rolled_over   BOOLEAN NOT NULL DEFAULT FALSE,
  rolled_over_amount    NUMERIC(12,2) DEFAULT 0,
  eligible_entries      INTEGER,
  published_at          TIMESTAMPTZ,
  simulated_at          TIMESTAMPTZ,
  notes                 TEXT,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_draws_month ON draws(draw_month) WHERE status != 'cancelled';
CREATE INDEX idx_draws_status ON draws(status);

-- ─────────────────────────────────────────
-- DRAW ENTRIES  (snapshot of user scores at draw time)
-- ─────────────────────────────────────────

CREATE TABLE draw_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id         UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  scores          SMALLINT[] NOT NULL,                  -- snapshot of the user's 5 scores
  matched_count   SMALLINT DEFAULT 0,
  match_type      match_type,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_draw_entries_unique ON draw_entries(draw_id, user_id);
CREATE INDEX idx_draw_entries_draw ON draw_entries(draw_id);
CREATE INDEX idx_draw_entries_user ON draw_entries(user_id);
CREATE INDEX idx_draw_entries_match ON draw_entries(draw_id, match_type);

-- ─────────────────────────────────────────
-- WINNERS
-- ─────────────────────────────────────────

CREATE TABLE winners (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id               UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  draw_entry_id         UUID NOT NULL REFERENCES draw_entries(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_type            match_type NOT NULL,
  prize_amount          NUMERIC(10,2) NOT NULL,
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  proof_url             TEXT,
  proof_uploaded_at     TIMESTAMPTZ,
  admin_notes           TEXT,
  reviewed_by           UUID REFERENCES users(id),
  reviewed_at           TIMESTAMPTZ,
  payment_status        payment_status NOT NULL DEFAULT 'pending',
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_winners_draw ON winners(draw_id);
CREATE INDEX idx_winners_user ON winners(user_id);
CREATE INDEX idx_winners_payment ON winners(payment_status);
CREATE INDEX idx_winners_verification ON winners(verification_status);

-- ─────────────────────────────────────────
-- CHARITY CONTRIBUTIONS  (per payment)
-- ─────────────────────────────────────────

CREATE TABLE charity_contributions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charity_id      UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  payment_id      UUID REFERENCES payment_history(id),
  amount          NUMERIC(10,2) NOT NULL,
  is_independent  BOOLEAN NOT NULL DEFAULT FALSE,       -- true = standalone donation
  stripe_payment_intent TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_charity_contributions_user ON charity_contributions(user_id);
CREATE INDEX idx_charity_contributions_charity ON charity_contributions(charity_id);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ─────────────────────────────────────────
-- ANALYTICS SNAPSHOTS  (monthly)
-- ─────────────────────────────────────────

CREATE TABLE analytics_snapshots (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_month            DATE NOT NULL UNIQUE,
  total_users               INTEGER NOT NULL DEFAULT 0,
  active_subscribers        INTEGER NOT NULL DEFAULT 0,
  new_subscribers           INTEGER NOT NULL DEFAULT 0,
  churned_subscribers       INTEGER NOT NULL DEFAULT 0,
  total_revenue             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_prize_pool          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_charity_contributed NUMERIC(12,2) NOT NULL DEFAULT 0,
  draws_run                 INTEGER NOT NULL DEFAULT 0,
  winners_count             INTEGER NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ROW-LEVEL SECURITY (RLS) — Enable via Supabase dashboard
-- These policies mirror the API-level access control
-- ─────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_contributions ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own row
CREATE POLICY "users_own_row" ON users
  FOR ALL USING (auth.uid() = id);

-- Subscriptions: own rows only
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Scores: own rows only
CREATE POLICY "scores_own" ON golf_scores
  FOR ALL USING (auth.uid() = user_id);

-- Winners: own rows only
CREATE POLICY "winners_own" ON winners
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications: own rows only
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGER FUNCTION
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_golf_scores_updated BEFORE UPDATE ON golf_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_draws_updated BEFORE UPDATE ON draws
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_winners_updated BEFORE UPDATE ON winners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_charities_updated BEFORE UPDATE ON charities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────
-- FUNCTION: enforce max 5 scores per user
-- (oldest is deleted when a 6th is inserted)
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_max_five_scores()
RETURNS TRIGGER AS $$
DECLARE
  score_count INTEGER;
  oldest_id UUID;
BEGIN
  SELECT COUNT(*) INTO score_count FROM golf_scores WHERE user_id = NEW.user_id;
  IF score_count >= 5 THEN
    SELECT id INTO oldest_id
    FROM golf_scores
    WHERE user_id = NEW.user_id
    ORDER BY played_at ASC, created_at ASC
    LIMIT 1;
    DELETE FROM golf_scores WHERE id = oldest_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_five_scores
  BEFORE INSERT ON golf_scores
  FOR EACH ROW EXECUTE FUNCTION enforce_max_five_scores();

-- ─────────────────────────────────────────
-- FUNCTION: auto-update charity total_received
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_charity_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE charities
  SET total_received = total_received + NEW.amount
  WHERE id = NEW.charity_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_charity_contribution_total
  AFTER INSERT ON charity_contributions
  FOR EACH ROW EXECUTE FUNCTION update_charity_total();
