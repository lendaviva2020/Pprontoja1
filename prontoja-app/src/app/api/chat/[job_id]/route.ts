import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/chat/[job_id] → buscar mensagens
export async function GET(req: NextRequest, { params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const service = createServiceClient();

  // Verificar se é participante do job
  const { data: job } = await service
    .from("jobs")
    .select("id, client_id, professional_id")
    .eq("id", job_id)
    .single();

  if (!job || (job.client_id !== user.id && job.professional_id !== user.id)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  // Buscar mensagens com dados do remetente
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

  // Marcar mensagens como lidas
  await service
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("job_id", job_id)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({ messages, job });
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

  // Verificar participante
  const { data: job } = await service
    .from("jobs")
    .select("id, client_id, professional_id, status")
    .eq("id", job_id)
    .single();

  if (!job || (job.client_id !== user.id && job.professional_id !== user.id)) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  const { data: message, error: msgErr } = await service
    .from("messages")
    .insert({
      job_id,
      sender_id: user.id,
      body: messageBody?.trim() || null,
      message_type,
      attachment_url: attachment_url || null,
      metadata: metadata || {},
      is_read: false,
    })
    .select(`
      *,
      sender:profiles!sender_id (
        id, display_name, full_name, avatar_url
      )
    `)
    .single();

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  // Notificar o outro participante
  const recipientId = user.id === job.client_id ? job.professional_id : job.client_id;
  if (recipientId) {
    await service.from("notifications").insert({
      user_id: recipientId,
      type: "new_message",
      title: "Nova mensagem",
      body: messageBody ? messageBody.substring(0, 80) : "Arquivo anexado",
      data: { job_id },
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
