# Coaching Platform

A web app for a small online coaching business: a **teacher portal** (students, classes, attendance, assignments, resources, reports) and a **student portal** (classes, assignments, resources, progress). Built on React + Supabase with database-level security.

> Working title: **"My Coaching"**. The brand is a placeholder in `src/config/brand.ts` and `index.html`; change it in those two places.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Schema, RLS, storage policies, auth, role-based shells, teacher dashboard stats | Written, **not yet run or tested** |
| 2 | Students, classes, schedules, attendance, heatmap, reports | Planned |
| 3 | Assignments and submissions | Planned |
| 4 | Resource library | Planned |
| 5 | Student portal screens | Planned |
| 6 | RLS tests, audit, deployment | Planned |

Screens for later phases show a "Not built yet" placeholder.

## Tech stack

React 18, TypeScript (strict), Vite, Tailwind CSS, Lucide, React Router, TanStack Query, React Hook Form, Zod, Sonner. Backend: Supabase (Postgres, Auth, Storage, Row Level Security, Edge Functions).

## Getting started

1. Create a Supabase project and follow [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) (run the three migrations, disable public sign-ups, create the first teacher).
2. Configure the environment:
   ```bash
   cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev            # http://localhost:5173
   npm run typecheck
   npm run build
   ```

Never put the `service_role` key in the frontend or in any `VITE_` variable.

## Project layout

```
supabase/migrations/     0001 schema, 0002 security + functions, 0003 storage
supabase/functions/      invite-student (server-side, uses service role)
src/app/                 routes
src/components/          ui primitives, layout shell
src/features/            per-feature hooks and data access
src/pages/               route-level screens
docs/                    architecture and setup guides
```

## Design notes

- Security is enforced by RLS; route guards are only for UX.
- Attendance is tied to real class sessions. The heatmap counts conducted sessions only, and attendance percentages are calculated per enrollment window.
- Historical records are never deleted: students and classes are deactivated, not removed.
- Details and open decisions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
