import { PageHeader } from "@/components/ui";
import { aiConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ApplicationForm } from "./application-form";

export const metadata = { title: "New application · Job Hunt Copilot" };

export default async function NewApplicationPage() {
  const resumes = await prisma.resumeVersion.findMany({
    select: { id: true, label: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New application"
        description="Log a role you've applied to or want to track."
      />
      <ApplicationForm aiEnabled={aiConfigured} resumes={resumes} />
    </div>
  );
}
