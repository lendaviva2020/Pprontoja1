import { createServiceClient } from "@/lib/supabase/service";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, CreditCard, AlertTriangle, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  type PaymentSummaryRow = { amount_cents: number; platform_fee_cents: number | null; status: string };
  type DisputeRow = { id: string; status: string; amount_cents: number };
  type PendingReleaseRow = { id: string; amount_cents: number; professional_payout_cents: number; created_at: string; job_id: string; payee_id: string };
  type RecentPaymentRow = { id: string; amount_cents: number; platform_fee_cents: number | null; status: string; created_at: string; job_id: string; payer_id: string; payee_id: string };

  const [
    { data: paymentsData },
    { data: paymentsLastMonthData },
    { data: disputesData },
    { data: pendingReleasesData },
    { data: professionals },
    { data: recentPaymentsData },
  ] = await Promise.all([
    // Este mês
    supabase.from("payments")
      .select("amount_cents, platform_fee_cents, status")
      .gte("created_at", startOfMonth),
    // Mês passado
    supabase.from("payments")
      .select("amount_cents, platform_fee_cents, status")
      .gte("created_at", startOfLastMonth)
      .lt("created_at", endOfLastMonth),
    // Disputas abertas
    supabase.from("disputes").select("id, status, amount_cents").eq("status", "open"),
    // Pagamentos capturados aguardando liberação
    supabase.from("payments").select("id, amount_cents, professional_payout_cents, created_at, job_id, payee_id")
      .eq("status", "captured").order("created_at").limit(10),
    // Profissionais sem conta Stripe
    supabase.from("profiles").select("id").eq("user_status", "active"),
    // Últimos pagamentos
    supabase.from("payments")
      .select("id, amount_cents, platform_fee_cents, status, created_at, job_id, payer_id, payee_id")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const payments = (paymentsData ?? null) as PaymentSummaryRow[] | null;
  const paymentsLastMonth = (paymentsLastMonthData ?? null) as PaymentSummaryRow[] | null;
  const disputes = (disputesData ?? null) as DisputeRow[] | null;
  const pendingReleases = (pendingReleasesData ?? null) as PendingReleaseRow[] | null;
  const recentPayments = (recentPaymentsData ?? null) as RecentPaymentRow[] | null;

  const grossMRR = payments?.filter(p => p.status !== "refunded" && p.status !== "failed")
    .reduce((s, p) => s + p.amount_cents, 0) ?? 0;
  const netRevenue = payments?.filter(p => !["refunded", "failed"].includes(p.status))
    .reduce((s, p) => s + (p.platform_fee_cents ?? 0), 0) ?? 0;
  const lastMonthRevenue = paymentsLastMonth?.filter(p => !["refunded", "failed"].includes(p.status))
    .reduce((s, p) => s + (p.platform_fee_cents ?? 0), 0) ?? 0;
  const revenueGrowth = lastMonthRevenue > 0
    ? Math.round(((netRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;

  const capturedTotal = pendingReleases?.reduce((s, p) => s + p.professional_payout_cents, 0) ?? 0;
  const disputeAmount = disputes?.reduce((s, d) => s + d.amount_cents, 0) ?? 0;

  const STATUS_COLORS: Record<string, string> = {
    captured: "bg-blue-100 text-blue-700",
    released_to_professional: "bg-green-100 text-green-700",
    refunded: "bg-orange-100 text-orange-700",
    failed: "bg-red-100 text-red-600",
    disputed: "bg-purple-100 text-purple-700",
    pending: "bg-gray-100 text-gray-600",
  };

  const STATUS_LABELS: Record<string, string> = {
    captured: "Aguard. liberação",
    released_to_professional: "Liberado",
    refunded: "Estornado",
    failed: "Falhou",
    disputed: "Em disputa",
    pending: "Pendente",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Financeiro</h1>
        <p className="mt-1 text-gray-500">Visão geral de {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
      </div>

      {/* KPIs principais */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Receita líquida (mês)",
            value: formatCurrency(netRevenue),
            sub: revenueGrowth !== 0 ? `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}% vs mês anterior` : "—",
            up: revenueGrowth >= 0,
            icon: TrendingUp,
            color: "bg-brand-50 text-brand-600",
          },
          {
            label: "GMV bruto (mês)",
            value: formatCurrency(grossMRR),
            sub: `${payments?.length || 0} transações`,
            up: true,
            icon: CreditCard,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Aguardando liberação",
            value: formatCurrency(capturedTotal),
            sub: `${pendingReleases?.length || 0} pagamentos`,
            up: null,
            icon: ArrowUpRight,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Disputas abertas",
            value: disputes?.length?.toString() || "0",
            sub: formatCurrency(disputeAmount) + " em risco",
            up: false,
            icon: AlertTriangle,
            color: "bg-red-50 text-red-600",
          },
        ].map(card => (
          <div key={card.label} className="card p-5">
            <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", card.color)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
            {card.sub && (
              <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium",
                card.up === null ? "text-gray-400" :
                card.up ? "text-green-600" : "text-red-500")}>
                {card.up === true && <ArrowUpRight className="h-3 w-3" />}
                {card.up === false && <ArrowDownRight className="h-3 w-3" />}
                {card.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Últimas transações */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Últimas transações</h2>
            <Link href="/admin/pagamentos" className="text-sm text-brand-600 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayments?.map(p => (
              <Link
                key={p.id}
                href={`/admin/pagamentos/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">{p.id.slice(0, 8)}…</p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[p.status])}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(p.amount_cents)}</p>
                    <p className="text-xs text-brand-600">+{formatCurrency(p.platform_fee_cents ?? 0)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="space-y-4">
          {/* Pagamentos para liberar */}
          <div className="card">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Liberações pendentes{" "}
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {pendingReleases?.length || 0}
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingReleases?.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-gray-500 font-mono">{p.id.slice(0, 8)}…</span>
                  <span className="text-sm font-bold text-brand-600">
                    {formatCurrency(p.professional_payout_cents)}
                  </span>
                </div>
              ))}
            </div>
            {(pendingReleases?.length ?? 0) > 0 && (
              <div className="px-5 py-3">
                <Link href="/admin/pagamentos?status=captured" className="text-sm text-brand-600 hover:underline">
                  Ver e liberar todos →
                </Link>
              </div>
            )}
          </div>

          {/* Disputas abertas */}
          {(disputes?.length ?? 0) > 0 && (
            <div className="card border-l-4 border-red-400">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h2 className="font-semibold text-red-700">Disputas urgentes</h2>
                </div>
                <p className="text-2xl font-bold text-red-600">{disputes?.length}</p>
                <p className="text-sm text-red-500">{formatCurrency(disputeAmount)} em risco</p>
                <Link href="/admin/disputas" className="mt-3 block text-sm font-medium text-red-600 hover:underline">
                  Resolver disputas →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
