# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

ProntoJá is a Brazilian home services marketplace built with **Next.js 15** (App Router), **React 19**, **TypeScript**, **Tailwind CSS**, **Supabase** (auth/DB/storage), and **Stripe** (payments/Connect). The app is located in `/workspace/prontoja-app/`.

### Running the Application

- **Dev server:** `npm run dev` from `prontoja-app/`
- **Lint:** `npm run lint` from `prontoja-app/`
- **Build:** `npm run build` from `prontoja-app/` (see caveat below)

### Key Caveats

- The `stripe` server SDK is imported in API routes (`src/app/api/stripe/`) but was **not originally listed** in `package.json`. It must be installed separately: `npm install stripe` (already added to `package.json` by initial setup).
- An `.eslintrc.json` file is required for `npm run lint` to work non-interactively. Without it, Next.js ESLint prompts for interactive configuration. The file should contain: `{ "extends": "next/core-web-vitals" }`.
- **Build fails** due to a pre-existing ESLint error in `src/components/reviews/ReviewForm.tsx` (React Hook `useState` called inside a callback). This does not affect the dev server (`npm run dev`).
- There are **no automated tests** (no test framework, no test files) in this codebase.
- **External services**: Supabase and Stripe are cloud-hosted SaaS. The Supabase public URL and anon key from `.env.example` work for local development. Stripe keys require real credentials from the Stripe Dashboard for payment flows.
- A `.env.local` file is needed for local development (copy values from `.env.example` and set `NEXT_PUBLIC_APP_URL=http://localhost:3000`).

### Environment Variables

Required secrets for full functionality (set as environment secrets or in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from `.env.example`
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — from Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` / `STRIPE_CONNECT_WEBHOOK_SECRET` — from Stripe CLI or Dashboard
