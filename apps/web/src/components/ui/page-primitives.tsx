import { AppCard } from "@/components/ui/app-card";

export function SectionHeader({
  kicker,
  title,
  description
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      {kicker ? <p className="text-xs uppercase tracking-widest text-blue-600">{kicker}</p> : null}
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      {description ? <p className="max-w-3xl text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <AppCard className="border-dashed text-center">
      <p className="text-base font-medium text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </AppCard>
  );
}
