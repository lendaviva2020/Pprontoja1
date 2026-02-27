import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function ClienteMensagensPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  // Buscar todos os jobs do cliente que têm mensagens (accepted, in_progress, completed)
  const { data: jobs } = await service
    .from("jobs")
    .select(`
      id, title, status, updated_at,
      professional:profiles!professional_id (id, display_name, full_name, avatar_url)
    `)
    .eq("client_id", user.id)
    .in("status", ["accepted", "in_progress", "pending_review", "completed"])
    .order("updated_at", { ascending: false });

  // Para cada job, pegar última mensagem
  const jobsWithLastMessage = await Promise.all(
    (jobs || []).map(async (job) => {
      const { data: lastMsg } = await service
        .from("messages")
        .select("content, created_at, sender_id, is_read")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unread } = await service
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("job_id", job.id)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      return { ...job, lastMsg, unreadCount: unread || 0 };
    })
  );

  const STATUS_LABELS: Record<string, string> = {
    accepted: "Aceito", in_progress: "Em andamento",
    pending_review: "Ag. revisão", completed: "Concluído",
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>
        <p className="text-gray-500 mt-1">Conversas com seus profissionais</p>
      </div>

      {!jobsWithLastMessage.length ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma conversa ainda</p>
          <p className="text-sm text-gray-400 mt-1">As conversas aparecem quando um profissional aceita seu serviço</p>
          <Link href="/cliente/jobs/novo" className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Publicar serviço
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {jobsWithLastMessage.map(job => {
            const prof = Array.isArray(job.professional) ? job.professional[0] : job.professional as any;
            const profName = prof?.display_name || prof?.full_name || "Profissional";
            return (
              <Link key={job.id} href={`/chat/${job.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all group">
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm">
                    {prof?.avatar_url
                      ? <img src={prof.avatar_url} alt={profName} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-lg font-bold text-gray-400">{profName[0].toUpperCase()}</div>}
                  </div>
                  {job.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{job.unreadCount}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 truncate">{profName}</p>
                    {job.lastMsg && <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDateTime(job.lastMsg.created_at)}</p>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{job.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {job.lastMsg ? (job.lastMsg.sender_id === user.id ? "Você: " : "") + job.lastMsg.content : "Sem mensagens ainda"}
                  </p>
                </div>
                <div className="flex-shrink-0 text-gray-400 group-hover:text-brand-500 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
