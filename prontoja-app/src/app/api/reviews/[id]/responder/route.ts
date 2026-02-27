import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// PATCH /api/reviews/[id]/responder
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { response } = await req.json();
  if (!response?.trim()) return NextResponse.json({ error: "Resposta não pode ser vazia" }, { status: 400 });

  const service = createServiceClient();
  const { data: review, error: findErr } = await service.from("reviews").select("*").eq("id", id).single();
  if (findErr || !review) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  if (review.reviewee_id !== user.id) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data: updated, error: updErr } = await service
    .from("reviews")
    .update({
      professional_response: response,
      professional_responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ review: updated });
}
