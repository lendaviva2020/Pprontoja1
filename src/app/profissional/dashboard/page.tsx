import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency, formatDate, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DollarSign, FileText, CheckCircle, Star, AlertTriangle } from "lucide-react";

export default async function ProfissionalDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: myJobs }, { data: proposals }, { data: earnings }] = await Promise.all([
    supabase.from("profiles").select("full_name, display_name, rating_avg, rating_count, onboarding_completed, metadata").eq("id", user!.id).single(),
    supabase.from("jobs").select("id, title, status, agreed_price_cents, address_city, created_at").eq("professional_id", user!.id).order("updated_at", { ascending: false }).limit(5),
    supabase.from("proposals").select("id, status").eq("professional_id", user!.id),
    supabase.from("payments").select("professional_payout_cents, status").eq("payee_id", user!.id),
  ]);

  const pendingProposals = proposals?.filter(p => p.status === "pending").length || 0;
  const acceptedProposals = proposals?.filter(p => p.status === "accepted").length || 0;
  const totalEarned = earnings?.filter(e => e.status === "released_to_professional")
    .reduce((sum, e) => sum + (e.professional_payout_cents || 0), 0) || 0;
  const pendingRelease = earnings?.filter(e => e.status === "captured")
    .reduce((sum, e) => sum + (e.professional_payout_cents || 0), 0) || 0;

  const firstName = (profile?.display_name || profile?.full_name || "").split(" ")[0];
  const hasStripeAccount = !!(profile?.metadata as any)?.stripe_account_id;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Olá, {firstName}! 👷</h1>
        <p className="mt-1 text-gray-500">Sua área de trabalho</p>
      </div>

      {/* Alerta Stripe Connect */}
      {!hasStripeAccount && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Configure seu recebimento</p>
            <p className="text-sm text-amber-700 mt-0.5">Conecte sua conta bancária para receber pagamentos pelos serviços.</p>
            <Link href="/profissional/stripe-connect" className="mt-2 inline-block text-sm font-medium text-amber-700 underline">
              Configurar agora →
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total recebido", value: formatCurrency(totalEarned), icon: DollarSign, color: "text-green-600 bg-green-50" },
          { label: "A receber", value: formatCurrency(pendingRelease), icon: DollarSign, color: "text-brand-600 bg-brand-50" },
          { label: "Propostas ativas", value: pendingProposals, icon: FileText, color: "text-blue-600 bg-blue-50" },
          { label: "Serviços aceitos", value: acceptedProposals, icon: CheckCircle, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Rating */}
      {profile?.rating_avg && (
        <div className="mb-6 card p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50">
            <Star className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{Number(profile.rating_avg).toFixed(1)}</p>
            <p className="text-sm text-gray-500">{profile.rating_count} avaliações</p>
          </div>
        </div>
      )}

      {/* Jobs recentes */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Serviços em andamento</h2>
          <Link href="/profissional/jobs" className="text-sm text-brand-600 hover:underline">Ver todos</Link>
        </div>

        {!myJobs || myJobs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum serviço ainda.</p>
            <Link href="/profissional/oportunidades" className="btn-primary mt-3 inline-flex text-sm">
              Ver oportunidades
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {myJobs.map(job => (
              <Link key={job.id} href={`/profissional/jobs/${job.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{job.title}</p>
                  <p className="text-sm text-gray-500">{job.address_city} · {formatDate(job.created_at)}</p>
                </div>
                <div className="ml-4 text-right">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", JOB_STATUS_COLORS[job.status])}>
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                  {job.agreed_price_cents && (
                    <p className="mt-1 text-sm font-semibold text-brand-600">{formatCurrency(job.agreed_price_cents)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
