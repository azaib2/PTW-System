# Digital HSE PTW
### Permit to Work & Lifting Management System

Mobile-first construction-site HSE platform: Hot Work / Cold Work / Lifting
permits, full lifting package (Lifting Plan, Crane Checklist, Site
Preparation, Rigging Verification, Competency, Field Verification), approval
workflow, QR verification, PDF packages, Excel export, audit trail, and
configurable retention/archive.

## Status of this build

This repository is **Stage 1 (Foundation)** of the 8-stage plan below:
real Supabase Auth, real Postgres schema with full Row Level Security, real
dashboard querying live data, mobile-first layout with sticky bottom nav.
Feature routes beyond Stage 1 are wired into navigation but show
**"NOT IMPLEMENTED YET"** — nothing is faked or hardcoded. See
"Development Stages" below for what's next.

## 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account (you must create this —
  I cannot provision a database or hosting account on your behalf)
- A GitHub account (for repo + Cloudflare Pages deploy)

## 2. Create your Supabase project

1. supabase.com → New Project. Note your project's **URL** and **anon public key**
   (Project Settings → API).
2. In the SQL Editor, run the migration files **in order**:
   - `supabase/migrations/0001_core_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_functions_and_public_view.sql`
   - `supabase/migrations/0004_storage_and_retention.sql`
3. (Optional) Run `supabase/seed/demo_seed.sql` for demo contractors/project.
   Demo `users`/`permits` require creating matching Supabase Auth accounts
   first — see the comments in that file.

## 3. Create your first admin user

Supabase Dashboard → Authentication → Add User → set email/password.
Then in SQL Editor:

```sql
insert into users (id, full_name, email, role)
values ('<paste the auth user UUID here>', 'Your Name', 'you@example.com', 'administrator');
```

You can now log in as administrator.

## 4. Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

## 5. Deployment (Cloudflare Pages)

1. Push this repo to GitHub.
2. Cloudflare dashboard → Pages → Create project → Connect to Git.
3. Build command: `npm run build`  |  Output directory: `dist`
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   in Pages → Settings → Environment variables.
5. Deploy. (Netlify works the same way: build `npm run build`, publish `dist`.)

The anon key is safe to expose client-side — all real access control is
enforced by Postgres Row Level Security, not by hiding the key.

## 6. Retention sweep (scheduled job)

`apply_retention_policy()` and `refresh_permit_health()` are SQL functions,
not automatic crons. Wire them to run daily via Supabase's **Scheduled
Edge Functions** (Dashboard → Edge Functions → Cron) once you reach Stage 7 —
this keeps the free tier working without requiring `pg_cron` superuser access.

## Development Stages

| Stage | Scope | Status |
|---|---|---|
| 1 | Auth, DB, RLS, layout, dashboard shell | ✅ this build |
| 2 | Hot/Cold/Lifting PTW forms + approval workflow | not started |
| 3 | Lifting Plan, Crane Checklist, Site Prep, Rigging, Competency, Critical Lift | not started |
| 4 | Field Verification, Ready-to-Lift gate, Start/Suspend/Resume/Extend/Complete/Close | not started |
| 5 | File/photo upload, PDF packages, Excel export | not started |
| 6 | QR generation/scanning, public verification | not started |
| 7 | Search, Archive, retention sweep, Reports, KPIs, Audit trail, Notifications | not started |
| 8 | Security/mobile/PWA QA pass | not started |

Each stage should be built and manually tested against a real Supabase
project before moving to the next — per the brief, this is not generated
as one giant block.

## Security notes

- Every table is RLS-protected; policies enforce contractor/project scoping,
  block self-approval, and make `audit_logs` append-only (no update/delete
  policy exists, so both are denied by default).
- Public QR verification (`/verify/:permitId`) will call the
  `public_verify_permit()` Postgres function (SECURITY DEFINER, granted to
  `anon`) rather than querying tables directly — so it can only ever return
  the safe field set from the spec, never full permit records.
- No passwords, service-role keys, or credentials are ever placed in
  frontend code.

## Disclaimer

Digital verification does not replace competent-person inspection, approved
project procedures, engineering calculations, manufacturer requirements, or
applicable regulations. The in-app lifting calculator (Stage 3) is a
screening aid only.
