# Supabase setup

1. Create a project at supabase.com.
2. Run the migrations in order (SQL editor, or `supabase db push` with the CLI): `0001`, `0002`, `0003`, `0004`.
3. Authentication → Providers → Email: **enable "Confirm email"**; Authentication → Sign In: **disable new user signups**.
   (Student accounts are claimed by matching the invited email, so signups must stay closed.)
4. Authentication → URL Configuration: set Site URL and add `http://localhost:5173/reset-password` to redirect URLs.
5. Create the first teacher: Authentication → Users → Add user (email + password, auto-confirm).
   Sign in once; the app shows a one-time "Set up your coaching space" screen that creates the organisation.
6. `cp .env.example .env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
7. Student invites (Phase 2 UI): `supabase functions deploy invite-student` and set secret `SITE_URL`.
   The service-role key is provided to functions by Supabase and must never be put in the frontend.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run typecheck && npm run build
```
