import { PrismaClient, type ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

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

  const seed: {
    company: string;
    role: string;
    status: ApplicationStatus;
    location?: string;
    seniority?: string;
    source?: string;
    salaryMin?: number;
    salaryMax?: number;
    appliedDaysAgo?: number;
    jd?: {
      summary: string;
      requirements: string[];
      niceToHaves: string[];
      techStack: string[];
      redFlags: string[];
    };
  }[] = [
    {
      company: "Stripe",
      role: "Software Engineer, Payments",
      status: "OA",
      location: "Remote · US",
      seniority: "Mid",
      source: "Referral",
      salaryMin: 155000,
      salaryMax: 205000,
      appliedDaysAgo: 12,
      jd: {
        summary:
          "Build and operate the APIs behind Stripe's core payments flow, working across services that move billions of dollars daily.",
        requirements: [
          "3+ years building backend services in production",
          "Strong with a typed language (Go, Java, or TypeScript)",
          "Experience with distributed systems and databases",
        ],
        niceToHaves: ["Payments or fintech background", "Ruby experience"],
        techStack: ["Ruby", "Go", "MongoDB", "Kafka", "AWS"],
        redFlags: ["Salary band spans $50k with no leveling detail"],
      },
    },
    {
      company: "Linear",
      role: "Product Engineer",
      status: "PHONE_SCREEN",
      location: "Remote (global)",
      seniority: "Senior",
      source: "Company site",
      salaryMin: 170000,
      salaryMax: 210000,
      appliedDaysAgo: 20,
      jd: {
        summary:
          "Own features end-to-end across Linear's desktop and web app with a small, design-driven engineering team.",
        requirements: [
          "5+ years shipping product-facing web software",
          "Deep React and TypeScript expertise",
          "Comfort owning features without heavy process",
        ],
        niceToHaves: ["GraphQL", "Local-first / sync engine experience"],
        techStack: ["React", "TypeScript", "GraphQL", "Node.js", "Postgres"],
        redFlags: [],
      },
    },
    {
      company: "Ramp",
      role: "Backend Engineer",
      status: "APPLIED",
      location: "New York, NY",
      seniority: "Mid",
      source: "LinkedIn",
      appliedDaysAgo: 9,
    },
    {
      company: "Vercel",
      role: "Software Engineer, Build Infra",
      status: "ONSITE",
      location: "Remote · US",
      seniority: "Senior",
      source: "Recruiter outreach",
      salaryMin: 180000,
      salaryMax: 240000,
      appliedDaysAgo: 30,
      jd: {
        summary:
          "Work on the build and deployment pipeline that powers millions of Next.js deployments.",
        requirements: [
          "Experience with build systems or CI/CD at scale",
          "Systems programming (Rust, Go, or C++)",
          "Strong debugging skills in distributed environments",
        ],
        niceToHaves: ["Turborepo / monorepo tooling", "Open-source contributions"],
        techStack: ["Rust", "TypeScript", "Turbopack", "Kubernetes"],
        redFlags: ["Take-home is listed as 6–8 hours, unpaid"],
      },
    },
    {
      company: "Notion",
      role: "Fullstack Engineer",
      status: "REJECTED",
      location: "San Francisco, CA",
      seniority: "Mid",
      source: "LinkedIn",
      appliedDaysAgo: 40,
    },
    {
      company: "Anthropic",
      role: "Software Engineer, Product",
      status: "APPLIED",
      location: "Remote · US",
      seniority: "Mid",
      source: "Company site",
      appliedDaysAgo: 6,
    },
    {
      company: "Figma",
      role: "Frontend Engineer",
      status: "SAVED",
      location: "Remote · US",
      seniority: "Mid",
      source: "Job board",
    },
    {
      company: "Retool",
      role: "Software Engineer",
      status: "GHOSTED",
      location: "San Francisco, CA",
      source: "LinkedIn",
      appliedDaysAgo: 34,
    },
  ];

  for (const s of seed) {
    const company = await prisma.company.create({ data: { name: s.company } });
    const appliedAt =
      s.status === "SAVED" ? null : daysFromNow(-(s.appliedDaysAgo ?? 5));

    await prisma.application.create({
      data: {
        companyId: company.id,
        role: s.role,
        status: s.status,
        location: s.location,
        seniority: s.seniority,
        source: s.source,
        salaryMin: s.salaryMin,
        salaryMax: s.salaryMax,
        appliedAt,
        createdAt: appliedAt ?? new Date(),
        updatedAt:
          s.status === "APPLIED" || s.status === "GHOSTED"
            ? daysFromNow(-(s.appliedDaysAgo ?? 10))
            : daysFromNow(-2),
        jdSummary: s.jd?.summary,
        jdRequirements: s.jd?.requirements ?? [],
        jdNiceToHaves: s.jd?.niceToHaves ?? [],
        jdTechStack: s.jd?.techStack ?? [],
        jdRedFlags: s.jd?.redFlags ?? [],
        jdExtractedAt: s.jd ? daysFromNow(-(s.appliedDaysAgo ?? 5)) : null,
        jdExtractModel: s.jd ? "seed" : null,
        statusEvents: {
          create:
            s.status === "SAVED"
              ? [{ to: "SAVED" as ApplicationStatus, createdAt: new Date() }]
              : [
                  { to: "APPLIED" as ApplicationStatus, createdAt: appliedAt ?? new Date() },
                  ...(s.status !== "APPLIED"
                    ? [
                        {
                          from: "APPLIED" as ApplicationStatus,
                          to: s.status,
                          createdAt: daysFromNow(-2),
                        },
                      ]
                    : []),
                ],
        },
      },
    });
  }

  // Deadlines
  const stripe = await prisma.application.findFirst({
    where: { company: { name: "Stripe" } },
  });
  const vercel = await prisma.application.findFirst({
    where: { company: { name: "Vercel" } },
  });
  if (stripe) {
    await prisma.deadline.create({
      data: {
        applicationId: stripe.id,
        title: "Stripe HackerRank OA",
        type: "OA",
        dueAt: daysFromNow(2),
        source: "manual",
      },
    });
  }
  if (vercel) {
    await prisma.deadline.create({
      data: {
        applicationId: vercel.id,
        title: "Vercel take-home submission",
        type: "TAKE_HOME",
        dueAt: daysFromNow(-1),
        source: "manual",
      },
    });
    await prisma.interview.create({
      data: {
        applicationId: vercel.id,
        type: "SYSTEM_DESIGN",
        scheduledAt: daysFromNow(3),
        location: "Google Meet",
        withNames: ["Priya (EM)", "Dan (Staff Eng)"],
        prepNotes: "Review their edge network architecture, prep a CDN cache design.",
      },
    });
  }

  const linear = await prisma.application.findFirst({
    where: { company: { name: "Linear" } },
  });
  if (linear) {
    await prisma.contact.create({
      data: {
        applicationId: linear.id,
        name: "Jordan Lee",
        role: "RECRUITER",
        email: "jordan@linear.app",
      },
    });
    await prisma.interview.create({
      data: {
        applicationId: linear.id,
        type: "RECRUITER_SCREEN",
        scheduledAt: daysFromNow(1),
        location: "Zoom",
        withNames: ["Jordan Lee"],
      },
    });
  }

  await prisma.candidateProfile.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      fullName: "Shagun Yadav",
      headline: "Software Engineer — C#/.NET, Azure, Power Platform",
      location: "Bengaluru, India",
      availability: "Immediately available",
      statusNote:
        "Left Visa on 29 Jul 2026 — role eliminated in a company-wide restructuring, not performance-related. Refer to Visa in the past tense; never imply I'm still employed there. Fine to mention immediate availability. ~3 years total experience (since Jun 2023); AI / agentic work is recent (2025–2026), not multi-year.",
      doNotClaim: [
        "TypeScript",
        "Go",
        "Java",
        "Rust",
        "Kubernetes",
        "AWS",
        "gRPC",
        "Power BI",
        "SharePoint",
        "Power Fx",
      ],
    },
  });

  // Demo résumé versions — replace the content with your real résumés.
  await prisma.resumeVersion.create({
    data: {
      label: "Dynamics 365",
      kind: "SPECIALIZED",
      specialtyNote: "Dynamics 365 CE / CRM, Power Platform, plugin development",
      isDefault: true,
      fileName: "resume-dynamics365.txt",
      content: `SHAGUN YADAV — Dynamics 365 CE / Power Platform Developer
Bengaluru, India · Immediately available
[REPLACE THIS TEMPLATE WITH YOUR REAL SPECIALIZED RÉSUMÉ]

EXPERIENCE
Senior Software Engineer, Visa (Oct 2025 – Aug 2025)   [dates per your real resume]
- Built Dynamics 365 CE customizations: plugins, custom workflow activities, and model-driven app configuration
- Delivered Power Automate flows and canvas apps for internal business teams
- Hands-on with Microsoft Copilot Studio and AI Builder for agentic automation

Software Engineer, Visa (Jun 2023 – Sep 2025)
- Dynamics 365 plugin development in C#/.NET against Dataverse
- Workflow automation and integrations via Azure Functions and REST APIs

SKILLS
Dynamics 365 CE/CRM, Dataverse/CDS, Power Apps (canvas & model-driven), Power Automate,
Plugin development, C#/.NET, JavaScript, Azure Functions, Microsoft Copilot Studio, AI Builder,
Solution management (managed/unmanaged), Agile/Scrum

EDUCATION
B.Tech, Computer Science`,
    },
  });

  await prisma.resumeVersion.create({
    data: {
      label: "Generic SWE",
      kind: "GENERIC",
      specialtyNote: "Broad software engineering — .NET, cloud, integrations",
      fileName: "resume-generic.txt",
      content: `SHAGUN YADAV — Software Engineer
Bengaluru, India · Immediately available
[REPLACE THIS TEMPLATE WITH YOUR REAL GENERIC RÉSUMÉ]

EXPERIENCE
Senior Software Engineer, Visa (Jun 2023 – Aug 2025)
- Designed and shipped backend services and integrations in C#/.NET on Azure
- Automated business processes and built internal tools used across teams
- Recent work on AI/agentic features using Microsoft Copilot Studio and AI Builder

SKILLS
C#/.NET, JavaScript, Azure (Functions, Logic Apps), REST APIs, SQL / Dataverse,
Power Platform, CI/CD, Agile/Scrum

EDUCATION
B.Tech, Computer Science`,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
