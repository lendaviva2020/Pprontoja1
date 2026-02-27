import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const {
      payment_id,
      amount_cents,        // opcional: estorno parcial (em centavos)
      reason,              // "requested_by_customer" | "fraudulent" | "duplicate"
      internal_reason,     // texto interno para auditoria
    } = await request.json();

    // Verificar permissão admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => ["admin", "super_admin", "finance"].includes(r.role));
    if (!isAdmin) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    // Buscar payment
    const { data: payment } = await serviceSupabase
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .in("status", ["captured", "authorized", "released_to_professional", "disputed"])
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado ou não estornável" }, { status: 404 });
    }

    const refundAmount = amount_cents ?? payment.amount_cents;

    // Criar estorno no Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.gateway_payment_id,
      amount: refundAmount,
      reason: reason ?? "requested_by_customer",
      metadata: {
        payment_id: payment.id,
        refunded_by: user.id,
        internal_reason: internal_reason ?? "",
      },
    });

    const isFullRefund = refundAmount >= payment.amount_cents;

    // Atualizar payment
    await serviceSupabase.from("payments").update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refunded_at: new Date().toISOString(),
      refunded_amount_cents: refundAmount,
      refund_reason: internal_reason || reason,
      refunded_by: user.id,
      gateway_response: { ...((payment.gateway_response as object) || {}), refund_id: refund.id },
    }).eq("id", payment_id);

    // Log de auditoria
    await serviceSupabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "payment.refunded",
      entity_type: "payment",
      entity_id: payment_id,
      changes: {
        refund_id: refund.id,
        amount_cents: refundAmount,
        reason: internal_reason || reason,
        is_full_refund: isFullRefund,
      },
    });

    // Notificar cliente
    await serviceSupabase.from("notifications").insert({
      user_id: payment.payer_id,
      type: "payment_refunded",
      channel: "in_app",
      title: isFullRefund ? "💸 Reembolso aprovado!" : "💸 Reembolso parcial aprovado!",
      body: `R$ ${(refundAmount / 100).toFixed(2).replace(".", ",")} será creditado em 5 dias úteis.`,
      action_url: `/cliente/jobs/${payment.job_id}`,
    });

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount_refunded: refundAmount,
      status: refund.status,
    });
  } catch (err: any) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
