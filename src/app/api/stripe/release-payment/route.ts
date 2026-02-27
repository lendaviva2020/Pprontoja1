import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * POST /api/stripe/release-payment
 * Libera o pagamento retido para o profissional.
 * Pode ser chamado pelo cliente (ao marcar serviço concluído)
 * ou pelo admin automaticamente.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { job_id, payment_id } = await request.json();

    // Buscar payment com dados do job e profissional
    let query = serviceSupabase
      .from("payments")
      .select(`
        *,
        jobs:job_id (
          id, title, client_id, professional_id, status,
          professional:professional_id ( metadata )
        )
      `)
      .eq("status", "captured");

    if (payment_id) query = query.eq("id", payment_id);
    else if (job_id) query = query.eq("job_id", job_id);
    else return NextResponse.json({ error: "payment_id ou job_id obrigatório" }, { status: 400 });

    const { data: payment } = await query.single();
    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado ou já liberado" }, { status: 404 });
    }

    const job = Array.isArray(payment.jobs) ? payment.jobs[0] : payment.jobs as any;

    // Verificar autorização: apenas cliente do job ou admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => ["admin", "super_admin", "finance"].includes(r.role));
    const isClient = job?.client_id === user.id;

    if (!isAdmin && !isClient) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const professional = Array.isArray(job?.professional) ? job.professional[0] : job?.professional as any;
    const stripeAccountId = (professional?.metadata as any)?.stripe_account_id;

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Profissional sem conta Stripe configurada" }, { status: 422 });
    }

    // Realizar transfer manual para conta do profissional
    // (O valor da taxa já foi separado automaticamente via application_fee_amount)
    const transfer = await stripe.transfers.create({
      amount: payment.professional_payout_cents,
      currency: "brl",
      destination: stripeAccountId,
      source_transaction: payment.gateway_charge_id || undefined,
      metadata: {
        payment_id: payment.id,
        job_id: payment.job_id,
        type: "service_payment_release",
      },
      description: `ProntoJá: Liberação - ${job?.title}`,
    });

    // Atualizar payment
    await serviceSupabase.from("payments").update({
      status: "released_to_professional",
      released_at: new Date().toISOString(),
      gateway_transfer_id: transfer.id,
      released_by: user.id,
    }).eq("id", payment.id);

    // Atualizar job como completed
    await serviceSupabase.from("jobs").update({
      status: "completed",
      payment_status: "released",
      completed_at: new Date().toISOString(),
    }).eq("id", payment.job_id);

    // Notificar profissional
    await serviceSupabase.from("notifications").insert({
      user_id: payment.payee_id,
      type: "payment_released",
      channel: "in_app",
      title: "🎉 Pagamento liberado!",
      body: `R$ ${(payment.professional_payout_cents / 100).toFixed(2).replace(".", ",")} foi transferido para sua conta.`,
      action_url: "/profissional/financeiro",
    });

    // Notificar cliente
    await serviceSupabase.from("notifications").insert({
      user_id: payment.payer_id,
      type: "service_completed",
      channel: "in_app",
      title: "✅ Serviço concluído!",
      body: "O serviço foi marcado como concluído. Que tal avaliar o profissional?",
      action_url: `/cliente/jobs/${payment.job_id}`,
    });

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      amount_released: payment.professional_payout_cents,
    });
  } catch (err: any) {
    console.error("Release payment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
