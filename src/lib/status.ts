import type { ApplicationStatus } from "@prisma/client";

type StatusMeta = {
  label: string;
  /** kanban column order; live (active) pipeline first, terminal states last */
  order: number;
  /** tailwind classes for a pill/badge */
  badge: string;
  /** true = application is still in play */
  active: boolean;
};

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  SAVED: {
    label: "Saved",
    order: 0,
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    active: true,
  },
  APPLIED: {
    label: "Applied",
    order: 1,
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    active: true,
  },
  OA: {
    label: "OA",
    order: 2,
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    active: true,
  },
  PHONE_SCREEN: {
    label: "Phone screen",
    order: 3,
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    active: true,
  },
  ONSITE: {
    label: "Onsite",
    order: 4,
    badge:
      "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
    active: true,
  },
  OFFER: {
    label: "Offer",
    order: 5,
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    active: true,
  },
  REJECTED: {
    label: "Rejected",
    order: 6,
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    active: false,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    order: 7,
    badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    active: false,
  },
  GHOSTED: {
    label: "Ghosted",
    order: 8,
    badge: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
    active: false,
  },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as ApplicationStatus[];

export const PIPELINE_STATUSES: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "OA",
  "PHONE_SCREEN",
  "ONSITE",
  "OFFER",
];

export function statusLabel(s: ApplicationStatus) {
  return STATUS_META[s].label;
}
