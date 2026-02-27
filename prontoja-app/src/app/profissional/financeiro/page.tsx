import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, Clock, ArrowUpRight, ExternalLink, AlertTriangle } from "lucide-react";

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  const [{ data: profile }, { data: payments }] = await Promise.all([
    service.from("profiles").select("metadata").eq("id", user.id).single(),
    service
      .from("payments")
      .select("id, amount_cents, platform_fee_cents, professional_payout_cents, status, created_at, released_at, gateway_payment_id, job_id")
      .eq("payee_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const meta = (profile?.metadata as Record<string, string>) || {};
  const hasStripe = !!meta.stripe_account_id;
  const stripeActive = meta.stripe_charges_enabled === "true" || (meta as Record<string, unknown>).stripe_charges_enabled === true;

  const released = payments?.filter(p => p.status === "released_to_professional") || [];
  const pending = payments?.filter(p => p.status === "captured") || [];
  const totalReleased = released.reduce((s, p) => s + (p.professional_payout_cents || 0), 0);
  const totalPending = pending.reduce((s, p) => s + (p.professional_payout_cents || 0), 0);
  const totalFees = (payments || []).reduce((s, p) => s + (p.platform_fee_cents || 0), 0);

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendente",
    captured: "Aguardando liberação",
    released_to_professional: "Liberado",
    refunded: "Estornado",
    failed: "Falhou",
    disputed: "Em disputa",
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    captured: "bg-blue-100 text-blue-700",
    released_to_professional: "bg-green-100 text-green-700",
    refunded: "bg-orange-100 text-orange-700",
    failed: "bg-red-100 text-red-600",
    disputed: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-500 mt-1">Seus ganhos e pagamentos</p>
      </div>

      {!hasStripe && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Conta de recebimento não configurada</p>
            <p className="text-sm text-amber-700 mt-0.5">Configure sua conta Stripe Connect para receber pagamentos.</p>
            <Link href="/profissional/stripe-connect" className="mt-2 inline-block text-sm font-medium text-amber-700 underline">
              Configurar agora →
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalReleased)}</p>
          <p className="text-sm text-gray-500">Total recebido</p>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
          <p className="text-sm text-gray-500">A receber</p>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
            <TrendingUp className="h-5 w-5 text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalReleased + totalPending)}</p>
          <p className="text-sm text-gray-500">Total bruto</p>
        </div>
      </div>

      {hasStripe && (
        <div className="mb-6 card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-2.5 w-2.5 rounded-full", stripeActive ? "bg-green-500" : "bg-amber-500")} />
            <span className="text-sm text-gray-700">
              Stripe Connect: <span className="font-medium">{stripeActive ? "Ativa" : "Pendente"}</span>
            </span>
          </div>
          <Link href="/profissional/stripe-connect" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
            Gerenciar <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Histórico de pagamentos</h2>
        </div>
        {!payments || payments.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum pagamento ainda.</p>
            <p className="text-sm text-gray-400 mt-1">Os pagamentos aparecerão aqui quando seus serviços forem concluídos.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600")}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(p.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(p.professional_payout_cents || 0)}</p>
                  <p className="text-xs text-gray-400">Taxa: {formatCurrency(p.platform_fee_cents || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
