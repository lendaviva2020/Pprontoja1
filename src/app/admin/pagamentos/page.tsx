import { use } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ReleaseButton from "@/components/admin/ReleaseButton";
import RefundButton from "@/components/admin/RefundButton";

interface Props {
  searchParams: Promise<{ status?: string; page?: string; search?: string }>;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "captured", label: "Aguard. liberação" },
  { value: "released_to_professional", label: "Liberados" },
  { value: "refunded", label: "Estornados" },
  { value: "disputed", label: "Em disputa" },
  { value: "failed", label: "Falhos" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  captured: "bg-blue-100 text-blue-700",
  released_to_professional: "bg-green-100 text-green-700",
  refunded: "bg-orange-100 text-orange-700",
  partially_refunded: "bg-orange-50 text-orange-600",
  disputed: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-600",
  authorized: "bg-sky-100 text-sky-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  captured: "Aguard. liberação",
  authorized: "Autorizado",
  released_to_professional: "Liberado",
  refunded: "Estornado",
  partially_refunded: "Estorno parcial",
  disputed: "Em disputa",
  failed: "Falhou",
};

export default async function AdminPagamentosPage({ searchParams }: Props) {
  const resolved = use(searchParams);
  const { status, page: pageParam, search } = resolved;
  const page = parseInt(pageParam ?? "1");
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const supabase = createServiceClient();

  let query = supabase
    .from("payments")
    .select(`
      id, amount_cents, platform_fee_cents, professional_payout_cents,
      status, gateway, gateway_payment_id, created_at, captured_at, released_at,
      job_id, payer_id, payee_id, currency,
      refunded_amount_cents, failure_reason
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) query = query.eq("status", status);

  const { data: paymentsData, count } = await query;
  type PaymentRow = {
    id: string;
    amount_cents: number;
    platform_fee_cents: number;
    professional_payout_cents: number;
    status: string;
    gateway: string;
    gateway_payment_id: string | null;
    created_at: string;
    captured_at: string | null;
    released_at: string | null;
    job_id: string;
    payer_id: string;
    payee_id: string;
    currency: string;
    refunded_amount_cents: number | null;
    failure_reason: string | null;
  };
  const payments = (paymentsData ?? null) as PaymentRow[] | null;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  // Totais por status (resumo)
  const { data: summaryData } = await supabase
    .from("payments")
    .select("status, amount_cents, platform_fee_cents");

  type SummaryRow = { status: string; amount_cents: number; platform_fee_cents: number | null };
  const summary = (summaryData ?? []) as SummaryRow[];
  const grouped = summary.reduce<Record<string, { count: number; total: number; fees: number }>>((acc, p) => {
    if (!acc[p.status]) acc[p.status] = { count: 0, total: 0, fees: 0 };
    acc[p.status].count++;
    acc[p.status].total += p.amount_cents;
    acc[p.status].fees += p.platform_fee_cents ?? 0;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
        <p className="text-gray-500 mt-1">{count ?? 0} transações no total</p>
      </div>

      {/* Cards de resumo */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["captured", "released_to_professional", "refunded", "disputed"].map(s => (
          <Link
            key={s}
            href={`/admin/pagamentos?status=${s}`}
            className={cn(
              "card p-4 transition-all hover:shadow-md",
              status === s ? "ring-2 ring-brand-500" : ""
            )}
          >
            <p className="text-xl font-bold text-gray-900">{formatCurrency(grouped[s]?.total ?? 0)}</p>
            <p className="mt-1 text-xs text-gray-500">{grouped[s]?.count ?? 0}× {STATUS_LABELS[s]}</p>
            {grouped[s]?.fees > 0 && (
              <p className="text-xs text-brand-600 mt-0.5">Taxa: {formatCurrency(grouped[s].fees)}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(opt => (
          <Link
            key={opt.value}
            href={`/admin/pagamentos${opt.value ? `?status=${opt.value}` : ""}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              (status ?? "") === opt.value
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
            )}
          >
            {opt.label}
            {opt.value && grouped[opt.value] ? ` (${grouped[opt.value].count})` : ""}
          </Link>
        ))}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID / Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Taxa (10%)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Prof. recebe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Gateway ID</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments?.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pagamentos/${p.id}`} className="font-mono text-xs text-brand-600 hover:underline">
                      {p.id.slice(0, 8)}…
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600")}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    {p.failure_reason && (
                      <p className="mt-0.5 text-xs text-red-400 truncate max-w-[150px]" title={p.failure_reason}>
                        {p.failure_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(p.amount_cents)}
                    {(p.refunded_amount_cents ?? 0) > 0 && (
                      <p className="text-xs text-orange-500">-{formatCurrency(p.refunded_amount_cents ?? 0)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-brand-600 font-medium">
                    {formatCurrency(p.platform_fee_cents)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(p.professional_payout_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-400">
                      {p.gateway_payment_id?.slice(0, 16)}…
                    </span>
                    <p className="text-xs text-gray-400">{p.gateway}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {p.status === "captured" && (
                        <ReleaseButton paymentId={p.id} amount={p.professional_payout_cents} />
                      )}
                      {["captured", "released_to_professional", "authorized"].includes(p.status) && (
                        <RefundButton paymentId={p.id} maxAmount={p.amount_cents - (p.refunded_amount_cents ?? 0)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages} ({count} registros)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/pagamentos?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page - 1) })}`}
                  className="rounded border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50">
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/pagamentos?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page + 1) })}`}
                  className="rounded border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50">
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
