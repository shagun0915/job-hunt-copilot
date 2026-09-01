import type { ApplicationStatus } from "@prisma/client";
import { Badge } from "@/components/ui";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return <Badge className={cn(meta.badge, className)}>{meta.label}</Badge>;
}
