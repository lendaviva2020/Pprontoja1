import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function ProfissionalMensagensPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  const { data: jobs } = await service
    .from("jobs")
    .select(`
      id, title, status, updated_at,
      client:profiles!client_id (id, display_name, full_name, avatar_url)
    `)
    .eq("professional_id", user.id)
    .in("status", ["accepted", "in_progress", "pending_review", "completed"])
    .order("updated_at", { ascending: false });

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

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>
        <p className="text-gray-500 mt-1">Conversas com seus clientes</p>
      </div>

      {!jobsWithLastMessage.length ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma conversa ainda</p>
          <p className="text-sm text-gray-400 mt-1">As conversas aparecem quando você aceitar um trabalho</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobsWithLastMessage.map(job => {
            const client = Array.isArray(job.client) ? job.client[0] : job.client as any;
            const clientName = client?.display_name || client?.full_name || "Cliente";
            return (
              <Link key={job.id} href={`/chat/${job.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all group">
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm">
                    {client?.avatar_url
                      ? <img src={client.avatar_url} alt={clientName} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-lg font-bold text-gray-400">{clientName[0].toUpperCase()}</div>}
                  </div>
                  {job.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{job.unreadCount}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 truncate">{clientName}</p>
                    {job.lastMsg && <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDateTime(job.lastMsg.created_at)}</p>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{job.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {job.lastMsg ? (job.lastMsg.sender_id === user.id ? "Você: " : "") + job.lastMsg.content : "Sem mensagens ainda"}
                  </p>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
