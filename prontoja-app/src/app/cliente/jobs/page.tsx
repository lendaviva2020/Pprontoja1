import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function ClienteJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, agreed_price_cents, budget_max_cents, address_city, address_state, created_at, scheduled_at")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meus pedidos</h1>
        <Link href="/cliente/jobs/novo" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo pedido</span>
        </Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Você ainda não tem pedidos.</p>
          <Link href="/cliente/jobs/novo" className="btn-primary mt-4 inline-flex">
            Solicitar primeiro serviço
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {jobs.map(job => (
            <Link
              key={job.id}
              href={`/cliente/jobs/${job.id}`}
              className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{job.title}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {job.address_city}/{job.address_state} · {formatDate(job.created_at)}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", JOB_STATUS_COLORS[job.status])}>
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {job.agreed_price_cents ? formatCurrency(job.agreed_price_cents) :
                     job.budget_max_cents ? `até ${formatCurrency(job.budget_max_cents)}` : "—"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
