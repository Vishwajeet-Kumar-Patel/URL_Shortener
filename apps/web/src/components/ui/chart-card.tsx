import { AppCard } from "@/components/ui/app-card";

export function ChartCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AppCard className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="min-h-44">{children}</div>
    </AppCard>
  );
}
