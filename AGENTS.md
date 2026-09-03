<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI Job Hunt Copilot

Single-user job-search tracker with LLM assists. See `README.md` for the full picture.

## Conventions

- **Pinned versions**: Prisma is pinned to `6.19.3` on purpose — the `latest` dist-tag
  is an 8.0 RC with a completely different CLI. Don't `npm update` it.
- **Graceful degradation is a hard requirement.** Every external integration
  (OpenAI, Google/Gmail) must let the app boot and the tracker work when its keys
  are absent. Feature flags live in `src/lib/env.ts` (`aiConfigured`,
  `authConfigured`, `localMode`).
- **Auth**: single-user. `getViewer()` / `requireViewer()` in `src/lib/viewer.ts`.
  In local mode (no Google creds) there is a synthetic viewer and no gate.
- **LLM calls** go through `chatJSON()` in `src/lib/openai.ts` — always JSON mode +
  a Zod schema. New AI features = a new module under `src/lib/ai/`. Embeddings via
  `src/lib/ai/embed.ts`.
- **Résumé tailoring & outreach must follow the user's agreed playbook** — see the
  `feedback-job-search-drafting-playbook` memory. Key rules baked into
  `src/lib/ai/match-resume.ts` and `draft-message.ts`: ATS score before→after,
  hard-requirement vs nice-to-have gap split, **never fabricate experience**, list
  gaps that can't be honestly closed, 3-sentence referral note + longer follow-up.
- `CandidateProfile` (singleton, `src/lib/profile.ts`) feeds accuracy constraints
  (employment status, availability, "never claim" list) into every résumé rewrite
  and message. Editable at `/profile`.
- Résumé versions have a `kind` (SPECIALIZED / GENERIC); `src/lib/ai/pick-resume.ts`
  auto-selects per JD when the user doesn't pick one.
- **Mutations** are Server Actions in `src/lib/actions/*.ts`, guarded by
  `requireViewer()`, ending with `revalidatePath`. Logic that also runs from a
  route handler (e.g. cron) lives in a plain module (`src/lib/inbox-sync.ts`,
  `src/lib/search.ts`) — a `"use server"` file may only export async actions.
- **Every** route is `force-dynamic` (root layout + `(app)` layout). Required by
  the nonce-based CSP in `src/proxy.ts` — Next stamps the per-request nonce onto
  script tags only when rendering per-request. Don't add static routes.
- Security headers + CSP are in `src/proxy.ts` (Next 16 renamed middleware). CSP
  is nonce + `strict-dynamic`, no `'unsafe-inline'`/`'unsafe-eval'` for scripts.
  Adding an external script/style/font/image origin means editing that CSP.
- A deployed host (`VERCEL_ENV` set) must have `AUTH_GOOGLE_ID/SECRET` +
  `ALLOWED_EMAIL` — `src/lib/env.ts` throws at boot otherwise, and `getViewer()`
  never returns the synthetic local user. `ALLOW_LOCAL_MODE=1` opts out.
- Never nest `<form>` elements — sibling forms + hidden inputs instead.
- Form number inputs: parse with a zod `preprocess` that maps `""` → `undefined`
  (`z.coerce.number()` turns `""` into `0` and trips `.positive()`).
- Semantic search stores vectors as `Float[]` and ranks in JS — **no pgvector**.
  Keep it that way unless the dataset genuinely outgrows it.

## Deploy (Vercel + Supabase Postgres)

- `vercel-build` script runs `prisma migrate deploy`. `DATABASE_URL` = Supabase
  transaction pooler (6543, `?pgbouncer=true&connection_limit=1`),
  `DATABASE_URL_UNPOOLED` = Supabase **session pooler** (5432, `*.pooler.supabase.com`
  — NOT the IPv6-only direct connection). Both set locally too (same Docker value).
- `/api/cron/sync-inbox` is a Vercel Cron (see `vercel.json`), gated by `CRON_SECRET`.
- Gmail `readonly` is a restricted scope — OAuth app stays in Testing mode
  (7-day refresh-token expiry is the accepted tradeoff).

## Workflow

- `npm run db:up` then `npm run db:migrate` after schema changes; keep `prisma/seed.ts` working.
- Before declaring done: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Don't run `npm run build` while `next dev` is live — clear `.next` and restart after.
