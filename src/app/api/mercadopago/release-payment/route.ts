import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/mercadopago/release-payment
 *
 * Libera o pagamento para o profissional após conclusão do serviço.
 * No MercadoPago Marketplace o split é automático — esta rota apenas
 * marca job como completed e payment como released_to_professional.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const service = createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let body: { job_id?: string; payment_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { job_id, payment_id } = body;
    if (!job_id && !payment_id) {
      return NextResponse.json(
        { error: "Forneça payment_id ou job_id" },
        { status: 400 }
      );
    }

    let query = service
      .from("payments")
      .select(
        `id, job_id, payer_id, payee_id,
         amount_cents, platform_fee_cents, professional_payout_cents,
         status, gateway,
         jobs:job_id(id, title, status, client_id, professional_id)`
      )
      .eq("gateway", "mercadopago")
      .eq("status", "captured");

    if (payment_id) {
      query = query.eq("id", payment_id);
    } else {
      query = query.eq("job_id", job_id!);
    }

    const { data: paymentData, error } = await query.limit(1).single();

    if (error || !paymentData) {
      return NextResponse.json(
        { error: "Pagamento não encontrado ou já liberado" },
        { status: 404 }
      );
    }

    const jobRecord = Array.isArray(paymentData.jobs)
      ? paymentData.jobs[0]
      : paymentData.jobs as { id: string; title: string; client_id: string; professional_id: string; status: string } | null;

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some((r) =>
      ["admin", "super_admin", "finance"].includes(r.role)
    );
    const isClienteDoJob = jobRecord?.client_id === user.id;

    if (!isAdmin && !isClienteDoJob) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const statusesPermitidos = ["in_progress", "pending_review", "accepted"];
    if (!statusesPermitidos.includes(jobRecord?.status ?? "")) {
      return NextResponse.json(
        { error: `Job no status '${jobRecord?.status}' não pode ter pagamento liberado` },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await service
      .from("payments")
      .update({
        status: "released_to_professional",
        released_at: now,
        released_by: user.id,
      })
      .eq("id", paymentData.id)
      .eq("status", "captured");

    if (updateErr) {
      console.error("[MP Release] Erro ao atualizar payment:", updateErr);
      return NextResponse.json(
        { error: "Erro ao atualizar status" },
        { status: 500 }
      );
    }

    await service
      .from("jobs")
      .update({
        status: "completed",
        payment_status: "released",
        completed_at: now,
      })
      .eq("id", paymentData.job_id);

    await service.from("audit_logs").insert({
      actor_id: user.id,
      action: "mercadopago.payment.released",
      entity_type: "payment",
      entity_id: paymentData.id,
      changes: {
        released_by: user.id,
        released_by_role: isAdmin ? "admin" : "client",
        job_id: paymentData.job_id,
        professional_payout_cents: paymentData.professional_payout_cents,
        timestamp: now,
      },
    });

    const valorFormatado = (
      (paymentData.professional_payout_cents ?? 0) / 100
    )
      .toFixed(2)
      .replace(".", ",");

    const notifs = [];

    if (paymentData.payee_id) {
      notifs.push({
        user_id: paymentData.payee_id,
        type: "payment_released",
        channel: "in_app",
        title: "🎉 Serviço concluído!",
        body: `R$ ${valorFormatado} já foi liberado para sua conta MercadoPago.`,
        action_url: "/profissional/financeiro",
      });
    }

    if (paymentData.payer_id) {
      notifs.push({
        user_id: paymentData.payer_id,
        type: "service_completed",
        channel: "in_app",
        title: "✅ Serviço concluído!",
        body: "Que tal avaliar o profissional? Sua avaliação ajuda outros clientes.",
        action_url: `/cliente/jobs/${paymentData.job_id}`,
      });
    }

    if (notifs.length > 0) {
      await service.from("notifications").insert(notifs);
    }

    return NextResponse.json({
      success: true,
      payment_id: paymentData.id,
      job_id: paymentData.job_id,
      amount_released_cents: paymentData.professional_payout_cents,
      amount_released_formatted: `R$ ${valorFormatado}`,
      message:
        "Serviço concluído. Os fundos já foram liberados automaticamente pelo MercadoPago.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[MP Release] Erro:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
