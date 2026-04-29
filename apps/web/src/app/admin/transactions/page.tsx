"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/page-primitives";

type Row = {
  id: string;
  invoiceId?: string;
  provider: string;
  eventType: string;
  receivedAt: string;
  createdAt: string;
};

type Resp = { items: Row[]; pagination: { total: number } };

export default function AdminTransactionsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setError(null);
      try {
        const data = await apiRequest<Resp>("/admin/transactions?page=1&limit=100", { token });
        setRows(data.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load transactions");
      }
    };
    void run();
  }, [token]);

  return (
    <section className="space-y-5">
      <SectionHeader kicker="Payments" title="Transactions" description="Provider event stream from order verification and payment completion lifecycle." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Events" value={rows.length} />
        <MetricCard label="Razorpay events" value={rows.filter((r) => r.provider === "RAZORPAY").length} />
      </div>
      {error ? <p className="text-red-300">{error}</p> : null}
      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableHeadCell>Provider</DataTableHeadCell>
            <DataTableHeadCell>Event</DataTableHeadCell>
            <DataTableHeadCell>Invoice</DataTableHeadCell>
            <DataTableHeadCell>Received</DataTableHeadCell>
          </tr>
        </DataTableHead>
        <tbody>
          {rows.map((row) => (
            <DataTableRow key={row.id}>
              <DataTableCell>{row.provider}</DataTableCell>
              <DataTableCell className="text-white">{row.eventType}</DataTableCell>
              <DataTableCell className="text-slate-400">{row.invoiceId ?? "—"}</DataTableCell>
              <DataTableCell className="text-slate-400">{new Date(row.receivedAt).toLocaleString()}</DataTableCell>
            </DataTableRow>
          ))}
        </tbody>
      </DataTable>
    </section>
  );
}
