# AI Job Hunt Copilot

A single-user job-search command center: track every application, recruiter
thread, OA deadline, interview and résumé version in one dashboard — with an LLM
doing the tedious parts (reading job descriptions, triaging your inbox, scoring
résumé fit).

Built to show LLM-application engineering: structured extraction with schema
validation, retrieval-light prompt design, graceful degradation when keys are
absent, and an OAuth-backed Gmail integration.

## Features

| Area | What it does |
| --- | --- |
| **Application tracker** | Kanban board + list, full pipeline (`SAVED → APPLIED → OA → PHONE_SCREEN → ONSITE → OFFER` / `REJECTED` / `WITHDRAWN` / `GHOSTED`), status history, contacts, comp, notes |
| **JD extraction** | Paste a job description → GPT extracts a summary, must-have requirements, nice-to-haves, tech stack and **red flags**, validated against a Zod schema |
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
- **PostgreSQL** + **Prisma 6**  (hosted on **Neon**, pooled connection)
- **NextAuth v5** — Google provider, doubling as the Gmail API grant
- **OpenAI** — chat (`gpt-4o-mini`) with JSON-mode + Zod-validated responses; embeddings (`text-embedding-3-small`)
- **Tailwind v4**, theme-aware (light/dark)
- **Vitest** unit tests · **GitHub Actions** CI · deploy target **Vercel**

## Getting started

```bash
cp .env.example .env          # fill in keys (all optional except DATABASE_URL)
npm install
npm run db:up                 # Postgres via Docker
npm run db:migrate            # apply schema
npm run db:seed               # demo data (8 applications, deadlines, a résumé)
npm run dev                   # http://localhost:3000
```

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

Free-tier limits (~10 req/min, 250/day) are well above what a personal tracker
needs. One tradeoff: Google may use free-tier prompts for training — skip this
if you don't want résumé/JD content used that way (a paid Gemini or OpenAI key
works with the same env vars either way).

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
2. **Database**: in the project's *Storage* tab, add **Postgres (Neon)**. It
   injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) — the exact
   names the Prisma schema expects, no manual copying. (Standalone Neon works too:
   set those two vars yourself.)
3. **Env vars** (Settings → Environment Variables, Production):
   `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_EMBED_MODEL`,
   `AUTH_SECRET` (`npx auth secret`), `CRON_SECRET` (any random string),
   `ALLOWED_EMAIL`. Add `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` only if you want
   Gmail sync. `AUTH_URL` is inferred automatically.
4. **Keep it private**: Settings → Deployment Protection → enable *Vercel
   Authentication*. Gates the whole app behind your Vercel login — no app-level
   auth needed. (Google OAuth, if set, adds a second `ALLOWED_EMAIL` gate.)
5. `vercel.json` registers a daily cron (`/api/cron/sync-inbox`); Vercel injects
   the `CRON_SECRET` bearer token automatically. Trigger it by hand with
   `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/sync-inbox`.
6. If you added Google OAuth: add `https://<domain>/api/auth/callback/google` to
   the OAuth client's redirect URIs.

## Architecture notes

### LLM layer (`src/lib/ai/`, `src/lib/openai.ts`)

`chatJSON({ system, user, schema })` is the one entry point: it calls the model
in `response_format: json_object` mode, parses defensively, and validates the
result against a Zod schema before it reaches the database. Each feature
(`extract-jd`, `match-resume`, `pick-resume`, `draft-message`, `summarize-thread`,
`embed`) is a thin prompt + schema module. Extraction results are cached on the
row so re-runs are explicit.

The résumé and outreach prompts encode a specific workflow: score the ATS fit
before and after, separate hard-requirement gaps from nice-to-haves, rewrite
bullets to surface keywords the candidate **genuinely** has, and never fabricate
experience — gaps that can't be closed honestly are listed, not papered over.
`CandidateProfile` (a singleton) injects accuracy constraints (employment status,
availability, a "never claim" list) into every generation.

### Gmail (`src/lib/gmail.ts`)

Raw `fetch` against the Gmail REST API — no SDK. The Google access token comes
from the NextAuth `Account` row and is refreshed against the Google token
endpoint when stale. MIME payloads are walked to pull `text/plain` (falling back
to stripped HTML). `syncInbox()` upserts threads/messages, summarizes only new or
changed threads, and best-effort links each thread to an application by company
name / sender domain.

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

All authenticated routes are `force-dynamic` (they read Postgres per request).
Mutations are Server Actions with `revalidatePath`; interactive pending states
use `useActionState` / `useFormStatus`.

## Scripts

| | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `vercel-build` | production build (the latter also runs `prisma migrate deploy`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run db:up` / `db:migrate` / `db:deploy` / `db:seed` / `db:studio` / `db:reset` | database |

## Tests & CI

`npm test` runs Vitest over the pure logic — ATS board HTML parsing, the Gmail
MIME walker, salary/date formatting, status metadata. GitHub Actions
(`.github/workflows/ci.yml`) spins up Postgres and runs migrate → typecheck →
lint → test → build on every push and PR, all in fully-degraded mode (no API
keys) to prove the graceful-degradation contract.
