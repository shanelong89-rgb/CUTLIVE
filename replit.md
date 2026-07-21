# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Supabase Storage bucket required**: The mobile app uploads event photos to a bucket called `submission-images`. This bucket must exist and be set to **public** in your Supabase project before image upload works. Create it once via the Supabase Dashboard (Storage → New bucket → name `submission-images` → toggle Public ON), or run `pnpm --filter @workspace/scripts run setup-storage` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set. See `supabase/schema.sql` for full instructions.
- **Manual Supabase migrations** — the following were run directly in the Supabase SQL Editor and are not applied automatically:
  - `supabase/migrations/add_date_end_to_events_and_submissions.sql` — adds `date_end text` to both tables
  - `supabase/migrations/add_metadata_to_events_and_submissions.sql` — adds `metadata jsonb` to both tables
  - `supabase/migrations/prevent_auto_approve_on_enrich.sql` — DB trigger that keeps enriched submissions in `pending` instead of auto-approving them
  - `supabase/migrations/add_verify_wa_magic_link_rpc.sql` — **not yet run**. Adds `verify_wa_magic_link(phone, token)` RPC used by `/auth/verify` (WhatsApp magic-link login). Must be run before that page will work.
  - `supabase/migrations/normalize_event_districts.sql` — **not yet run**. Normalizes `district` in `events` and `submissions` to Title Case (slug map + initcap fallback). Submit form now normalizes districts client-side via `normalizeDistrict()` in `Submit.tsx`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
