# ⛳ Golf Charity Subscription Platform — Backend API

A production-ready Node.js/Express backend for the Golf Charity Subscription Platform. Built to spec against the Digital Heroes PRD.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (access + refresh tokens) |
| Payments | Stripe (subscriptions + webhooks) |
| File Storage | Supabase Storage |
| Email | Nodemailer (SMTP) |
| Scheduling | node-cron |
| Logging | Winston |
| Testing | Jest + Supertest |
| Deployment | Vercel |

---

## Project Structure

```
golf-charity-backend/
├── config/
│   ├── supabase.js          # Supabase service-role client
│   └── logger.js            # Winston logger
├── src/
│   ├── server.js            # Express app entry point
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── subscriptionController.js
│   │   ├── scoreController.js
│   │   ├── drawController.js
│   │   ├── charityController.js
│   │   ├── winnerController.js
│   │   ├── userController.js
│   │   └── analyticsController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── subscriptionRoutes.js
│   │   ├── scoreRoutes.js
│   │   ├── drawRoutes.js
│   │   ├── charityRoutes.js
│   │   ├── winnerRoutes.js
│   │   ├── userRoutes.js
│   │   └── analyticsRoutes.js
│   ├── middleware/
│   │   ├── auth.js           # JWT guard + role guard + subscription check
│   │   └── errorHandler.js   # Centralised error handler + AppError class
│   ├── services/
│   │   ├── drawEngine.js     # Random + algorithmic draw logic
│   │   ├── cronJobs.js       # Monthly draw + analytics cron
│   │   └── emailService.js   # Nodemailer HTML emails
│   └── utils/
│       └── seed.js           # DB seed script
├── tests/
│   └── api.test.js           # Jest integration + unit tests
├── supabase_schema.sql        # Full database schema (run in Supabase)
├── .env.example               # Environment variable template
├── vercel.json                # Vercel deployment config
└── package.json
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd golf-charity-backend
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full contents of `supabase_schema.sql`
3. In **Storage**, create a bucket named `winner-proofs` (set to public)
4. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into `.env`

### 4. Set up Stripe

1. Create a new Stripe account (or use test mode)
2. Create two products: **Monthly Plan** and **Yearly Plan**
3. Copy the **Price IDs** into `.env` as `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_YEARLY_PRICE_ID`
4. Set up a webhook endpoint pointing to `/api/subscriptions/webhook`
5. Subscribe to: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`

### 5. Seed the database

```bash
npm run seed
```

This creates:
- Admin user: `admin@golfcharity.com` / `Admin@1234!`
- Test subscriber: `subscriber@test.com` / `Subscriber@1234!`
- 5 sample charities
- An upcoming draw

### 6. Run the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Create account |
| POST | `/login` | — | Login, get tokens |
| POST | `/refresh` | — | Refresh access token |
| POST | `/logout` | ✅ | Invalidate refresh token |
| GET | `/verify-email/:token` | — | Verify email address |
| POST | `/forgot-password` | — | Send reset link |
| POST | `/reset-password` | — | Set new password |
| GET | `/me` | ✅ | Get current user + subscription |

### Subscriptions — `/api/subscriptions`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/checkout` | ✅ | Create Stripe Checkout session |
| GET | `/my` | ✅ | Get active subscription |
| POST | `/cancel` | ✅ | Cancel subscription (end of period) |
| PATCH | `/charity` | ✅ | Update charity + percentage |
| GET | `/payments` | ✅ | Payment history |
| POST | `/webhook` | — | Stripe webhook handler |
| GET | `/admin` | 🔐 | List all subscriptions |

### Golf Scores — `/api/scores`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/my` | ✅ | Get user's 5 scores |
| POST | `/my` | ✅ | Add score (rolling 5 enforced) |
| PATCH | `/my/:id` | ✅ | Edit score |
| DELETE | `/my/:id` | ✅ | Delete score |
| GET | `/user/:userId` | 🔐 | Admin: view user's scores |
| PATCH | `/admin/:id` | 🔐 | Admin: edit any score |
| GET | `/frequency` | 🔐 | Score frequency map (draw algo) |

### Draws — `/api/draws`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | List published draws |
| GET | `/:id` | — | Get draw detail |
| GET | `/my-history` | ✅ | User's draw entry history |
| GET | `/admin/all` | 🔐 | Admin: all draws |
| POST | `/admin` | 🔐 | Create draw |
| PATCH | `/admin/:id` | 🔐 | Update draw settings |
| POST | `/admin/:id/simulate` | 🔐 | Run simulation (no publish) |
| POST | `/admin/:id/publish` | 🔐 | Run & publish draw |
| DELETE | `/admin/:id` | 🔐 | Cancel draw |

### Charities — `/api/charities`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | List charities (search/filter) |
| GET | `/:slug` | — | Charity profile + events |
| POST | `/donate` | ✅ | Independent donation |
| GET | `/admin/stats` | 🔐 | Contribution totals |
| POST | `/admin` | 🔐 | Create charity |
| PATCH | `/admin/:id` | 🔐 | Update charity |
| DELETE | `/admin/:id` | 🔐 | Soft-delete charity |
| POST | `/admin/:charity_id/events` | 🔐 | Add charity event |

### Winners — `/api/winners`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/my` | ✅ | User's winnings + totals |
| POST | `/my/:id/proof` | ✅ | Upload winner proof (multipart) |
| GET | `/admin` | 🔐 | All winners (filterable) |
| POST | `/admin/:id/verify` | 🔐 | Approve / reject proof |
| POST | `/admin/:id/pay` | 🔐 | Mark prize as paid |

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | ✅ | Full dashboard data |
| PATCH | `/profile` | ✅ | Update profile |
| POST | `/change-password` | ✅ | Change password |
| GET | `/notifications` | ✅ | Notifications list |
| PATCH | `/notifications/:id/read` | ✅ | Mark read |
| POST | `/notifications/read-all` | ✅ | Mark all read |
| GET | `/admin` | 🔐 | List all users |
| GET | `/admin/:id` | 🔐 | User detail (with scores, sub, wins) |
| PATCH | `/admin/:id` | 🔐 | Update user |

### Analytics — `/api/analytics` (Admin only 🔐)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/overview` | KPI summary |
| GET | `/monthly` | Monthly snapshots |
| GET | `/draws` | Draw statistics |
| GET | `/subscriptions` | Plan breakdown |

---

## Draw Engine

Two modes selectable per draw:

### Random
Standard lottery — 5 unique numbers (1–45) drawn via cryptographically seeded Math.random.

### Algorithmic (Weighted)
Numbers are weighted **against** the most frequently occurring user scores. This means users who enter less common scores are statistically advantaged — driving score diversity and engagement.

### Prize Pool Distribution

| Tier | Pool Share | Rollover |
|------|-----------|---------|
| 5-Number Match (Jackpot) | 40% | ✅ Yes |
| 4-Number Match | 35% | ❌ No |
| 3-Number Match | 25% | ❌ No |

- Multiple winners in the same tier share the prize equally
- Unclaimed jackpots roll over to the next month

### Monthly Cron
The draw is auto-executed on the 1st of each month at 10:00 AM UTC (configurable via `DRAW_CRON_SCHEDULE`).

---

## Score System

- Users can hold a **maximum of 5 scores** at any time
- Scores must be in **Stableford format**: range 1–45
- When a 6th score is added, the **oldest score is automatically deleted** (enforced at DB level via trigger)
- Scores are returned in **reverse chronological order**

---

## Deployment (Vercel + Supabase)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (new account as per PRD requirement)
vercel --prod

# Set env vars in Vercel dashboard or via CLI:
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... (add all vars from .env.example)
```

---

## Testing

```bash
npm test
```

Test coverage includes:
- Health check
- Auth validation (register, login)
- Score range enforcement (1–45)
- Draw access control (public vs admin)
- Charity list endpoint
- Prize pool calculation logic
- 404 handler

---

## Key Design Decisions

1. **Rolling 5-score rule is enforced at DB level** via a PostgreSQL trigger — not just in application code. This prevents bypassing via direct DB writes.

2. **Stripe webhook is mounted before JSON middleware** so the raw body is available for signature verification.

3. **Refresh token rotation** — each refresh invalidates the old token, preventing replay attacks.

4. **Soft delete for charities** — deactivating a charity preserves historical contribution data.

5. **Draw simulation mode** — admins can preview results without publishing, preventing irreversible mistakes.

6. **Jackpot rollover is explicit** — the rolled-over amount is stored on the next draw record, making prize pool calculations auditable.

---

*Built for Digital Heroes Full-Stack Development Trainee Selection Process*
