import { prisma } from "@/lib/prisma";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { setDefaultResume, deleteResumeVersion } from "@/lib/actions/resumes";
import { fmtDate } from "@/lib/utils";
import { ResumeForm } from "./resume-form";

export const metadata = { title: "Resumes · Job Hunt Copilot" };

export default async function ResumesPage() {
  const resumes = await prisma.resumeVersion.findMany({
    include: { _count: { select: { matchScores: true } } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Resumes"
        description="Keep every tailored version; score each against a role from its page."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {resumes.length === 0 ? (
            <EmptyState
              title="No resume versions"
              description="Upload your base resume to enable match scoring."
            />
          ) : (
            resumes.map((r) => (
              <Card key={r.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {r.label}
                        {r.isDefault && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary dark:text-indigo-300">
                            default
                          </span>
                        )}
                        {r.kind !== "OTHER" && (
                          <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                            {r.kind.toLowerCase()}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {r.specialtyNote ? `${r.specialtyNote} · ` : ""}
                        {r.fileName ?? "pasted text"} · added {fmtDate(r.createdAt)}{" "}
                        · {r.content.length.toLocaleString()} chars ·{" "}
                        {r._count.matchScores} ATS pass
                        {r._count.matchScores === 1 ? "" : "es"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!r.isDefault && (
                        <form action={setDefaultResume}>
                          <input type="hidden" name="id" value={r.id} />
                          <SubmitButton size="sm" variant="secondary" pendingText="…">
                            Make default
                          </SubmitButton>
                        </form>
                      )}
                      <form action={deleteResumeVersion}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton size="sm" variant="ghost" pendingText="…">
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
                      Preview text
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-xs">
                      {r.content.slice(0, 4000)}
                    </pre>
                  </details>
                </CardBody>
              </Card>
            ))
          )}
        </div>

        <ResumeForm />
      </div>
    </div>
  );
}
