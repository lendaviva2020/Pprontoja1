import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react";

export default async function AdminProfissionaisPage() {
  const supabase = createServiceClient();

  const { data: professionals } = await supabase
    .from("profiles")
    .select(`
      id, full_name, email, rating_avg, rating_count,
      is_available, user_status, metadata, created_at,
      user_roles!inner ( role )
    `)
    .eq("user_roles.role", "professional")
    .order("created_at", { ascending: false })
    .limit(100);

  // Buscar totais pagos por profissional
  const { data: paymentTotals } = await supabase
    .from("payments")
    .select("payee_id, professional_payout_cents, status")
    .in("status", ["released_to_professional", "captured"]);

  const paymentMap = (paymentTotals ?? []).reduce<Record<string, { released: number; pending: number }>>((acc, p) => {
    if (!acc[p.payee_id]) acc[p.payee_id] = { released: 0, pending: 0 };
    if (p.status === "released_to_professional") acc[p.payee_id].released += p.professional_payout_cents;
    else acc[p.payee_id].pending += p.professional_payout_cents;
    return acc;
  }, {});

  function getStripeStatus(meta: Record<string, any>) {
    if (!meta?.stripe_account_id) return "not_started";
    if (meta?.stripe_charges_enabled && meta?.stripe_payouts_enabled) return "active";
    if (meta?.stripe_details_submitted) return "pending";
    return "incomplete";
  }

  const STRIPE_STATUS = {
    active: { label: "Conta ativa", color: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" /> },
    pending: { label: "Em verificação", color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
    incomplete: { label: "Incompleto", color: "bg-orange-100 text-orange-600", icon: <AlertTriangle className="h-3 w-3" /> },
    not_started: { label: "Não cadastrado", color: "bg-red-100 text-red-600", icon: <AlertTriangle className="h-3 w-3" /> },
  };

  const totals = {
    active: professionals?.filter(p => getStripeStatus((p.metadata as any) || {}) === "active").length ?? 0,
    pending: professionals?.filter(p => getStripeStatus((p.metadata as any) || {}) === "pending").length ?? 0,
    not_started: professionals?.filter(p => getStripeStatus((p.metadata as any) || {}) === "not_started").length ?? 0,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
        <p className="text-gray-500 mt-1">{professionals?.length} profissionais cadastrados</p>
      </div>

      {/* Status geral */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card p-4 bg-green-50">
          <p className="text-2xl font-bold text-green-600">{totals.active}</p>
          <p className="text-sm text-gray-600">Com conta ativa</p>
        </div>
        <div className="card p-4 bg-amber-50">
          <p className="text-2xl font-bold text-amber-600">{totals.pending}</p>
          <p className="text-sm text-gray-600">Em verificação</p>
        </div>
        <div className="card p-4 bg-red-50">
          <p className="text-2xl font-bold text-red-600">{totals.not_started}</p>
          <p className="text-sm text-gray-600">Sem conta Stripe</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Profissional</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Stripe Connect</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Já recebeu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">A receber</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Rating</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {professionals?.map(prof => {
                const meta = (prof.metadata as Record<string, any>) || {};
                const stripeStatus = getStripeStatus(meta);
                const statusConfig = STRIPE_STATUS[stripeStatus as keyof typeof STRIPE_STATUS];
                const payments = paymentMap[prof.id] || { released: 0, pending: 0 };
                const initials = (prof.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <tr key={prof.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{prof.full_name}</p>
                          <p className="text-xs text-gray-400">{prof.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusConfig.color)}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                        {meta.stripe_account_id && (
                          <a
                            href={`https://dashboard.stripe.com/connect/accounts/${meta.stripe_account_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-brand-500"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {meta.stripe_account_id && (
                        <p className="mt-0.5 font-mono text-xs text-gray-400">{meta.stripe_account_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatCurrency(payments.released)}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-600">
                      {formatCurrency(payments.pending)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {prof.rating_avg ? (
                        <span className="font-medium text-gray-800">
                          ⭐ {Number(prof.rating_avg).toFixed(1)}
                          <span className="text-xs text-gray-400 ml-1">({prof.rating_count})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sem avaliações</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        prof.user_status === "active" ? "bg-green-100 text-green-700" :
                        prof.user_status === "suspended" ? "bg-red-100 text-red-600" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {prof.user_status === "active" ? "Ativo" :
                         prof.user_status === "suspended" ? "Suspenso" : prof.user_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
