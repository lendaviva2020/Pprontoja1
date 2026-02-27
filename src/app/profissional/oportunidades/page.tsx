import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MapPin, Clock, DollarSign } from "lucide-react";
import SendProposalButton from "@/components/jobs/SendProposalButton";

export default async function OportunidadesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Jobs abertos que o profissional ainda não enviou proposta
  const { data: myProposals } = await supabase
    .from("proposals")
    .select("job_id")
    .eq("professional_id", user!.id);

  const excludeIds = myProposals?.map(p => p.job_id) || [];

  let query = supabase
    .from("jobs")
    .select(`
      id, title, description, status,
      budget_min_cents, budget_max_cents, address_city, address_state,
      scheduled_at, estimated_duration_hours, created_at,
      services_catalog:service_catalog_id ( name, category )
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data: jobs } = await query;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
        <p className="mt-1 text-gray-500">Jobs disponíveis na sua região</p>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Nenhuma oportunidade disponível no momento.</p>
          <p className="mt-1 text-sm text-gray-400">Verifique novamente em breve!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const catalog = Array.isArray(job.services_catalog) ? job.services_catalog[0] : job.services_catalog as any;
            return (
              <div key={job.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {catalog && (
                      <span className="mb-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {catalog.category} · {catalog.name}
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{job.description}</p>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                      {job.address_city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.address_city}/{job.address_state}
                        </span>
                      )}
                      {job.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(job.scheduled_at)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {job.budget_min_cents && job.budget_max_cents
                          ? `${formatCurrency(job.budget_min_cents)} – ${formatCurrency(job.budget_max_cents)}`
                          : job.budget_max_cents
                          ? `até ${formatCurrency(job.budget_max_cents)}`
                          : "A combinar"}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <SendProposalButton
                      jobId={job.id}
                      jobTitle={job.title}
                      budgetMax={job.budget_max_cents || null}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
