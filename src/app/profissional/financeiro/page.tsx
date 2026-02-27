import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  DollarSign, TrendingUp, Clock, CheckCircle,
  AlertCircle, ExternalLink, ArrowUpRight, Wallet,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Aguardando", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
  captured: { label: "Em custódia", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  released_to_professional: { label: "Liberado", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  disputed: { label: "Em disputa", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
  refunded: { label: "Reembolsado", color: "bg-gray-50 text-gray-500 border-gray-200", icon: AlertCircle },
};

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, display_name, metadata")
    .eq("id", user.id)
    .single();

  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      jobs:job_id (title)
    `)
    .eq("payee_id", user.id)
    .order("created_at", { ascending: false });

  const stripeAccountId = (profile?.metadata as Record<string, unknown>)?.stripe_account_id as string | undefined;

  const totalLiberated = payments
    ?.filter((p) => p.status === "released_to_professional")
    .reduce((s, p) => s + (p.professional_payout_cents || 0), 0) ?? 0;

  const totalCustodia = payments
    ?.filter((p) => p.status === "captured")
    .reduce((s, p) => s + (p.professional_payout_cents || 0), 0) ?? 0;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ganhosMes = payments
    ?.filter((p) => p.status === "released_to_professional" && new Date(p.created_at) >= firstOfMonth)
    .reduce((s, p) => s + (p.professional_payout_cents || 0), 0) ?? 0;

  const totalTaxa = payments
    ?.filter((p) => ["released_to_professional", "captured"].includes(p.status))
    .reduce((s, p) => s + (p.platform_fee_cents || 0), 0) ?? 0;

  const stats = [
    { label: "Total liberado", value: formatCurrency(totalLiberated), icon: CheckCircle, color: "text-green-600 bg-green-50" },
    { label: "Ganhos este mês", value: formatCurrency(ganhosMes), icon: TrendingUp, color: "text-brand-600 bg-brand-50" },
    { label: "Em custódia", value: formatCurrency(totalCustodia), icon: Clock, color: "text-blue-600 bg-blue-50" },
    { label: "Taxa da plataforma", value: formatCurrency(totalTaxa), icon: DollarSign, color: "text-gray-500 bg-gray-100" },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="mt-1 text-gray-500">Seus ganhos e histórico de pagamentos</p>
        </div>
        {stripeAccountId && (
          <a
            href="https://connect.stripe.com/express_login"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
            Painel Stripe
          </a>
        )}
      </div>

      {!stripeAccountId && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Conta bancária não conectada</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Conecte sua conta Stripe para receber seus pagamentos.
            </p>
            <Link
              href="/profissional/stripe-connect"
              className="mt-2 inline-block text-sm font-medium text-amber-700 underline"
            >
              Conectar agora →
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 card p-4 bg-brand-50 border-brand-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-800">Modelo de repasse</p>
            <p className="text-xs text-brand-600 mt-0.5">
              Você recebe <strong>90%</strong> do valor de cada serviço. A plataforma retém <strong>10%</strong>.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="rounded-lg bg-white px-3 py-2 text-center border border-brand-200">
              <div className="text-lg font-bold text-brand-700">90%</div>
              <div className="text-xs text-brand-600">Você</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-center border border-gray-200">
              <div className="text-lg font-bold text-gray-400">10%</div>
              <div className="text-xs text-gray-400">Plataforma</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Histórico de pagamentos</h2>
        </div>

        {!payments?.length ? (
          <div className="py-20 text-center">
            <Wallet className="mx-auto h-12 w-12 text-gray-200 mb-4" />
            <p className="font-medium text-gray-500">Nenhum pagamento ainda</p>
            <p className="text-sm text-gray-400 mt-1">Seus ganhos aparecerão aqui ao concluir serviços</p>
            <Link href="/profissional/oportunidades" className="btn-primary mt-4 inline-flex text-sm">
              Ver oportunidades
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map((payment) => {
              const cfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const jobData = (payment as { jobs?: { title?: string } | { title?: string }[] }).jobs;
              const job = Array.isArray(jobData) ? jobData[0] : jobData;
              const title = job?.title ?? "Serviço";
              return (
                <div key={payment.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border", cfg.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{title}</p>
                    <p className="text-xs text-gray-400">{formatDate(payment.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(payment.professional_payout_cents ?? 0)}
                    </p>
                    <p className="text-xs text-gray-400">
                      de {formatCurrency(payment.amount_cents ?? 0)}
                    </p>
                  </div>
                  <span className={cn("hidden sm:inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0", cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {stripeAccountId && (
        <div className="mt-6 card p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">Gerenciar conta bancária</p>
            <p className="text-sm text-gray-500 mt-0.5">Atualize dados bancários e acompanhe saques no Stripe</p>
          </div>
          <a
            href="https://connect.stripe.com/express_login"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
          >
            Acessar Stripe <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
