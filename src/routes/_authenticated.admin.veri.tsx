import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TABLES, adminTableCounts, adminTableRows } from "@/lib/admin-data.functions";
import { Database } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/veri")({
  component: DataViewer,
  head: () => ({ meta: [{ title: "Veritabanı — Panel" }] }),
});

function DataViewer() {
  const cntFn = useServerFn(adminTableCounts);
  const rowsFn = useServerFn(adminTableRows);
  const [table, setTable] = useState<string>("blog_posts");

  const { data: counts } = useQuery({
    queryKey: ["admin-table-counts"],
    queryFn: () => cntFn(),
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-table-rows", table],
    queryFn: () => rowsFn({ data: { table, limit: 100 } }),
  });

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="size-6" /> Veritabanı Görüntüleyici
        </h1>
        <p className="text-sm text-muted-foreground">Salt okunur. Son 100 kayıt gösterilir. Silme/düzenleme ilgili yönetim sayfasından yapılır.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABLES.map((t) => (
          <button
            key={t}
            onClick={() => setTable(t)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              table === t ? "bg-brand text-white border-brand" : "hover:bg-muted"
            }`}
          >
            {t}
            {counts?.[t] !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">({counts[t]})</span>
            )}
          </button>
        ))}
      </div>

      <div className="border rounded-xl overflow-auto bg-card max-h-[70vh]">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Kayıt yok.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-1.5 whitespace-nowrap max-w-[280px] truncate" title={formatCell(row[c])}>
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
