/**
 * Demo seed for a screen recording / Loom walkthrough. Fictional persona,
 * fictional data. Unlike `seed.ts` this leaves one application with raw JD text
 * and no extraction so you can run "AI extract" → "ATS pass" → "draft" live on
 * camera, and pre-populates the inbox so it looks real without connecting Gmail.
 *
 *   npm run db:seed:demo
 */
import { PrismaClient, type ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

const days = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

// The JD you'll run "AI extract" + "ATS pass" against, live.
const LIVE_JD = `Senior Backend Engineer — Payments Platform

We're hiring a Senior Backend Engineer to own services on our payments platform —
ledgers, settlement, and the APIs partners build on. You'll work in a
high-throughput, correctness-critical environment where a bug can cost real money.

Responsibilities
- Design, build and operate Go services handling millions of requests/day
- Model financial data in PostgreSQL; keep migrations safe under load
- Build event-driven pipelines on Kafka for settlement and reconciliation
- Expose and consume gRPC APIs across service boundaries
- Own reliability: on-call rotation, incident response, SLOs
- Mentor mid-level engineers and drive technical design reviews

Requirements
- 6+ years building backend services in production
- Expert in Go and PostgreSQL
- Hands-on Kafka and event-driven architecture
- gRPC / protobuf in production
- Kubernetes for deployment and operations
- Payments, ledgers or other money-movement systems

Nice to have
- Experience with double-entry accounting systems
- Rust
- Exposure to PCI-DSS environments

Compensation: $180,000 – $240,000 + equity. Remote (US time zones).`;

const RESUME_BACKEND = `SAM CARTER — Backend Software Engineer
sam.carter.dev@example.com · github.com/samcarter · Remote (US)

SUMMARY
Backend engineer with 4 years building and operating Go services in production.
Strong in PostgreSQL data modeling, REST API design, and observability. Comfortable
owning a service end to end, from design review to on-call.

EXPERIENCE
Software Engineer, Northwind Logistics (2022–present)
- Built and operate 4 Go microservices behind the shipment-tracking product,
  ~1.2M requests/day, p99 under 120ms
- Designed the PostgreSQL schema for the tracking domain; introduced zero-downtime
  migration tooling adopted by 3 other teams
- Added structured logging + tracing (OpenTelemetry), cutting mean incident
  triage time roughly in half
- Rotate through on-call; wrote the runbook for the tracking service

Junior Software Engineer, Bluebird Software (2021–2022)
- Shipped REST APIs in Go and Python for an internal analytics tool
- Owned query performance for the reporting database (PostgreSQL)

SKILLS
Go, PostgreSQL, Redis, REST APIs, Docker, OpenTelemetry, GitHub Actions, Linux,
SQL performance tuning, Agile

EDUCATION
B.S. Computer Science, State University (2021)`;

const RESUME_GENERIC = `SAM CARTER — Software Engineer
sam.carter.dev@example.com · github.com/samcarter · Remote (US)

SUMMARY
Full-stack-leaning software engineer, 4 years experience, backend focus. Ships
production services in Go, builds internal tools, and keeps systems observable.

EXPERIENCE
Software Engineer, Northwind Logistics (2022–present)
- Backend services in Go (~1.2M req/day) plus internal React dashboards
- PostgreSQL schema design and migration tooling
- Structured logging + tracing across the product

Junior Software Engineer, Bluebird Software (2021–2022)
- REST APIs in Go and Python; reporting-database query performance

SKILLS
Go, Python, JavaScript, React, PostgreSQL, Redis, REST APIs, Docker,
OpenTelemetry, GitHub Actions, Agile

EDUCATION
B.S. Computer Science, State University (2021)`;

type Row = {
  company: string;
  role: string;
  status: ApplicationStatus;
  location?: string;
  workArrangement?: "ONSITE" | "REMOTE" | "HYBRID";
  seniority?: string;
  source?: string;
  salaryMin?: number;
  salaryMax?: number;
  appliedDaysAgo?: number;
  sourceUrl?: string;
  applicationUrl?: string;
  jdText?: string;
  extracted?: {
    summary: string;
    requirements: string[];
    niceToHaves: string[];
    techStack: string[];
    redFlags: string[];
  };
};

const ROWS: Row[] = [
  {
    // The star of the demo — raw JD, nothing extracted yet.
    company: "Halcyon Pay",
    role: "Senior Backend Engineer, Payments Platform",
    status: "APPLIED",
    location: "Remote (US)",
    workArrangement: "REMOTE",
    seniority: "Senior",
    source: "Referral",
    salaryMin: 180000,
    salaryMax: 240000,
    appliedDaysAgo: 3,
    sourceUrl: "https://halcyonpay.example.com/careers/senior-backend-payments",
    applicationUrl: "https://halcyonpay.example.com/apply/9182",
    jdText: LIVE_JD,
  },
  {
    company: "Stripe",
    role: "Software Engineer, Payments",
    status: "OA",
    location: "Remote · US",
    workArrangement: "REMOTE",
    seniority: "Mid",
    source: "Referral",
    salaryMin: 155000,
    salaryMax: 205000,
    appliedDaysAgo: 12,
    extracted: {
      summary:
        "Build and operate the APIs behind Stripe's core payments flow, across services that move billions of dollars daily.",
      requirements: [
        "3+ years building backend services in production",
        "Strong with a typed language (Go, Java, or TypeScript)",
        "Distributed systems and databases",
      ],
      niceToHaves: ["Payments or fintech background", "Ruby experience"],
      techStack: ["Ruby", "Go", "MongoDB", "Kafka", "AWS"],
      redFlags: ["Salary band spans $50k with no leveling detail"],
    },
  },
  {
    company: "Vercel",
    role: "Software Engineer, Build Infra",
    status: "ONSITE",
    location: "Remote · US",
    workArrangement: "REMOTE",
    seniority: "Senior",
    source: "Recruiter outreach",
    salaryMin: 180000,
    salaryMax: 240000,
    appliedDaysAgo: 26,
    extracted: {
      summary:
        "Work on the build and deployment pipeline behind millions of Next.js deployments.",
      requirements: [
        "Build systems or CI/CD at scale",
        "Systems programming (Rust, Go, or C++)",
        "Debugging distributed systems",
      ],
      niceToHaves: ["Monorepo tooling", "Open-source contributions"],
      techStack: ["Rust", "TypeScript", "Turbopack", "Kubernetes"],
      redFlags: ["Take-home listed as 6–8 hours, unpaid"],
    },
  },
  {
    company: "Ramp",
    role: "Backend Engineer",
    status: "APPLIED",
    location: "New York, NY",
    workArrangement: "HYBRID",
    seniority: "Mid",
    source: "LinkedIn",
    appliedDaysAgo: 11,
  },
  {
    company: "Render",
    role: "Backend Engineer, Platform",
    status: "PHONE_SCREEN",
    location: "Remote (global)",
    workArrangement: "REMOTE",
    seniority: "Mid",
    source: "Company site",
    salaryMin: 150000,
    salaryMax: 190000,
    appliedDaysAgo: 8,
    extracted: {
      summary:
        "Own services in the platform that provisions and runs customer workloads.",
      requirements: [
        "3+ years backend experience",
        "Go or a similar systems language",
        "Comfort with Postgres and infrastructure",
      ],
      niceToHaves: ["Kubernetes", "Multi-tenant systems"],
      techStack: ["Go", "PostgreSQL", "Kubernetes", "gRPC"],
      redFlags: [],
    },
  },
  {
    company: "Notion",
    role: "Fullstack Engineer",
    status: "REJECTED",
    location: "San Francisco, CA",
    workArrangement: "ONSITE",
    seniority: "Mid",
    source: "LinkedIn",
    appliedDaysAgo: 38,
  },
  {
    company: "Fly.io",
    role: "Software Engineer",
    status: "SAVED",
    location: "Remote",
    workArrangement: "REMOTE",
    seniority: "Mid",
    source: "Job board",
  },
  {
    company: "Segment",
    role: "Backend Engineer",
    status: "GHOSTED",
    location: "Remote · US",
    workArrangement: "REMOTE",
    source: "LinkedIn",
    appliedDaysAgo: 33,
  },
];

async function main() {
  console.log("Clearing existing data…");
  await prisma.embedding.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.matchScore.deleteMany();
  await prisma.emailMessage.deleteMany();
  await prisma.emailThread.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.statusEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.company.deleteMany();
  await prisma.resumeVersion.deleteMany();
  await prisma.jobListing.deleteMany();

  await prisma.candidateProfile.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      fullName: "Sam Carter",
      headline: "Backend Software Engineer — Go, PostgreSQL",
      location: "Remote (US)",
      availability: "Open to new roles, 2 weeks notice",
      statusNote:
        "Currently employed at Northwind Logistics — a confidential search. Keep current employer references neutral. ~4 years total experience (since 2021).",
      doNotClaim: [
        "Kubernetes",
        "Kafka",
        "gRPC",
        "Rust",
        "payments / ledger systems",
        "on-call for a money-movement system",
      ],
    },
  });

  const backend = await prisma.resumeVersion.create({
    data: {
      label: "Backend — Go / Postgres",
      kind: "SPECIALIZED",
      specialtyNote: "Backend services in Go, PostgreSQL, observability, on-call",
      isDefault: true,
      fileName: "sam-carter-backend.txt",
      content: RESUME_BACKEND,
    },
  });
  await prisma.resumeVersion.create({
    data: {
      label: "Generic SWE",
      kind: "GENERIC",
      specialtyNote: "Broad software engineering — Go, some React, tooling",
      fileName: "sam-carter-generic.txt",
      content: RESUME_GENERIC,
    },
  });

  const byName: Record<string, string> = {};

  for (const r of ROWS) {
    const company = await prisma.company.create({ data: { name: r.company } });
    const appliedAt =
      r.status === "SAVED" ? null : days(-(r.appliedDaysAgo ?? 5));

    const app = await prisma.application.create({
      data: {
        companyId: company.id,
        role: r.role,
        status: r.status,
        location: r.location,
        workArrangement: r.workArrangement,
        seniority: r.seniority,
        source: r.source,
        sourceUrl: r.sourceUrl,
        applicationUrl: r.applicationUrl,
        salaryMin: r.salaryMin,
        salaryMax: r.salaryMax,
        appliedAt,
        createdAt: appliedAt ?? new Date(),
        updatedAt:
          r.status === "APPLIED" || r.status === "GHOSTED"
            ? days(-(r.appliedDaysAgo ?? 10))
            : days(-2),
        jdText: r.jdText ?? (r.extracted ? "(job description on file)" : null),
        jdSummary: r.extracted?.summary,
        jdRequirements: r.extracted?.requirements ?? [],
        jdNiceToHaves: r.extracted?.niceToHaves ?? [],
        jdTechStack: r.extracted?.techStack ?? [],
        jdRedFlags: r.extracted?.redFlags ?? [],
        jdExtractedAt: r.extracted ? days(-(r.appliedDaysAgo ?? 5)) : null,
        jdExtractModel: r.extracted ? "seed" : null,
        statusEvents: {
          create:
            r.status === "SAVED"
              ? [{ to: "SAVED" as ApplicationStatus, createdAt: new Date() }]
              : [
                  {
                    to: "APPLIED" as ApplicationStatus,
                    createdAt: appliedAt ?? new Date(),
                  },
                  ...(r.status !== "APPLIED"
                    ? [
                        {
                          from: "APPLIED" as ApplicationStatus,
                          to: r.status,
                          createdAt: days(-2),
                        },
                      ]
                    : []),
                ],
        },
      },
    });
    byName[r.company] = app.id;
  }

  // Deadlines + interviews
  await prisma.deadline.create({
    data: {
      applicationId: byName["Stripe"],
      title: "Stripe HackerRank OA",
      type: "OA",
      dueAt: days(2),
      source: "manual",
    },
  });
  await prisma.deadline.create({
    data: {
      applicationId: byName["Halcyon Pay"],
      title: "Halcyon Pay take-home — settlement service",
      type: "TAKE_HOME",
      dueAt: days(4),
      source: "email:demo-halcyon",
      notes: "Auto-detected from email: Take-home for Senior Backend Engineer",
    },
  });
  await prisma.deadline.create({
    data: {
      applicationId: byName["Vercel"],
      title: "Vercel take-home submission",
      type: "TAKE_HOME",
      dueAt: days(-1),
      source: "manual",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: byName["Vercel"],
      type: "SYSTEM_DESIGN",
      scheduledAt: days(3),
      location: "Google Meet",
      withNames: ["Priya (EM)", "Dan (Staff Eng)"],
      prepNotes:
        "Review their build pipeline architecture; prep a distributed cache design.",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: byName["Render"],
      type: "RECRUITER_SCREEN",
      scheduledAt: days(1),
      location: "Zoom",
      withNames: ["Alicia Gomez"],
    },
  });
  await prisma.contact.create({
    data: {
      applicationId: byName["Render"],
      name: "Alicia Gomez",
      role: "RECRUITER",
      email: "alicia@render.example.com",
    },
  });
  await prisma.contact.create({
    data: {
      applicationId: byName["Halcyon Pay"],
      name: "Priya Nair",
      role: "REFERRAL",
      email: "priya@halcyonpay.example.com",
      notes: "Ex-colleague from Bluebird — referred me in.",
    },
  });

  // Inbox — pre-summarized so it looks real without connecting Gmail.
  const threads: {
    gmailThreadId: string;
    subject: string;
    company: string | null;
    role: string | null;
    category: string;
    summary: string;
    actionNeeded: boolean;
    actionNote: string | null;
    daysAgo: number;
    link?: string;
    from: { name: string; email: string };
    body: string;
  }[] = [
    {
      gmailThreadId: "demo-halcyon",
      subject: "Next steps — Senior Backend Engineer",
      company: "Halcyon Pay",
      role: "Senior Backend Engineer, Payments Platform",
      category: "oa_invite",
      summary:
        "Halcyon Pay wants Sam to complete a take-home for the Senior Backend Engineer role — build a small settlement service. Due within 5 days.",
      actionNeeded: true,
      actionNote: "Complete the settlement-service take-home by the end of the week.",
      daysAgo: 2,
      link: "Halcyon Pay",
      from: { name: "Halcyon Pay Recruiting", email: "talent@halcyonpay.example.com" },
      body: `Hi Sam,

Thanks for chatting with Priya's team. The next step is a take-home exercise:
build a minimal settlement service in Go that ingests transaction events and
produces a daily settlement report.

Please submit within 5 business days. We estimate it takes 3–4 hours.

Best,
Halcyon Pay Recruiting`,
    },
    {
      gmailThreadId: "demo-render",
      subject: "Render — recruiter screen scheduled",
      company: "Render",
      role: "Backend Engineer, Platform",
      category: "scheduling",
      summary:
        "Alicia at Render confirmed a 30-minute recruiter screen for tomorrow. No prep needed beyond the usual.",
      actionNeeded: false,
      actionNote: null,
      daysAgo: 1,
      link: "Render",
      from: { name: "Alicia Gomez", email: "alicia@render.example.com" },
      body: `Hi Sam,

Confirmed for tomorrow at 10:00 PT — 30 minutes over Zoom, link in the invite.
Looking forward to it.

Alicia`,
    },
    {
      gmailThreadId: "demo-segment",
      subject: "Update on your application",
      company: "Segment",
      role: "Backend Engineer",
      category: "rejection",
      summary:
        "Segment passed on Sam's application for the Backend Engineer role. Standard rejection, no feedback.",
      actionNeeded: false,
      actionNote: null,
      daysAgo: 5,
      link: "Segment",
      from: { name: "Segment Talent", email: "no-reply@segment.example.com" },
      body: `Hi Sam,

Thank you for your interest in the Backend Engineer role. After review, we've
decided not to move forward at this time. We appreciate the time you invested
and wish you the best in your search.

Segment Talent`,
    },
    {
      gmailThreadId: "demo-outreach",
      subject: "Backend role at Cadence — worth a chat?",
      company: "Cadence",
      role: "Senior Backend Engineer",
      category: "recruiter_outreach",
      summary:
        "A recruiter at Cadence reached out about a Senior Backend Engineer role — Go and Postgres, fully remote. Wants to set up a call.",
      actionNeeded: true,
      actionNote: "Reply to the Cadence recruiter to book an intro call (or pass).",
      daysAgo: 1,
      from: { name: "Marcus Lee", email: "marcus@cadence-talent.example.com" },
      body: `Hi Sam,

Came across your GitHub — the tracing work on the shipment service caught my eye.
I'm working with Cadence on a Senior Backend Engineer role: Go + Postgres, fully
remote, $190–230k. Would you be open to a quick call this week?

Marcus`,
    },
  ];

  for (const t of threads) {
    const at = days(-t.daysAgo);
    await prisma.emailThread.create({
      data: {
        gmailThreadId: t.gmailThreadId,
        subject: t.subject,
        lastMessageAt: at,
        summary: t.summary,
        category: t.category,
        guessedCompany: t.company,
        guessedRole: t.role,
        actionNeeded: t.actionNeeded,
        actionNote: t.actionNote,
        summarizedAt: at,
        applicationId: t.link ? byName[t.link] : null,
        messages: {
          create: [
            {
              gmailMsgId: `${t.gmailThreadId}-1`,
              direction: "INBOUND",
              fromName: t.from.name,
              fromEmail: t.from.email,
              toEmails: ["sam.carter.dev@example.com"],
              sentAt: at,
              snippet: t.body.slice(0, 140),
              bodyText: t.body,
            },
          ],
        },
      },
    });
  }

  // Job board — a few listings so the page isn't empty.
  await prisma.jobListing.createMany({
    data: [
      {
        source: "greenhouse",
        company: "Convex",
        title: "Backend Engineer",
        location: "Remote (US)",
        remote: true,
        url: "https://demo.example.com/convex/backend",
        description:
          "Build the sync engine and backend APIs. Go, PostgreSQL, distributed systems.",
        postedAt: days(-1),
      },
      {
        source: "lever",
        company: "Tigris",
        title: "Software Engineer, Storage",
        location: "Remote",
        remote: true,
        url: "https://demo.example.com/tigris/storage",
        description: "Object storage on the edge. Systems programming in Go and Rust.",
        postedAt: days(-2),
      },
      {
        source: "ashby",
        company: "Warp",
        title: "Backend Engineer",
        location: "New York / Remote",
        remote: true,
        url: "https://demo.example.com/warp/backend",
        description: "Backend for the terminal. Rust and Go, low-latency services.",
        postedAt: days(-3),
      },
    ],
    skipDuplicates: true,
  });

  // One pre-run ATS pass on a different app so the section isn't blank
  // before you run one live on Halcyon Pay.
  await prisma.matchScore.create({
    data: {
      applicationId: byName["Render"],
      resumeVersionId: backend.id,
      scoreBefore: 58,
      scoreAfter: 74,
      scoreRationale:
        "Heuristic estimate — ~60% keyword coverage, strong title match, clean formatting. Solid Go/Postgres fit; the delta matters more than the absolute number, and no tool replicates a specific ATS.",
      titleAlignment: "strong — résumé and target are both backend platform roles",
      autoPicked: true,
      pickReason:
        "The backend-focused résumé matches the Go/Postgres/infra requirements far better than the generic one.",
      matched: [
        "3+ years backend experience",
        "Go in production",
        "PostgreSQL schema design",
      ],
      hardRequirementsGaps: [
        "Kubernetes — not on the résumé",
        "gRPC — résumé shows REST only",
      ],
      niceToHaveGaps: ["Multi-tenant systems"],
      formattingFlags: [
        "No explicit 'X years of experience' phrase in the summary",
      ],
      uncloseableGaps: [
        "No Kubernetes experience (candidate facts say not to claim it)",
        "No gRPC in production — REST APIs only",
      ],
      rewrites: [
        {
          section: "Summary",
          before:
            "Backend engineer with 4 years building and operating Go services in production.",
          after:
            "Backend engineer with 4+ years designing, building and operating Go services and PostgreSQL data models in production, including on-call ownership.",
          keywordsFolded: ["4+ years", "Go services", "PostgreSQL", "on-call"],
        },
        {
          section: "Experience — Northwind Logistics",
          before:
            "Built and operate 4 Go microservices behind the shipment-tracking product",
          after:
            "Designed, built and operate 4 Go microservices (~1.2M req/day) behind the shipment-tracking product, owning schema design, migrations and on-call",
          keywordsFolded: ["Go microservices", "schema design", "migrations"],
        },
      ],
      verdict:
        "Worth applying — a genuine Go/Postgres fit at the right level. The honest gaps are Kubernetes and gRPC; lean on the systems and on-call experience and be upfront about picking those up.",
      model: "seed",
    },
  });

  console.log(
    "Demo seed complete. Persona: Sam Carter. Run 'AI extract' on the Halcyon Pay application to demo live.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
