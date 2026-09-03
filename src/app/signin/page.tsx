import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { signIn } from "@/auth";
import { authConfigured, enforceAuth } from "@/lib/env";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Sign in · Job Hunt Copilot" };

export default async function SignInPage() {
  // Local mode has no sign-in - send to the app. On a deployed host that is
  // somehow unconfigured, render the page rather than bouncing to "/" (which
  // would redirect straight back here).
  if (!authConfigured && !enforceAuth) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-fg">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold">AI Job Hunt Copilot</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in with the Google account you use for your job search — this also
          grants read-only Gmail access for inbox sync.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-6"
        >
          <button className={buttonClass("primary", "md", "w-full")}>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
