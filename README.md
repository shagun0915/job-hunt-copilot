# AI Job Hunt Copilot

A single-user command center for a software job search — track every application,
recruiter email, OA deadline, interview and résumé version in one place, with an
LLM handling the tedious parts: reading job descriptions, triaging the inbox,
scoring résumé fit, drafting outreach.

I built it for my own search. It also stands as a portfolio piece for
LLM-application engineering: structured extraction with Zod-validated schemas, a
provider-agnostic model layer, graceful degradation when keys are absent, and an
OAuth-backed Gmail integration — deployed, with CI and migrations on every push.

> A [3-minute walkthrough script](docs/DEMO_SCRIPT.md) and a demo dataset
> (`npm run db:seed:demo`) are included for a video tour.

## Screenshots

<!-- Add 2–3 images: the dashboard, an application after an ATS pass
     (showing the "can't be closed honestly" section), and the triaged inbox.
     e.g.  ![Dashboard](docs/img/dashboard.png)  -->

## Features

| Area | What it does |
| --- | --- |
| **Application tracker** | Kanban board + list, full pipeline (`SAVED → APPLIED → OA → PHONE_SCREEN → ONSITE → OFFER` / `REJECTED` / `WITHDRAWN` / `GHOSTED`), status history, contacts, comp, work arrangement, posting vs. application links, which résumé version you submitted, notes |
| **JD extraction** | Paste a job description → the model extracts a summary, must-have requirements, nice-to-haves, tech stack and **red flags**, validated against a Zod schema |
| **ATS pass** | Per role: pick the résumé version automatically (specialized vs generic), score **before → after**, split the keyword gap into hard-requirements vs nice-to-haves, produce truthful bullet rewrites that fold in missing keywords, and list every gap that *can't* be closed without lying. PDF / DOCX / text parsing |
| **Candidate profile** | A single record of facts (availability, employment status, a "never claim" list) that keeps every résumé rewrite and message factually accurate |
| **Gmail inbox sync** | Pulls recent job-search threads via the Gmail API, summarizes and categorizes each, auto-links threads to applications, and extracts deadlines ("OA due Friday") into the tracker |
| **Deadlines** | OA windows, take-homes and respond-by dates, grouped overdue / next-7-days / later; auto-created from email |
| **Interviews** | Schedule, prep notes, interviewer list, outcome + debrief |
| **Draft generator** | Per application: cover letter, recruiter reply, referral ask, cold outreach, direct application email, or follow-up — from the JD + your résumé + profile. Referral/cold outreach return a ≤300-char LinkedIn connection note *plus* the longer message to send once they accept. Optional recipient context and freeform steer |
| **Job board** | Aggregates open roles straight from company ATS boards (Greenhouse, Lever, Ashby) with no API key; one click turns a listing into a tracked application |
| **Semantic search** | Ask in plain language across every application, JD and email ("roles that wanted Kafka", "who ghosted me after an onsite"). Embeddings ranked by cosine similarity; falls back to keyword scan with no key |
| **Dashboard** | Response rate, offers, needs-follow-up (silent 7+ days), upcoming deadlines & interviews, recent activity |
| **Scheduled sync** | A daily Vercel Cron job runs a smaller inbox sync automatically |

Every integration **degrades gracefully**: with no `OPENAI_API_KEY` the tracker
works and AI panels show a "not configured" state; with no Google OAuth the app
runs ungated in local single-user mode and Gmail sync is hidden.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack)
- **PostgreSQL** + **Prisma 6** (Supabase in production, pooled connection)
- **NextAuth v5** — Google provider, doubling as the Gmail API grant
- **LLM** — any OpenAI-compatible endpoint (OpenAI `gpt-4o-mini`, or Google Gemini's free tier) with JSON-mode + Zod-validated responses; embeddings for semantic search
- **Tailwind v4**, theme-aware (light/dark)
- **Vitest** unit tests · **GitHub Actions** CI · deploy target **Vercel**

## Getting started

```bash
cp .env.example .env          # DATABASE_URL + DATABASE_URL_UNPOOLED required; keys optional
npm install
npm run db:up                 # Postgres via Docker
npm run db:migrate            # apply schema
npm run db:seed               # your data: 8 example applications, 2 résumé stubs, a profile
npm run dev                   # http://localhost:3000
```

`npm run db:seed:demo` instead loads a fictional persona for a screen recording —
see [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

Runs immediately with **zero API keys** — you get the full tracker and job board.
Add keys to unlock the AI and Gmail features:

### LLM (JD extraction, résumé match, drafts, embeddings)

The `openai` SDK works against any OpenAI-compatible endpoint, so this is really
"pick a provider," not just OpenAI:

```bash
OPENAI_API_KEY="sk-…"
OPENAI_MODEL="gpt-4o-mini"
OPENAI_EMBED_MODEL="text-embedding-3-small"
```

**Free option — Google Gemini.** No credit card, no trial clock. Grab a key at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey), then:

```bash
OPENAI_API_KEY="<gemini-api-key>"
OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
OPENAI_MODEL="gemini-3.6-flash"
OPENAI_EMBED_MODEL="gemini-embedding-001"
```

Free-tier limits (~10 req/min plus a daily cap) are fine for steady day-to-day
use, though a burst of activity can hit the per-minute limit — `chatJSON` backs
off and retries, and the UI shows a "rate-limited, try again" message rather than
erroring. Two tradeoffs: Google may use free-tier prompts for training (skip it
if résumé/JD content needs to stay private), and testing-mode Gmail tokens expire
after 7 days. A paid Gemini or OpenAI key lifts both and uses the same env vars.

### Google OAuth + Gmail sync

1. Create an OAuth client (Web) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Authorized redirect URIs — add both:
   `http://localhost:3000/api/auth/callback/google` and
   `https://<your-domain>/api/auth/callback/google`
3. Enable the **Gmail API** and add the `gmail.readonly` scope on the OAuth consent screen.
4. Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET` (`npx auth secret`).
5. `ALLOWED_EMAIL` locks sign-in to your address.

> **Gmail scope caveat.** `gmail.readonly` is a *restricted* scope. Publishing the
> OAuth app for real would trigger Google's verification (privacy policy, demo
> video, possibly a security assessment). For a single-user personal app, leave
> the consent screen in **Testing** and add yourself as a test user — no
> verification needed. The tradeoff: refresh tokens issued in testing mode expire
> after 7 days, so you re-authorize weekly. Everything else keeps working.

## Deploying to Vercel

1. **Import the repo** in Vercel — it auto-detects Next.js and runs the
   `vercel-build` script (`prisma generate && prisma migrate deploy && next build`),
   so migrations apply on every deploy.
2. **Database — Supabase**: create a project, open **Connect**, and set two env
   vars in Vercel:
   - `DATABASE_URL` = the **Transaction pooler** string (port 6543) with
     `?pgbouncer=true&connection_limit=1` appended
   - `DATABASE_URL_UNPOOLED` = the **Session pooler** string (port 5432,
     `*.pooler.supabase.com`) — *not* the raw "Direct connection", which is
     IPv6-only and won't reach from Vercel's build container
   (Neon also works — set the same two vars from its pooled + direct strings.)
3. **Env vars** (Settings → Environment Variables, Production):
   `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_EMBED_MODEL`,
   `OPENAI_REASONING_EFFORT` (`minimal` for Gemini), `AUTH_SECRET`
   (`npx auth secret`), `CRON_SECRET` (any random string), `ALLOWED_EMAIL`,
   `AUTH_URL` (your production URL — set it explicitly; the callback needs an
   exact match).
4. **Lock it down.** Vercel's own "Vercel Authentication" only protects *preview*
   deployments on the Hobby plan — production stays public. So the gate is the
   app's own auth: set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, and with those
   present the app leaves local mode and every route requires a Google sign-in
   restricted to `ALLOWED_EMAIL`. (This is also what enables Gmail sync.) Add
   `https://<domain>/api/auth/callback/google` to the OAuth client's redirect
   URIs. On the OAuth consent screen the Gmail permission appears on a **second**
   screen after the identity screen — grant it there.
5. **Functions region.** `vercel.json` pins functions to `bom1`; change it to a
   region near your database or every request pays a cross-region round trip.
6. `vercel.json` also registers a daily cron (`/api/cron/sync-inbox`); Vercel
   injects the `CRON_SECRET` bearer token automatically. Trigger it by hand with
   `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/sync-inbox`.

## Architecture notes

### LLM layer (`src/lib/ai/`, `src/lib/openai.ts`)

`chatJSON({ system, user, schema })` is the one entry point: it requests
`response_format: json_object`, strips a stray ` ```json ` fence if the endpoint
added one, retries `429`s with backoff, drops `response_format` and retries if an
endpoint rejects it, sends `reasoning_effort: minimal` to thinking models (Gemini
otherwise spends the token budget on hidden reasoning and truncates the JSON),
then validates against a Zod schema before anything touches the database. Each
feature (`extract-jd`, `match-resume`, `pick-resume`, `draft-message`,
`summarize-thread`, `embed`) is a thin prompt + schema module; AI form actions
surface a failure inline instead of throwing to the route boundary. Extraction
results are cached on the row so re-runs are explicit.

The résumé and outreach prompts encode a specific workflow: score the ATS fit
before and after, separate hard-requirement gaps from nice-to-haves, rewrite
bullets to surface keywords the candidate **genuinely** has, and never fabricate
experience — gaps that can't be closed honestly are listed, not papered over.
`CandidateProfile` (a singleton) injects accuracy constraints (employment status,
availability, a "never claim" list) into every generation.

### Gmail (`src/lib/gmail.ts`)

Raw `fetch` against the Gmail REST API — no SDK. The Google access token comes
from the NextAuth `Account` row; the `signIn` callback re-persists the tokens on
every login (the Prisma adapter only writes them on first link), and a stale
token that 401s triggers one forced refresh + retry. MIME payloads are walked to
pull `text/plain` (falling back to stripped HTML). `syncInbox()` upserts
threads/messages, summarizes only new or changed threads, best-effort links each
thread to an application, and can create a new application straight from a thread.

### Semantic search (`src/lib/search.ts`)

`reindex()` composes one text doc per application / email thread, hashes it, and
re-embeds only what changed. Vectors are stored as `Float[]` and cosine-ranked in
the app — the dataset is tiny (single user), so no `pgvector` extension or vector
index is needed. With no OpenAI key, `search()` falls back to a case-insensitive
scan of the same docs.

### Data model (`prisma/schema.prisma`)

`Company → Application` with `StatusEvent`, `Contact`, `Deadline`, `Interview`,
`EmailThread → EmailMessage`, `ResumeVersion`, `MatchScore` (`@@unique` on
application+resume), `Draft`, plus a standalone `JobListing` feed and an
`Embedding` index. Single-user: auth gates the whole surface, so domain rows
aren't per-user scoped.

### Rendering

All authenticated routes are `force-dynamic` (they read Postgres per request);
pages that trigger LLM calls set `maxDuration = 60`, and `vercel.json` pins
functions to one region so they sit next to the database. Mutations are Server
Actions with `revalidatePath`; interactive pending states use `useActionState` /
`useFormStatus`.

## Security model

Single-user app, so the usual multi-tenant surface (IDOR, per-row authz, role
escalation) doesn't exist — every request is either the one allowed Google
account or nobody. What is worth calling out:

- **Prompt injection is the real threat here.** JD text scraped from public ATS
  boards and Gmail message bodies both flow into LLM calls. The blast radius is
  contained by construction: every `chatJSON()` call runs in JSON mode against a
  Zod schema, so a malicious JD can at worst produce junk fields that fail
  validation — model output never becomes shell, SQL, or a tool call. Drafts are
  always shown for review and never sent automatically.
- **CSP is nonce-based** (`src/proxy.ts`): per-request nonce, `strict-dynamic`,
  no `'unsafe-inline'` / `'unsafe-eval'` for scripts in production. This is why
  every route is `force-dynamic` — Next stamps the request nonce onto its script
  tags at render time. Also sets HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, a locked-down `Permissions-Policy`, and
  `frame-ancestors 'none'`.
- **Secrets**: `gitleaks` clean on the full history — no secret has ever been
  committed. Real values live only in gitignored `.env` / `.env.local` locally
  and in Vercel's env store in production. `.env.example` documents every var.
- **Cron endpoint** (`/api/cron/sync-inbox`) is gated by a `CRON_SECRET` bearer
  token; it's the only unauthenticated route and it does nothing without the
  Gmail refresh token in the database.
- **Known low-severity advisory**: `npm audit` flags `deepmerge-ts` (stack
  exhaustion) pulled in transitively by the Prisma **CLI**. It's a build-time dev
  dependency with no attacker-reachable path at runtime, and the "fix" downgrades
  Prisma across a major version, so it's accepted rather than patched.

## Scripts

| | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `vercel-build` | production build (the latter also runs `prisma migrate deploy`) |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run lint` / `npm test` | ESLint / Vitest |
| `npm run db:up` / `db:migrate` / `db:deploy` / `db:seed` / `db:seed:demo` / `db:studio` / `db:reset` | database |

## Tests & CI

`npm test` runs Vitest over the pure logic — ATS board HTML parsing, the Gmail
MIME walker, salary/date formatting, status metadata. GitHub Actions
(`.github/workflows/ci.yml`) spins up Postgres and runs migrate → typecheck →
lint → test → build on every push and PR, all in fully-degraded mode (no API
keys) to prove the graceful-degradation contract.
