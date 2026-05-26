import { cn } from "@/lib/utils";

export function DataTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-panel", className)}>
      <table className="min-w-full text-sm text-slate-700">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50 text-slate-600">{children}</thead>;
}

export function DataTableRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-slate-200 transition hover:bg-blue-50/70">{children}</tr>;
}

export function DataTableCell({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}

export function DataTableHeadCell({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide", className)}>{children}</th>;
}
