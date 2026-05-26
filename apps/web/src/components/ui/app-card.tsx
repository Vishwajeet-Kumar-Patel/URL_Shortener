import { cn } from "@/lib/utils";

export function AppCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-panelHover",
        className
      )}
    >
      {children}
    </div>
  );
}
