import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, ClipboardList, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function ClienteDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: jobs }, { data: stats }] = await Promise.all([
    supabase.from("profiles").select("full_name, display_name").eq("id", user!.id).single(),
    supabase.from("jobs")
      .select("id, title, status, agreed_price_cents, budget_max_cents, address_city, created_at, professional_id")
      .eq("client_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("jobs")
      .select("status")
      .eq("client_id", user!.id),
  ]);

  const totalJobs = stats?.length || 0;
  const activeJobs = stats?.filter(j => ["open", "matching", "proposal_received", "accepted", "in_progress"].includes(j.status)).length || 0;
  const completedJobs = stats?.filter(j => j.status === "completed").length || 0;

  const firstName = (profile?.display_name || profile?.full_name || "").split(" ")[0];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {firstName}! 👋</h1>
          <p className="mt-1 text-gray-500">Gerencie seus pedidos de serviço</p>
        </div>
        <Link href="/cliente/jobs/novo" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Solicitar serviço</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: "Total de pedidos", value: totalJobs, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
          { label: "Em andamento", value: activeJobs, icon: Clock, color: "text-brand-600 bg-brand-50" },
          { label: "Concluídos", value: completedJobs, icon: CheckCircle, color: "text-green-600 bg-green-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Jobs recentes */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Pedidos recentes</h2>
          <Link href="/cliente/jobs" className="text-sm text-brand-600 hover:underline">Ver todos</Link>
        </div>

        {!jobs || jobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">Nenhum pedido ainda</p>
            <p className="mt-1 text-sm text-gray-400">Solicite seu primeiro serviço!</p>
            <Link href="/cliente/jobs/novo" className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Solicitar serviço
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/cliente/jobs/${job.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{job.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {job.address_city} · {formatDate(job.created_at)}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", JOB_STATUS_COLORS[job.status])}>
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {job.agreed_price_cents
                      ? formatCurrency(job.agreed_price_cents)
                      : job.budget_max_cents
                      ? `até ${formatCurrency(job.budget_max_cents)}`
                      : "—"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
