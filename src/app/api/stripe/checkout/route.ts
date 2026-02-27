import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { job_id } = await request.json();

    if (!job_id) return NextResponse.json({ error: "job_id obrigatório" }, { status: 400 });

    // Buscar job com profissional
    const { data: job } = await supabase
      .from("jobs")
      .select("*, professional:professional_id(id, full_name, metadata)")
      .eq("id", job_id)
      .eq("client_id", user.id)
      .single();

    if (!job) return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
    if (job.status !== "accepted") return NextResponse.json({ error: "Job não está no status correto" }, { status: 400 });
    if (!job.agreed_price_cents) return NextResponse.json({ error: "Preço não acordado" }, { status: 400 });

    const professional = Array.isArray(job.professional) ? job.professional[0] : job.professional as any;
    const stripeAccountId = (professional?.metadata as any)?.stripe_account_id;

    if (!stripeAccountId) {
      return NextResponse.json({
        error: "Profissional ainda não configurou conta de recebimento",
      }, { status: 422 });
    }

    const amountCents = job.agreed_price_cents;
    const platformFeePct = job.platform_fee_pct || 10;
    const platformFeeCents = Math.round(amountCents * (platformFeePct / 100));
    const professionalPayoutCents = amountCents - platformFeeCents;

    // Criar PaymentIntent com Destination Charge (split automático)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "brl",
      payment_method_types: ["card"],
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        job_id,
        client_id: user.id,
        professional_id: professional?.id,
        platform_fee_cents: platformFeeCents.toString(),
        professional_payout_cents: professionalPayoutCents.toString(),
      },
      description: `ProntoJá: ${job.title}`,
    });

    // Criar registro de payment no banco
    const { data: payment } = await supabase.from("payments").insert({
      job_id,
      payer_id: user.id,
      payee_id: professional?.id,
      gateway: "stripe",
      gateway_payment_id: paymentIntent.id,
      gateway_account_id: stripeAccountId,
      amount_cents: amountCents,
      platform_fee_cents: platformFeeCents,
      professional_payout_cents: professionalPayoutCents,
      currency: "BRL",
      status: "pending",
      metadata: { stripe_payment_intent_id: paymentIntent.id },
    }).select().single();

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      payment_id: payment?.id,
      amount_cents: amountCents,
      platform_fee_cents: platformFeeCents,
      professional_payout_cents: professionalPayoutCents,
    });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
