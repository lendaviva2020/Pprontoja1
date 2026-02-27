import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect, notFound } from "next/navigation";
import ChatBox from "@/components/chat/ChatBox";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default async function ChatPage({ params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createServiceClient();

  const { data: job } = await service
    .from("jobs")
    .select(`
      *,
      client:profiles!client_id (id, display_name, full_name, avatar_url),
      professional:profiles!professional_id (id, display_name, full_name, avatar_url)
    `)
    .eq("id", job_id)
    .single();

  if (!job) notFound();
  if (job.client_id !== user.id && job.professional_id !== user.id) {
    redirect("/");
  }

  const isClient = job.client_id === user.id;
  const otherUser = isClient ? job.professional : job.client;

  return (
    <div className="flex h-screen flex-col">
      {/* Topbar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href={isClient ? `/cliente/jobs/${job_id}` : `/profissional/oportunidades`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{job.title}</span>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatBox
          jobId={job_id}
          currentUserId={user.id}
          otherUser={otherUser}
          jobTitle={job.title}
          jobStatus={job.status}
        />
      </div>
    </div>
  );
}
