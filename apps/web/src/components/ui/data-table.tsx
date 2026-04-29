import { cn } from "@/lib/utils";

export function DataTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-slate-800 bg-slate-900", className)}>
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-800/70">{children}</thead>;
}

export function DataTableRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-slate-800">{children}</tr>;
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
  return <th className={cn("px-3 py-2 text-left", className)}>{children}</th>;
}
