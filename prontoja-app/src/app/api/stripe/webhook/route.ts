import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Sem assinatura" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[Webhook] Assinatura inválida:", err.message);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ─── Idempotência ───────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, status")
    .eq("gateway", "stripe")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing?.status === "processed") {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // Upsert para idempotência segura
  await supabase.from("webhook_events").upsert(
    {
      gateway: "stripe",
      event_id: event.id,
      event_type: event.type,
      payload: event as any,
      status: "processing",
    },
    { onConflict: "gateway,event_id" }
  );

  let processingError: string | null = null;

  try {
    await handleEvent(event, supabase, stripe);
  } catch (err: any) {
    console.error(`[Webhook] Erro ao processar ${event.type}:`, err);
    processingError = err.message;
  }

  // Atualizar status final
  await supabase
    .from("webhook_events")
    .update({
      status: processingError ? "failed" : "processed",
      processed_at: processingError ? null : new Date().toISOString(),
      error_message: processingError,
    })
    .eq("gateway", "stripe")
    .eq("event_id", event.id);

  if (processingError) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Handler por tipo de evento ─────────────────────────────────────────────
async function handleEvent(
  event: Stripe.Event,
  supabase: ReturnType<typeof createServiceClient>,
  stripe: Stripe
) {
  switch (event.type) {
    // ─── PAGAMENTO AUTORIZADO (cartão pré-autorizado, aguardando captura) ────
    case "payment_intent.amount_capturable_updated": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await updatePaymentByGatewayId(supabase, pi.id, {
        status: "authorized",
        gateway_response: pi as any,
      });
      await notifyParties(supabase, pi.id, "payment_authorized");
      break;
    }

    // ─── PAGAMENTO CONCLUÍDO (capturado com sucesso) ─────────────────────────
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata;

      // Atualizar payment
      await supabase
        .from("payments")
        .update({
          status: "captured",
          captured_at: new Date().toISOString(),
          gateway_response: pi as any,
          gateway_charge_id: pi.latest_charge as string,
        })
        .eq("gateway_payment_id", pi.id);

      // Atualizar job
      await supabase
        .from("jobs")
        .update({
          status: "in_progress",
          payment_status: "captured",
        })
        .eq("id", meta.job_id);

      // Notificar cliente
      if (meta.client_id) {
        await supabase.from("notifications").insert({
          user_id: meta.client_id,
          type: "payment_captured",
          channel: "in_app",
          title: "✅ Pagamento confirmado!",
          body: "Seu pagamento foi confirmado. O profissional iniciará o serviço em breve.",
          action_url: `/cliente/jobs/${meta.job_id}`,
        });
      }

      // Notificar profissional
      if (meta.professional_id) {
        const payoutCents = parseInt(meta.professional_payout_cents || "0");
        await supabase.from("notifications").insert({
          user_id: meta.professional_id,
          type: "payment_received",
          channel: "in_app",
          title: "💰 Pagamento recebido!",
          body: `Você receberá R$ ${(payoutCents / 100).toFixed(2).replace(".", ",")} após concluir o serviço.`,
          action_url: `/profissional/jobs/${meta.job_id}`,
        });
      }
      break;
    }

    // ─── PAGAMENTO FALHOU ────────────────────────────────────────────────────
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata;
      const failureMsg =
        pi.last_payment_error?.message || "Pagamento recusado pela operadora";

      await supabase
        .from("payments")
        .update({
          status: "failed",
          failure_reason: failureMsg,
          gateway_response: pi as any,
        })
        .eq("gateway_payment_id", pi.id);

      // Reverter job para 'accepted' para tentar novamente
      await supabase
        .from("jobs")
        .update({ status: "accepted", payment_status: "failed" })
        .eq("id", meta.job_id);

      if (meta.client_id) {
        await supabase.from("notifications").insert({
          user_id: meta.client_id,
          type: "payment_failed",
          channel: "in_app",
          title: "❌ Pagamento recusado",
          body: failureMsg,
          action_url: `/cliente/pagamento/${meta.job_id}`,
        });
      }
      break;
    }

    // ─── CANCELADO / ESTORNADO PARCIALMENTE ─────────────────────────────────
    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("payments")
        .update({
          status: "failed",
          failure_reason: pi.cancellation_reason || "Cancelado",
          gateway_response: pi as any,
        })
        .eq("gateway_payment_id", pi.id);

      await supabase
        .from("jobs")
        .update({ status: "cancelled", payment_status: "failed" })
        .eq("id", pi.metadata.job_id);
      break;
    }

    // ─── ESTORNO PROCESSADO ──────────────────────────────────────────────────
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (!charge.payment_intent) break;

      const totalRefunded = charge.amount_refunded;
      const isFullRefund = totalRefunded >= charge.amount;

      await supabase
        .from("payments")
        .update({
          status: isFullRefund ? "refunded" : "partially_refunded",
          refunded_at: new Date().toISOString(),
          refunded_amount_cents: totalRefunded,
          gateway_response: charge as any,
        })
        .eq("gateway_payment_id", charge.payment_intent as string);

      // Buscar payment para notificar
      const { data: payment } = await supabase
        .from("payments")
        .select("job_id, payer_id, payee_id")
        .eq("gateway_payment_id", charge.payment_intent as string)
        .single();

      if (payment?.payer_id) {
        await supabase.from("notifications").insert({
          user_id: payment.payer_id,
          type: "payment_refunded",
          channel: "in_app",
          title: isFullRefund ? "💸 Estorno processado" : "💸 Estorno parcial processado",
          body: `R$ ${(totalRefunded / 100).toFixed(2).replace(".", ",")} será devolvido em até 5 dias úteis.`,
          action_url: `/cliente/jobs/${payment.job_id}`,
        });
      }
      break;
    }

    // ─── DISPUTA / CHARGEBACK ────────────────────────────────────────────────
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      if (!dispute.payment_intent) break;

      const { data: payment } = await supabase
        .from("payments")
        .select("id, job_id, payer_id, payee_id, amount_cents")
        .eq("gateway_payment_id", dispute.payment_intent as string)
        .single();

      if (!payment) break;

      // Criar disputa no sistema
      await supabase.from("disputes").insert({
        payment_id: payment.id,
        job_id: payment.job_id,
        opened_by: payment.payer_id,
        type: "chargeback",
        reason: dispute.reason,
        status: "open",
        amount_cents: dispute.amount,
        gateway_dispute_id: dispute.id,
        description: `Chargeback automático via Stripe. Motivo: ${dispute.reason}`,
        evidence_due_by: dispute.evidence_details?.due_by
          ? new Date((dispute.evidence_details.due_by as number) * 1000).toISOString()
          : null,
      });

      // Atualizar payment status
      await supabase
        .from("payments")
        .update({ status: "disputed" })
        .eq("id", payment.id);

      // Atualizar job
      await supabase
        .from("jobs")
        .update({ status: "disputed" })
        .eq("id", payment.job_id);

      // Notificar admins via banco (pode integrar email depois)
      await supabase.from("notifications").insert([
        {
          user_id: payment.payee_id,
          type: "dispute_opened",
          channel: "in_app",
          title: "⚠️ Disputa aberta",
          body: "Um chargeback foi iniciado para um dos seus serviços. Nossa equipe está analisando.",
          action_url: `/profissional/jobs/${payment.job_id}`,
        },
        {
          user_id: payment.payer_id,
          type: "dispute_opened_client",
          channel: "in_app",
          title: "⚠️ Contestação em análise",
          body: "Sua contestação foi recebida. Entraremos em contato em até 2 dias úteis.",
          action_url: `/cliente/jobs/${payment.job_id}`,
        },
      ]);
      break;
    }

    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      if (!dispute.payment_intent) break;

      const { data: dbDispute } = await supabase
        .from("disputes")
        .select("id, job_id")
        .eq("gateway_dispute_id", dispute.id)
        .single();

      if (!dbDispute) break;

      const won = dispute.status === "won";
      await supabase
        .from("disputes")
        .update({
          status: won ? "resolved_pro_platform" : "resolved_pro_client",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", dbDispute.id);

      await supabase
        .from("payments")
        .update({ status: won ? "captured" : "refunded" })
        .eq("gateway_payment_id", dispute.payment_intent as string);

      await supabase
        .from("jobs")
        .update({ status: won ? "completed" : "cancelled" })
        .eq("id", dbDispute.job_id);
      break;
    }

    // ─── TRANSFER REALIZADO (repasse ao profissional) ────────────────────────
    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;
      const paymentIntentId = (transfer.source_transaction as string) || null;
      if (!paymentIntentId) break;

      await supabase
        .from("payments")
        .update({
          gateway_transfer_id: transfer.id,
        })
        .eq("gateway_charge_id", paymentIntentId);
      break;
    }

    default:
      // Evento não tratado - apenas logado
      console.log(`[Webhook] Evento não tratado: ${event.type}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function updatePaymentByGatewayId(
  supabase: ReturnType<typeof createServiceClient>,
  gatewayId: string,
  updates: Record<string, unknown>
) {
  await supabase
    .from("payments")
    .update(updates)
    .eq("gateway_payment_id", gatewayId);
}

async function notifyParties(
  supabase: ReturnType<typeof createServiceClient>,
  paymentIntentId: string,
  type: string
) {
  const { data: payment } = await supabase
    .from("payments")
    .select("payer_id, payee_id, job_id")
    .eq("gateway_payment_id", paymentIntentId)
    .single();

  if (!payment) return;
  // Notificações específicas por tipo podem ser adicionadas aqui
  console.log(`[notify] ${type} para job ${payment.job_id}`);
}
