import { PageHeader } from "@/components/ui";
import { aiConfigured } from "@/lib/env";
import { ApplicationForm } from "./application-form";

export const metadata = { title: "New application · Job Hunt Copilot" };

export default function NewApplicationPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New application"
        description="Log a role you've applied to or want to track."
      />
      <ApplicationForm aiEnabled={aiConfigured} />
    </div>
  );
}
