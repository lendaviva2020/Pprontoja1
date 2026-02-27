import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MapPin, Calendar, DollarSign, Clock, MessageSquare, Star } from "lucide-react";
import AcceptProposalButton from "@/components/jobs/AcceptProposalButton";
import PaymentButton from "@/components/payments/PaymentButton";
import Link from "next/link";

const JOB_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", open: "Aberto", matching: "Buscando", proposal_received: "Propostas recebidas",
  accepted: "Aceito", in_progress: "Em andamento", pending_review: "Ag. revisão",
  completed: "Concluído", disputed: "Em disputa", cancelled: "Cancelado",
};
const JOB_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700", accepted: "bg-brand-100 text-brand-700",
  in_progress: "bg-purple-100 text-purple-700", completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700", disputed: "bg-orange-100 text-orange-700",
  draft: "bg-gray-100 text-gray-600", matching: "bg-yellow-100 text-yellow-700",
  proposal_received: "bg-indigo-100 text-indigo-700", pending_review: "bg-pink-100 text-pink-700",
};

interface Props { params: Promise<{ id: string }> }

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const service = createServiceClient();

  const { data: job } = await service
    .from("jobs")
    .select(`*, professional:profiles!professional_id (id, display_name, full_name, rating_avg, rating_count, avatar_url, slug)`)
    .eq("id", id).eq("client_id", user!.id).single();

  if (!job) notFound();

  const { data: existingReview } = await service
    .from("reviews").select("id")
    .eq("job_id", id).eq("reviewer_id", user!.id).maybeSingle();

  const { data: proposals } = await service
    .from("proposals")
    .select(`id, price_cents, description, estimated_hours, available_date, status, created_at,
      profiles:professional_id (id, full_name, display_name, rating_avg, rating_count, avatar_url, slug)`)
    .eq("job_id", id).order("created_at", { ascending: true });

  const hasChat = ["accepted","in_progress","completed"].includes(job.status);
  const canReview = job.status === "completed" && !existingReview;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <span className={cn("flex-shrink-0 rounded-full px-3 py-1 text-sm font-medium", JOB_STATUS_COLORS[job.status] || "bg-gray-100 text-gray-600")}>
            {JOB_STATUS_LABELS[job.status] || job.status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {hasChat && (
            <Link href={`/chat/${id}`} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
              <MessageSquare className="h-4 w-4" /> Chat com profissional
            </Link>
          )}
          {canReview && (
            <Link href={`/cliente/avaliar/${id}`} className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition-colors">
              <Star className="h-4 w-4" /> Avaliar serviço
            </Link>
          )}
          {existingReview && <span className="flex items-center gap-1.5 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">✓ Serviço avaliado</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
            <h2 className="mb-3 font-semibold text-gray-900">Descrição</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {job.address_city && (
                <div className="flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4 text-brand-500" />{job.address_city}/{job.address_state}</div>
              )}
              {job.scheduled_at && (
                <div className="flex items-center gap-2 text-gray-600"><Calendar className="h-4 w-4 text-brand-500" />{formatDateTime(job.scheduled_at)}</div>
              )}
              {(job.budget_max_cents || job.agreed_price_cents) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4 text-brand-500" />
                  {job.agreed_price_cents ? `Acordado: ${formatCurrency(job.agreed_price_cents)}` : `Até ${formatCurrency(job.budget_max_cents!)}`}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600"><Clock className="h-4 w-4 text-brand-500" />{formatDateTime(job.created_at)}</div>
            </div>
          </div>

          {job.professional && (
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-3 font-semibold text-gray-900">Profissional contratado</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 overflow-hidden text-sm font-bold text-brand-700">
                    {job.professional.avatar_url
                      ? <img src={job.professional.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (job.professional.display_name || job.professional.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{job.professional.display_name || job.professional.full_name}</p>
                    {job.professional.rating_avg && (
                      <p className="text-xs text-yellow-600">⭐ {Number(job.professional.rating_avg).toFixed(1)} ({job.professional.rating_count} avaliações)</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {job.professional.slug && (
                    <Link href={`/p/${job.professional.slug}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Ver perfil</Link>
                  )}
                  {hasChat && (
                    <Link href={`/chat/${id}`} className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100">Chat</Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Propostas recebidas <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">{proposals?.length || 0}</span></h2>
            </div>
            {!proposals?.length ? (
              <div className="p-8 text-center text-gray-500 text-sm">Aguardando propostas...</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {proposals.map(p => {
                  const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles as any;
                  return (
                    <div key={p.id} className={cn("p-5", p.status === "accepted" && "bg-brand-50")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 overflow-hidden text-sm font-bold text-gray-600 flex-shrink-0">
                            {prof?.avatar_url ? <img src={prof.avatar_url} alt="" className="h-full w-full object-cover" /> : (prof?.display_name || prof?.full_name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{prof?.display_name || prof?.full_name}</p>
                            {prof?.rating_avg && <p className="text-xs text-yellow-600">⭐ {Number(prof.rating_avg).toFixed(1)} ({prof.rating_count} avaliações)</p>}
                            {prof?.slug && <Link href={`/p/${prof.slug}`} className="text-xs text-brand-600 hover:underline">Ver perfil →</Link>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-brand-600">{formatCurrency(p.price_cents)}</p>
                          {p.estimated_hours && <p className="text-xs text-gray-500">{p.estimated_hours}h est.</p>}
                        </div>
                      </div>
                      {p.description && <p className="mt-3 text-sm text-gray-700">{p.description}</p>}
                      {p.status === "pending" && !["accepted","in_progress"].includes(job.status) && (
                        <div className="mt-3"><AcceptProposalButton proposalId={p.id} jobId={job.id} price={p.price_cents} /></div>
                      )}
                      {p.status === "accepted" && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">✓ Aceita</span>
                          {!["captured","released_to_professional"].includes(job.payment_status) && <PaymentButton jobId={job.id} amount={p.price_cents} />}
                          {["captured","released_to_professional"].includes(job.payment_status) && (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">✓ Pago</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Resumo financeiro</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Orçamento</span><span>{job.budget_max_cents ? formatCurrency(job.budget_max_cents) : "—"}</span></div>
              {job.agreed_price_cents && <div className="flex justify-between"><span className="text-gray-500">Acordado</span><span className="font-semibold text-brand-600">{formatCurrency(job.agreed_price_cents)}</span></div>}
            </div>
          </div>
          {(hasChat || canReview) && (
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Ações</h3>
              <div className="space-y-2">
                {hasChat && <Link href={`/chat/${id}`} className="flex w-full items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-100"><MessageSquare className="h-4 w-4" /> Abrir chat</Link>}
                {canReview && <Link href={`/cliente/avaliar/${id}`} className="flex w-full items-center gap-2 rounded-xl bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700 hover:bg-yellow-100"><Star className="h-4 w-4" /> Avaliar serviço</Link>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
