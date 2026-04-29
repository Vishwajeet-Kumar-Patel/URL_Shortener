import { cn } from "@/lib/utils";

export function AppCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("rounded-xl border border-slate-800 bg-slate-900/70 p-4", className)}>{children}</div>;
}
