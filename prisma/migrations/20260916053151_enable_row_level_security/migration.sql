-- Supabase's database linter flags every table in `public` as ERROR-level
-- because Supabase stands up a PostgREST API (and GraphQL) over this schema
-- for every project, gated only by the `anon`/`authenticated` roles — RLS is
-- the only thing standing between those roles and the data.
--
-- This app never uses that API surface (no @supabase/supabase-js, no anon/
-- service-role key anywhere in the codebase or env) — Prisma talks to Postgres
-- directly as the `postgres` role, which has BYPASSRLS and is unaffected by
-- any of this. Enabling RLS with zero policies makes the default-deny apply
-- to `anon`/`authenticated` (closing the API surface entirely) while leaving
-- Prisma's own access untouched.
--
-- Two tables (Account, VerificationToken) also tripped
-- `sensitive_columns_exposed` (OAuth access/refresh tokens, verification
-- tokens) — same fix, higher stakes: those tokens grant Gmail read access.

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Draft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StatusEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Deadline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Interview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EmailThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EmailMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ResumeVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MatchScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CandidateProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."JobListing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Embedding" ENABLE ROW LEVEL SECURITY;
