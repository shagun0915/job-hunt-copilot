"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Mail,
  CalendarClock,
  FileText,
  Compass,
  Search,
  UserRound,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doSignOut } from "@/lib/actions/auth";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/inbox", label: "Inbox", icon: Mail },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/jobs", label: "Job board", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
}

export function Nav({
  viewerName,
  canSignOut,
}: {
  viewerName: string;
  canSignOut: boolean;
}) {
  const isActive = useActive();

  return (
    <nav className="flex flex-col gap-1">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 px-2 text-sm font-semibold"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <Sparkles className="h-4 w-4" />
        </span>
        Job Hunt Copilot
      </Link>

      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
            isActive(l.href, l.exact)
              ? "bg-surface-2 font-medium text-foreground"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <l.icon className="h-4 w-4 shrink-0" />
          {l.label}
        </Link>
      ))}

      <div className="mt-auto px-2.5 pt-6 text-xs text-muted">
        Signed in as{" "}
        <span className="font-medium text-foreground">{viewerName}</span>
        {canSignOut && (
          <form action={doSignOut} className="mt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        )}
      </div>
    </nav>
  );
}

export function MobileNav() {
  const isActive = useActive();

  return (
    <div className="mb-4 flex items-center gap-3 border-b border-border pb-3 md:hidden">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <Sparkles className="h-4 w-4" />
        </span>
      </Link>
      <div className="-mx-1 flex flex-1 gap-1 overflow-x-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
              isActive(l.href, l.exact)
                ? "bg-surface-2 font-medium text-foreground"
                : "text-muted hover:bg-surface-2",
            )}
          >
            <l.icon className="h-3.5 w-3.5 shrink-0" />
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
