import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, PROPOSAL_STATUS_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-gray-100 text-gray-500",
  withdrawn: "bg-gray-100 text-gray-500",
};

export default async function PropostasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: proposals } = await supabase
    .from("proposals")
    .select(`
      id, price_cents, status, description, created_at, expires_at,
      jobs:job_id ( id, title, address_city, address_state, status, client_id )
    `)
    .eq("professional_id", user!.id)
    .order("created_at", { ascending: false });

  const grouped = {
    pending: proposals?.filter(p => p.status === "pending") || [],
    accepted: proposals?.filter(p => p.status === "accepted") || [],
    other: proposals?.filter(p => !["pending", "accepted"].includes(p.status)) || [],
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Minhas propostas</h1>

      {(!proposals || proposals.length === 0) ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Você ainda não enviou propostas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.accepted.length > 0 && (
            <Section title="✅ Aceitas" proposals={grouped.accepted} />
          )}
          {grouped.pending.length > 0 && (
            <Section title="⏳ Aguardando resposta" proposals={grouped.pending} />
          )}
          {grouped.other.length > 0 && (
            <Section title="Outras" proposals={grouped.other} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, proposals }: { title: string; proposals: any[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-gray-500">{title}</h2>
      <div className="card divide-y divide-gray-50">
        {proposals.map(p => {
          const job = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs as any;
          return (
            <div key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{job?.title || "Job removido"}</p>
                  {job?.address_city && (
                    <p className="text-sm text-gray-500">{job.address_city}/{job.address_state}</p>
                  )}
                  {p.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{p.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">Enviada em {formatDate(p.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-brand-600">{formatCurrency(p.price_cents)}</p>
                  <span className={cn("mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium", STATUS_COLORS[p.status])}>
                    {PROPOSAL_STATUS_LABELS[p.status]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
