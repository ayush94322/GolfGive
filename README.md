# Golf Charity Subscription Platform

A full-stack web application that combines golf score tracking with charitable giving and monthly prize draws. Subscribers enter their Stableford scores, support a charity of their choice, and compete in monthly draws for cash prizes — all within a single, seamless platform.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Stripe Setup](#stripe-setup)
  - [Seeding the Database](#seeding-the-database)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Core Features](#core-features)
  - [Draw Engine](#draw-engine)
  - [Score System](#score-system)
  - [Charity & Subscription Model](#charity--subscription-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Architecture & Design Decisions](#architecture--design-decisions)

---

## Overview

The Golf Charity Subscription Platform is built for golf enthusiasts who want to compete, give back, and win. Key capabilities include:

- **Monthly prize draws** with random or algorithmically weighted number selection
- **Stableford score tracking** with a rolling 5-score system enforced at the database level
- **Charity allocation** — subscribers direct a percentage of their subscription to a charity of their choice
- **Admin dashboard** for managing users, draws, charities, subscriptions, and analytics
- **Winner management** with proof-of-win upload and admin verification workflows
- **Automated scheduling** via cron jobs for monthly draws and analytics snapshots

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | JWT (access + refresh token rotation) |
| Payments | Stripe (subscriptions + webhooks) |
| File Storage | Supabase Storage |
| Email | Nodemailer (SMTP) |
| Scheduling | node-cron |
| Logging | Winston |
| Testing | Jest + Supertest |
| Deployment | Vercel |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router DOM v6 |
| State Management | Zustand |
| HTTP Client | Axios |
| Forms | React Hook Form |
| Charts | Recharts |
| Notifications | React Hot Toast |
| Icons | Lucide React |

---

## Project Structure

```
golf-charity-platform/
├── backend/
│   ├── config/
│   │   ├── supabase.js              # Supabase service-role client
│   │   └── logger.js                # Winston logger configuration
│   ├── src/
│   │   ├── server.js                # Express app entry point
│   │   ├── controllers/
│   │   │   ├── analyticsController.js
│   │   │   ├── authController.js
│   │   │   ├── charityController.js
│   │   │   ├── drawController.js
│   │   │   ├── scoreController.js
│   │   │   ├── subscriptionController.js
│   │   │   ├── userController.js
│   │   │   └── winnerController.js
│   │   ├── routes/
│   │   │   ├── analyticsRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── charityRoutes.js
│   │   │   ├── drawRoutes.js
│   │   │   ├── scoreRoutes.js
│   │   │   ├── subscriptionRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   └── winnerRoutes.js
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT guard, role guard, subscription check
│   │   │   └── errorHandler.js      # Centralised error handler + AppError class
│   │   ├── services/
│   │   │   ├── cronJobs.js          # Monthly draw + analytics cron
│   │   │   ├── drawEngine.js        # Random & weighted draw logic
│   │   │   └── emailService.js      # Nodemailer HTML email service
│   │   └── utils/
│   │       └── seed.js              # Database seed script
│   ├── tests/
│   │   └── api.test.js              # Jest integration & unit tests
│   ├── supabase_schema.sql          # Full database schema
│   ├── vercel.json                  # Vercel deployment configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Footer.jsx
    │   │   │   └── Navbar.jsx
    │   │   └── ui/
    │   │       └── index.jsx        # Shared UI components
    │   ├── lib/
    │   │   ├── api.js               # Axios instance + interceptors
    │   │   ├── authStore.js         # Zustand auth state
    │   │   └── utils.js             # Utility helpers
    │   └── pages/
    │       ├── Admin.jsx
    │       ├── Charities.jsx
    │       ├── Dashboard.jsx
    │       ├── Draws.jsx
    │       ├── ForgotPassword.jsx
    │       ├── Home.jsx
    │       ├── Login.jsx
    │       ├── NotFound.jsx
    │       ├── Register.jsx
    │       └── Subscribe.jsx
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (test mode supported)
- An SMTP email provider (e.g. Gmail, SendGrid, Mailgun)

---

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd golf-charity-platform

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Environment Variables

Create a `.env` file in the `backend/` directory. Use the provided `.env.example` as a reference.

```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@golfcharity.com

# Cron
DRAW_CRON_SCHEDULE=0 10 1 * *

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

---

### Database Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** and execute the full contents of `backend/supabase_schema.sql`
3. In **Storage**, create a public bucket named `winner-proofs`
4. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into your `.env`

---

### Stripe Setup

1. Create or log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Create two subscription products: **Monthly Plan** and **Yearly Plan**
3. Copy both **Price IDs** into `.env` as `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_YEARLY_PRICE_ID`
4. Register a webhook endpoint pointing to `POST /api/subscriptions/webhook`
5. Subscribe to the following events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
6. Copy the **Webhook Signing Secret** into `.env` as `STRIPE_WEBHOOK_SECRET`

---

### Seeding the Database

```bash
cd backend
npm run seed
```

This populates the database with:

| Entity | Details |
|---|---|
| Admin user | `admin@golfcharity.com` / `Admin@1234!` |
| Test subscriber | `subscriber@test.com` / `Subscriber@1234!` |
| Charities | 5 sample charity records |
| Draw | 1 upcoming draw |

---

### Running the Application

**Backend**

```bash
cd backend

# Development (auto-reload via nodemon)
npm run dev

# Production
npm start
```

**Frontend**

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:5173` by default.

---

## API Reference

All authenticated routes require a `Bearer` token in the `Authorization` header. Admin-only routes additionally require the `admin` role.

**Legend:** ✅ Authenticated user &nbsp;|&nbsp; 🔐 Admin only &nbsp;|&nbsp; — Public

---

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | — | Create a new account |
| POST | `/login` | — | Authenticate and receive tokens |
| POST | `/refresh` | — | Rotate refresh token |
| POST | `/logout` | ✅ | Invalidate refresh token |
| GET | `/verify-email/:token` | — | Confirm email address |
| POST | `/forgot-password` | — | Send password reset link |
| POST | `/reset-password` | — | Set a new password |
| GET | `/me` | ✅ | Retrieve current user and subscription |

---

### Subscriptions — `/api/subscriptions`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/checkout` | ✅ | Create Stripe Checkout session |
| GET | `/my` | ✅ | Retrieve active subscription |
| POST | `/cancel` | ✅ | Cancel at end of billing period |
| PATCH | `/charity` | ✅ | Update charity allocation and percentage |
| GET | `/payments` | ✅ | Payment history |
| POST | `/webhook` | — | Stripe webhook handler |
| GET | `/admin` | 🔐 | List all subscriptions |

---

### Golf Scores — `/api/scores`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/my` | ✅ | Retrieve user's scores (up to 5) |
| POST | `/my` | ✅ | Submit a new score |
| PATCH | `/my/:id` | ✅ | Update a score |
| DELETE | `/my/:id` | ✅ | Remove a score |
| GET | `/user/:userId` | 🔐 | View a specific user's scores |
| PATCH | `/admin/:id` | 🔐 | Edit any user's score |
| GET | `/frequency` | 🔐 | Score frequency distribution for draw algorithm |

---

### Draws — `/api/draws`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | — | List all published draws |
| GET | `/:id` | — | Get draw details |
| GET | `/my-history` | ✅ | Retrieve user's draw entry history |
| GET | `/admin/all` | 🔐 | List all draws including unpublished |
| POST | `/admin` | 🔐 | Create a new draw |
| PATCH | `/admin/:id` | 🔐 | Update draw settings |
| POST | `/admin/:id/simulate` | 🔐 | Simulate draw without publishing |
| POST | `/admin/:id/publish` | 🔐 | Execute and publish draw results |
| DELETE | `/admin/:id` | 🔐 | Cancel a draw |

---

### Charities — `/api/charities`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | — | List charities with search and filter |
| GET | `/:slug` | — | Charity profile and associated events |
| POST | `/donate` | ✅ | Submit an independent donation |
| GET | `/admin/stats` | 🔐 | Contribution totals per charity |
| POST | `/admin` | 🔐 | Create a charity |
| PATCH | `/admin/:id` | 🔐 | Update charity details |
| DELETE | `/admin/:id` | 🔐 | Soft-delete a charity |
| POST | `/admin/:charity_id/events` | 🔐 | Add a charity event |

---

### Winners — `/api/winners`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/my` | ✅ | User's winnings and total prize value |
| POST | `/my/:id/proof` | ✅ | Upload winner proof (multipart/form-data) |
| GET | `/admin` | 🔐 | List all winners with filters |
| POST | `/admin/:id/verify` | 🔐 | Approve or reject proof submission |
| POST | `/admin/:id/pay` | 🔐 | Mark prize as paid |

---

### Users — `/api/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/dashboard` | ✅ | Full user dashboard data |
| PATCH | `/profile` | ✅ | Update profile information |
| POST | `/change-password` | ✅ | Change account password |
| GET | `/notifications` | ✅ | Retrieve notifications |
| PATCH | `/notifications/:id/read` | ✅ | Mark notification as read |
| POST | `/notifications/read-all` | ✅ | Mark all notifications as read |
| GET | `/admin` | 🔐 | List all users |
| GET | `/admin/:id` | 🔐 | User detail with scores, subscription, and wins |
| PATCH | `/admin/:id` | 🔐 | Update a user's details |

---

### Analytics — `/api/analytics` (Admin only 🔐)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/overview` | KPI summary across all metrics |
| GET | `/monthly` | Month-by-month snapshot history |
| GET | `/draws` | Draw-specific statistics |
| GET | `/subscriptions` | Subscription plan breakdown |

---

## Core Features

### Draw Engine

Each draw can be configured to run in one of two modes:

**Random Mode**  
A standard lottery draw — five unique numbers between 1 and 45 are selected using a cryptographically seeded random function.

**Algorithmic Mode (Weighted)**  
Numbers are weighted *against* the most frequently occurring scores across all users. This statistically advantages subscribers who submit less common scores, encouraging score diversity and platform engagement.

**Prize Pool Distribution**

| Tier | Prize Share | Rollover |
|---|---|---|
| 5-Number Match (Jackpot) | 40% | ✅ Yes |
| 4-Number Match | 35% | ❌ No |
| 3-Number Match | 25% | ❌ No |

- Multiple winners within the same tier share the prize equally.
- Unclaimed jackpots carry forward to the following month's draw and are stored explicitly on the next draw record, keeping prize pool calculations fully auditable.

**Automated Scheduling**  
Draws are executed automatically on the 1st of each month at 10:00 AM UTC via `node-cron`. The schedule is configurable through the `DRAW_CRON_SCHEDULE` environment variable.

---

### Score System

- Users may hold a **maximum of 5 Stableford scores** at any given time.
- Valid score range is **1–45**.
- When a sixth score is submitted, the **oldest score is automatically removed** — this rule is enforced at the PostgreSQL level via a database trigger, preventing circumvention through direct database access.
- Scores are returned in **reverse chronological order**.

---

### Charity & Subscription Model

- Each subscriber selects a **charity** and specifies a **donation percentage** from their subscription fee.
- Subscribers may update their charity allocation at any time via `PATCH /api/subscriptions/charity`.
- Charities support **soft deletion** — deactivating a charity preserves all historical contribution and event data.
- Independent one-off donations can be submitted outside of the subscription model via `POST /api/charities/donate`.

---

## Testing

```bash
cd backend
npm test
```

Test coverage includes:

- Health check endpoint
- Auth validation (registration and login flows)
- Score range enforcement (1–45 boundary tests)
- Draw access control (public vs. admin-only endpoints)
- Charity listing endpoint
- Prize pool calculation logic
- 404 fallback handler

---

## Deployment

### Backend — Vercel

```bash
# Install the Vercel CLI
npm install -g vercel

# Deploy from the backend directory
cd backend
vercel --prod

# Set environment variables via CLI
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY
# ... (add all variables from .env.example)
```

The `vercel.json` configuration file is included in `backend/` and handles routing for the Express app.

### Frontend — Vercel / Static Host

```bash
cd frontend
npm run build
# Deploy the generated /dist directory to Vercel, Netlify, or any static host
```

Set the `VITE_API_URL` environment variable to your deployed backend URL before building.

---

## Architecture & Design Decisions

**1. Database-level score enforcement**  
The rolling 5-score rule is implemented as a PostgreSQL trigger in Supabase, not solely in application code. This ensures the constraint holds even in the event of a direct database write, providing a reliable second line of defence.

**2. Stripe webhook body handling**  
The Stripe webhook route is mounted *before* Express's JSON body parser middleware. This ensures the raw request body is preserved and available for Stripe's signature verification — a requirement for secure webhook processing.

**3. Refresh token rotation**  
Each use of a refresh token invalidates the previous one and issues a new token. This prevents replay attacks and limits the window of exposure if a token is ever compromised.

**4. Soft delete for charities**  
Charities are deactivated rather than permanently deleted. This preserves the referential integrity of historical contribution records and ensures financial data remains auditable over time.

**5. Draw simulation mode**  
Admins can run a full draw simulation and preview results before committing to publish. This prevents irreversible publishing mistakes and allows organisers to validate prize pool distributions ahead of time.

**6. Explicit jackpot rollover tracking**  
Rolled-over jackpot amounts are stored as a discrete field on the next draw record rather than being calculated dynamically. This makes prize pool history fully traceable and simplifies reconciliation.

---
