import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/reviews → criar avaliação
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { job_id, rating, comment, punctuality_rating, quality_rating, communication_rating, would_hire_again } = body;

  if (!job_id || !rating) return NextResponse.json({ error: "job_id e rating são obrigatórios" }, { status: 400 });
  if (rating < 1 || rating > 5) return NextResponse.json({ error: "Rating deve ser entre 1 e 5" }, { status: 400 });

  const service = createServiceClient();

  // Buscar job para validar e pegar professional_id
  const { data: job, error: jobErr } = await service
    .from("jobs")
    .select("id, client_id, professional_id, status")
    .eq("id", job_id)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  if (job.client_id !== user.id) return NextResponse.json({ error: "Apenas o cliente pode avaliar" }, { status: 403 });
  if (job.status !== "completed") return NextResponse.json({ error: "Job precisa estar concluído" }, { status: 400 });
  if (!job.professional_id) return NextResponse.json({ error: "Job sem profissional" }, { status: 400 });

  // Checar se já avaliou
  const { data: existing } = await service
    .from("reviews")
    .select("id")
    .eq("job_id", job_id)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Você já avaliou este serviço" }, { status: 409 });

  // Criar avaliação
  const { data: review, error: revErr } = await service
    .from("reviews")
    .insert({
      job_id,
      reviewer_id: user.id,
      reviewee_id: job.professional_id,
      rating,
      comment,
      punctuality_rating: punctuality_rating || null,
      quality_rating: quality_rating || null,
      communication_rating: communication_rating || null,
      would_hire_again: would_hire_again ?? null,
      is_visible: true,
    })
    .select()
    .single();

  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });

  // Notificar profissional
  await service.from("notifications").insert({
    user_id: job.professional_id,
    type: "new_review",
    title: "Nova avaliação recebida!",
    body: `Você recebeu uma avaliação de ${rating} estrelas`,
    data: { job_id, review_id: review.id },
  });

  // Atualizar job com rating
  await service.from("jobs").update({ client_rating: rating, client_review: comment, rated_at: new Date().toISOString() }).eq("id", job_id);

  return NextResponse.json({ review }, { status: 201 });
}
