# Walkthrough script (Loom / screen recording)

Target length **~3 minutes**. Persona in the demo data is fictional ("Sam Carter") so
nothing personal is on screen — you narrate as yourself ("I built this…").

---

## Before you record

```bash
# 1. local DB up, demo data loaded
npm run db:up
npm run db:seed:demo

# 2. your Gemini key in .env so AI features run live
#    OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL / OPENAI_EMBED_MODEL

# 3. run it
npm run dev            # http://localhost:3000
```

Then, once in the app: open **Search → Build index** (≈10s — needed for the
semantic-search moment; the demo seed doesn't create embeddings). Re-run this
after any re-seed.

- Browser: **hide the bookmarks bar**, close other tabs, 1280–1440px wide, 100% zoom.
- Do a **dry run first** — run "AI extract" and "ATS pass" on Halcyon Pay once so the
  Gemini per-minute quota is warm and you know the timing. Then re-seed
  (`npm run db:seed:demo`) to reset for the real take.
- Loom: 1080p, mic on, camera bubble optional. Free tier caps at 5 min — fine.
- The yellow "local mode / Gmail needs OAuth" banner is fine to leave — mention it's
  just because you're running locally.

---

## Script

### 0:00 — Hook  *(Dashboard)*

> "This is a job-search copilot I built for my own search. It's a full-stack
> Next.js app — deployed, with a Postgres database, Google auth, a Gmail
> integration — and the interesting part is the LLM layer. Let me show you the core
> loop."

*On screen: the Dashboard — stats, upcoming deadlines, needs-follow-up.*

> "Everything's here — pipeline, response rate, deadlines, stale applications that
> need a nudge."

### 0:20 — The pipeline  *(click Applications)*

*Click **Applications**. The kanban board.*

> "Applications move through a pipeline — saved, applied, OA, phone screen, onsite,
> offer. Let me open one I just applied to."

*Click the **Halcyon Pay — Senior Backend Engineer** card.*

### 0:35 — JD extraction  *(Halcyon Pay detail page)*

*Scroll to the "Job description" card — raw JD text is there, nothing extracted.*

> "I pasted the raw job description. Now I hit **AI extract**."

*Click **AI extract**. ~5–10s.* Narrate through the wait:

> "It's calling the model with a strict JSON schema and validating the response
> before anything touches the database — so I never get a half-parsed blob."

*Results appear: summary, must-have requirements, nice-to-haves, tech stack, and —*

> "…and **red flags**. It flagged the six-plus years requirement and the on-call for
> a money-movement system, because those matter to me."

### 1:00 — The ATS pass  *(same page)*

*Click **Run ATS pass** (leave it on "Auto-pick résumé"). ~15–25s.* Narrate:

> "This does two things — first it picks which of my résumé versions fits this role
> best, then it scores the fit. It's a transparent heuristic, not a real ATS, but
> the before-and-after delta is what I care about."

*Results render.*

> "It auto-picked my backend-focused résumé and explains why. Score goes from the
> low fifties to the mid-seventies **if** I apply the suggested rewrites."

*Point at the gap sections.*

> "It splits what's missing into hard requirements versus nice-to-haves. And here's
> the part I'm most happy with —"

*Point at **"Can't be closed honestly"**.*

> "— it will not fabricate. I told it my résumé doesn't have Kubernetes, Kafka or
> gRPC, so instead of stuffing those keywords in, it lists them as gaps I can't
> close without lying. An inflated résumé falls apart in the interview room."

*Expand **Suggested résumé rewrites**.*

> "The rewrites only surface things I actually did — reworded in the JD's language,
> with the keywords it folded in."

### 1:40 — Drafts  *(scroll to Drafts card)*

*In the Drafts card, pick **Referral ask**, click **Generate**. ~10s.*

> "I have a referral at this company, so I generate a referral ask. It gives me two
> things — a short LinkedIn connection note under 300 characters, and the longer
> message to send once they accept. It pulls facts from my profile so it stays
> accurate — never says I'm still at my old employer, mentions I'm available."

### 2:00 — Inbox  *(click Inbox)*

*Click **Inbox**.*

> "This syncs my Gmail — recruiter threads only — and triages each one. Categorized,
> action-needed flagged, summarized."

*Click the **"Next steps — Senior Backend Engineer"** thread (Halcyon Pay).*

> "It read the take-home email, summarized it, linked it to the right application,
> and pulled the deadline into my tracker automatically."

*Point at the Copilot summary + the linked application.*

### 2:20 — Deadlines + search

*Click **Deadlines**.*

> "Deadlines roll up here — overdue, next seven days, later — including the ones
> auto-detected from email."

*Click **Search**. Type: `backend roles that wanted Kubernetes`. Enter.*

> "And search is semantic — embeddings over every application, JD and email. I can
> ask in plain language across the whole search."

### 2:40 — Close

> "Stack is Next.js 16, Postgres with Prisma, NextAuth, and the LLM layer runs
> against any OpenAI-compatible endpoint — I'm using Gemini's free tier here. It's
> deployed on Vercel with CI and migrations on every push. Code's linked in the
> description. Thanks for watching."

---

## If the live AI calls flake (rate limit)

Gemini free tier is ~10 requests/minute. If "AI extract" or "ATS pass" shows a
rate-limit message mid-recording:

- Wait ~60s and retry — or
- Pre-run both on Halcyon Pay before recording (don't re-seed), and in the take
  just say "I've run this already, here's the result" and scroll through it.

## After recording

- Trim the dead air during the AI calls (Loom → trim).
- Add the repo + live URL to the video description.
- First frame should be the Dashboard, not a loading spinner — record a second of
  it before you start talking.
