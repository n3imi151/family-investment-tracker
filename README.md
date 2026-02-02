# Family Investment Portfolio Tracker

A web application for tracking shared family investments where multiple members contribute to a joint stock account. Tracks ownership percentages based on contributions at time of purchase.

## Features

- **Member Management**: Add and manage family members with admin/member roles
- **Contribution Tracking**: Record contributions from each family member
- **Stock Portfolio**: Track stocks with real-time price updates from Yahoo Finance
- **Transaction Management**: Record buy/sell transactions with per-member allocations
- **Ownership Calculations**: Automatic ownership percentages based on contribution ratios
- **Dashboard**: Portfolio summary with per-member breakdowns
- **Reports**: Yearly summaries with CSV export

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Stock API**: Yahoo Finance (via yahoo-finance2)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### 1. Clone and Install

```bash
cd family-investment-tracker
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Run the migration file: Copy contents of `supabase/migrations/001_initial_schema.sql` and execute it

### 3. Configure Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials (found in Project Settings > API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 4. Create First Admin User

1. In Supabase, go to Authentication > Users
2. Click "Add user" and create a user with email/password
3. In SQL Editor, link the user to a family member:

```sql
INSERT INTO family_members (user_id, name, email, is_admin)
VALUES (
  'USER_ID_FROM_AUTH', -- Replace with the auth user's ID
  'Your Name',
  'your@email.com',
  true
);
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Admin Functions

Admins can:
- Add/edit/delete family members
- Add contributions for any member
- Create buy/sell transactions
- Allocate transactions to members

### Member Functions

Members can:
- View the dashboard and portfolio
- View their own contributions and ownership
- View transaction history
- View reports

### Recording Transactions

1. **Buy Transaction**:
   - Select the stock (or add a new one)
   - Enter quantity and price per share
   - Allocate the purchase from each member's available cash
   - Each member's ownership is proportional to their allocation

2. **Sell Transaction**:
   - Select the stock to sell
   - Enter quantity and price per share
   - Proceeds are automatically distributed by ownership percentage

### How Ownership Works

1. Members contribute cash to the pool
2. When buying stocks, you specify how much of each member's cash to use
3. Each member's ownership percentage = their allocation / total transaction
4. When selling, proceeds are distributed proportionally to ownership

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect the repo to Vercel
3. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Project Structure

```
/app
  /api              # API routes
  /(protected)      # Protected pages (require auth)
    /dashboard      # Main dashboard
    /members        # Member management
    /contributions  # Contribution tracking
    /stocks         # Stock portfolio
    /transactions   # Transaction history
    /reports        # Reports and exports
  /login            # Login page
/components
  /ui               # UI components (shadcn)
/lib
  /supabase         # Supabase clients
  /calculations.ts  # Ownership calculations
  /stocks-api.ts    # Stock price fetching
  /utils.ts         # Utility functions
/types              # TypeScript types
/supabase
  /migrations       # Database migrations
```

## License

MIT
