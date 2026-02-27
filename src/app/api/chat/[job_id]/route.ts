import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Message } from "@/types/database";

type JobParticipant = { id: string; client_id: string; professional_id: string | null };
type JobParticipantWithStatus = JobParticipant & { status: string };
type SenderRef = { id: string; display_name: string | null; full_name: string; avatar_url: string | null };
type MessageWithSender = Message & { sender: SenderRef | SenderRef[] | null };

// GET /api/chat/[job_id] → buscar mensagens
export async function GET(req: NextRequest, { params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const service = createServiceClient();

  const { data: jobData } = await service
    .from("jobs")
    .select("id, client_id, professional_id")
    .eq("id", job_id)
    .single();

  const job = jobData as JobParticipant | null;
  if (!job || (job.client_id !== user.id && job.professional_id !== user.id)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  const { data: messages, error } = await service
    .from("messages")
    .select(`
      *,
      sender:profiles!sender_id (
        id, display_name, full_name, avatar_url
      )
    `)
    .eq("job_id", job_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messagesTyped = (messages ?? []) as MessageWithSender[];

  // Marcar mensagens como lidas (builder em any por inferência never do Supabase)
  const messagesTable = service.from("messages") as ReturnType<typeof service.from> & {
    update: (v: Record<string, unknown>) => ReturnType<ReturnType<typeof service.from>["update"]>;
  };
  await messagesTable
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("job_id", job_id)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({ messages: messagesTyped, job });
}

// POST /api/chat/[job_id] → enviar mensagem
export async function POST(req: NextRequest, { params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { body: messageBody, message_type = "text", attachment_url, metadata } = body;

  if (!messageBody?.trim() && !attachment_url) {
    return NextResponse.json({ error: "Mensagem não pode ser vazia" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: jobDataPost } = await service
    .from("jobs")
    .select("id, client_id, professional_id, status")
    .eq("id", job_id)
    .single();

  const jobPost = jobDataPost as JobParticipantWithStatus | null;
  if (!jobPost || (jobPost.client_id !== user.id && jobPost.professional_id !== user.id)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  const { data: messageData, error: msgErr } = await service
    .from("messages")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      job_id,
      sender_id: user.id,
      body: messageBody?.trim() || null,
      message_type,
      attachment_url: attachment_url || null,
      metadata: metadata || {},
      is_read: false,
    } as any)
    .select(`
      *,
      sender:profiles!sender_id (
        id, display_name, full_name, avatar_url
      )
    `)
    .single();

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  const message = messageData as MessageWithSender | null;

  // Notificar o outro participante
  const recipientId = user.id === jobPost.client_id ? jobPost.professional_id : jobPost.client_id;
  if (recipientId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.from("notifications").insert({
      user_id: recipientId,
      type: "new_message",
      title: "Nova mensagem",
      body: messageBody ? messageBody.substring(0, 80) : "Arquivo anexado",
      data: { job_id },
    } as any);
  }

  return NextResponse.json({ message }, { status: 201 });
}
