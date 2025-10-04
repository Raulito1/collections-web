# Collections Web (React + Vite)

- Auth: Supabase (Google)
- Data: RTK Query → FastAPI
- Grid: AG Grid Community
- Deploy: Vercel

## Setup
1) `cp .env.example .env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (FastAPI URL)
2) `npm i`
3) `npm run dev` then open http://localhost:5173

## Sign-in
- On `/login`, click **Continue with Google**.
- On `/`:
  - **Connect QuickBooks** → opens Intuit OAuth (via API)
  - **Sync QuickBooks** → fetches invoices → grid