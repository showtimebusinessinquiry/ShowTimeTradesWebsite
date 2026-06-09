# ShowTime Trading Journal (SHTJ)

Professional-grade trading journal for active retail traders. Track your trades, analyze performance metrics, manage your portfolio, and maintain a watchlist — all in one dark-themed, terminal-aesthetic web app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (custom SHTJ palette) |
| Backend / Auth / DB | Supabase (PostgreSQL + Row Level Security) |
| Charts | Recharts |
| Unit Tests | Vitest + Testing Library |
| E2E Tests | Playwright |
| Deployment | Vercel |

---

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)
- (Optional) Vercel CLI for deployment

---

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "My First Website/app"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the `app/` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in your Supabase project dashboard under **Settings > API**.

### 4. Run Supabase migrations

From the `app/` directory:

```bash
# Using Supabase CLI
supabase db push

# Or apply migrations manually in the Supabase SQL editor:
# Copy and run the files from supabase/migrations/ in order
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be redirected to the login page.

---

## Deploy to Vercel

### Option A: Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Set the root directory to `app/` if your repo includes other folders
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run with interactive UI
npm run test:ui
```

Unit tests live in `src/` alongside source files, or in `src/__tests__/`.

### E2E Tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui
```

E2E tests live in `tests/e2e/`.

---

## Directory Structure

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── signup/page.tsx      # Signup page
│   │   ├── (app)/
│   │   │   ├── layout.tsx           # Protected app shell (sidebar + topbar)
│   │   │   ├── dashboard/page.tsx   # Dashboard with metrics + charts
│   │   │   ├── log/page.tsx         # Trade log (CRUD table)
│   │   │   ├── portfolio/page.tsx   # Portfolio positions
│   │   │   └── watchlist/page.tsx   # Watchlist
│   │   ├── globals.css              # Global styles + SHTJ design tokens
│   │   ├── layout.tsx               # Root layout with AuthProvider
│   │   └── page.tsx                 # Root redirect → /login
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── MetricCard.tsx
│   │       ├── Modal.tsx
│   │       └── PageHeader.tsx
│   ├── lib/
│   │   ├── auth-context.tsx         # Auth context + useAuth hook
│   │   └── supabase.ts              # Typed Supabase client
│   ├── test/
│   │   └── setup.ts                 # Vitest + Testing Library setup
│   ├── types/
│   │   └── database.ts              # TypeScript types from Supabase schema
│   └── utils/
│       └── calculations.ts          # Pure calculation functions (unit-tested)
├── supabase/
│   └── migrations/                  # SQL migrations
├── tests/
│   └── e2e/                         # Playwright E2E tests
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## Key Calculation Functions

All pure functions live in `src/utils/calculations.ts` and are independently unit-testable:

| Function | Description |
|---|---|
| `calcWinRate(trades)` | Win rate as decimal (0–1) |
| `calcAvgGain(trades)` | Average gain on winning trades |
| `calcAvgLoss(trades)` | Average loss on losing trades (negative) |
| `calcExpectancy(trades)` | Expected value per trade |
| `calcMaxDrawdown(trades)` | Largest peak-to-trough decline (negative) |
| `calcProfitFactor(trades)` | Gross profit / gross loss |
| `calcTotalPnl(trades)` | Sum of all P&L |
| `calcUnrealizedPnl(entry, current, qty)` | Position unrealized P&L |
| `calcUnrealizedPnlPct(entry, current)` | Position unrealized P&L % |
| `calcCostBasis(entry, qty)` | Position cost basis |
| `calcCurrentValue(current, qty)` | Position current market value |
| `calcAllocationPct(posValue, totalValue)` | Position allocation % |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Your Supabase anon (public) key |
# ShowTimeTradesWebsite
# ShowTimeTradesWebsite
