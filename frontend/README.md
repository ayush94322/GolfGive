# GolfGive — Frontend

React + Vite frontend for the Golf Charity Subscription Platform.

## Tech Stack

- **React 18** + **React Router 6**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Zustand** (auth state management)
- **Axios** (API client with JWT refresh interceptor)
- **react-hot-toast** (notifications)
- **Recharts** (admin analytics charts)
- **Lucide React** (icons)
- **Fonts**: Syne (display) + DM Sans (body)

## Setup

```bash
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend URL

npm install
npm run dev
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, how it works, prizes, charity showcase |
| `/charities` | Charity directory with search |
| `/charities/:slug` | Charity detail + donate |
| `/draws` | Public draw list |
| `/draws/:id` | Draw detail + winning numbers |
| `/login` | Sign in |
| `/register` | Create account |
| `/forgot-password` | Password reset request |
| `/subscribe` | Choose plan + charity → Stripe checkout |
| `/dashboard` | User dashboard (scores, charity, winnings, subscription) |
| `/admin` | Full admin panel (users, draws, charities, winners, analytics) |

## API Endpoints Used

All endpoints are consumed from `/api/*` and connect to your Express backend:

- `POST /api/auth/register` — `POST /api/auth/login` — `GET /api/auth/me`
- `GET /api/users/dashboard` — `PATCH /api/users/profile`
- `GET/POST/PATCH/DELETE /api/scores/my`
- `POST /api/subscriptions/checkout` — `GET /api/subscriptions/my`
- `GET /api/draws` — `GET /api/draws/:id`
- `GET /api/charities` — `GET /api/charities/:slug`
- `GET /api/winners/my` — `POST /api/winners/my/:id/proof`
- Admin: `GET /api/analytics/overview`, draw/charity/winner management

## Deploy to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Set `VITE_API_URL` environment variable to your backend URL
4. Deploy

## Design

- **Palette**: Deep forest green, brand green (#22c55e), gold accents
- **Typography**: Syne (headings), DM Sans (body)
- **Theme**: Emotion-first, charitable impact — deliberately avoids traditional golf aesthetics
- **Motion**: Subtle CSS animations, float effects on draw numbers
