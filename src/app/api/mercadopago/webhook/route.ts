import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getMercadoPago,
  validateMPWebhookSignature,
  mapMPStatusToInternal,
  translateMPStatusDetail,
  type MPWebhookBody,
  type MPPaymentResponse,
  type MPProfessionalMetadata,
} from "@/lib/mercadopago";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/mercadopago/webhook
 *
 * Recebe notificações IPN/Webhook do MercadoPago.
 */
export async function POST(request: NextRequest) {
  let body: MPWebhookBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";
  const dataId = body.data?.id ?? "";

  const webhookSecret = process.env.MP_WEBHOOK_SECRET;

  if (webhookSecret && xSignature) {
    const isValid = await validateMPWebhookSignature(
      xSignature,
      xRequestId,
      dataId,
      webhookSecret
    );

    if (!isValid) {
      console.error("[MP Webhook] Assinatura HMAC inválida para evento:", dataId);
      return NextResponse.json({ received: true, warning: "invalid_signature" });
    }
  }

  const supabase = createServiceClient();
  const mp = getMercadoPago();

  const eventId = `${body.type}_${dataId}_${xRequestId || Date.now()}`;

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, status")
    .eq("gateway", "mercadopago")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing?.status === "processed") {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  await supabase.from("webhook_events").upsert(
    {
      gateway: "mercadopago",
      event_id: eventId,
      event_type: `${body.type}.${body.action}`,
      payload: body as unknown as Record<string, unknown>,
      status: "processing",
    },
    { onConflict: "gateway,event_id" }
  );

  let processingError: string | null = null;

  try {
    switch (body.type) {
      case "payment":
        await handlePaymentEvent(body, supabase, mp);
        break;

      case "mp-connect":
        await handleConnectEvent(body, supabase);
        break;

      case "chargebacks":
        await handleChargebackEvent(body, supabase, mp);
        break;

      default:
        console.log(`[MP Webhook] Tipo não tratado: ${body.type}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`[MP Webhook] Erro ao processar ${body.type}.${body.action}:`, err);
    processingError = msg;
  }

  await supabase
    .from("webhook_events")
    .update({
      status: processingError ? "failed" : "processed",
      processed_at: processingError ? null : new Date().toISOString(),
      error_message: processingError,
    })
    .eq("gateway", "mercadopago")
    .eq("event_id", eventId);

  return NextResponse.json({ received: true });
}

async function handlePaymentEvent(
  body: MPWebhookBody,
  supabase: ReturnType<typeof createServiceClient>,
  mp: ReturnType<typeof getMercadoPago>
) {
  const paymentId = body.data.id;
  if (!paymentId) return;

  let mpPayment: MPPaymentResponse;
  try {
    mpPayment = await mp.getPayment(paymentId);
  } catch (err) {
    throw new Error(`Falha ao buscar pagamento ${paymentId}: ${err}`);
  }

  const jobId = mpPayment.external_reference;
  if (!jobId) {
    console.warn("[MP Webhook] Pagamento sem external_reference:", paymentId);
    return;
  }

  const internalStatus = mapMPStatusToInternal(mpPayment.status);
  const now = new Date().toISOString();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, payer_id, payee_id, amount_cents")
    .eq("job_id", jobId)
    .eq("gateway", "mercadopago")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    console.warn("[MP Webhook] Pagamento não encontrado para job:", jobId);
    return;
  }

  const statusPriority: Record<string, number> = {
    pending: 0,
    authorized: 1,
    captured: 2,
    released_to_professional: 3,
    failed: 1,
    refunded: 3,
    disputed: 2,
  };
  const currentPriority = statusPriority[payment.status] ?? 0;
  const newPriority = statusPriority[internalStatus] ?? 0;

  if (newPriority < currentPriority) {
    console.log(
      `[MP Webhook] Ignorando regressão: ${payment.status} → ${internalStatus}`
    );
    return;
  }

  const updateData: Record<string, unknown> = {
    status: internalStatus,
    gateway_charge_id: String(mpPayment.id),
    updated_at: now,
  };

  if (internalStatus === "captured" && mpPayment.date_approved) {
    updateData.captured_at = mpPayment.date_approved;
  }
  if (internalStatus === "failed") {
    updateData.failure_reason = translateMPStatusDetail(mpPayment.status_detail);
  }
  if (internalStatus === "refunded") {
    updateData.refunded_at = now;
    updateData.refunded_amount_cents = Math.round(
      (mpPayment.transaction_amount_refunded ?? mpPayment.transaction_amount) * 100
    );
  }

  await supabase
    .from("payments")
    .update(updateData)
    .eq("id", payment.id);

  const jobUpdate: Record<string, unknown> = { updated_at: now };

  switch (internalStatus) {
    case "captured":
      jobUpdate.status = "in_progress";
      jobUpdate.payment_status = "captured";
      break;
    case "failed":
      jobUpdate.payment_status = "failed";
      break;
    case "refunded":
      jobUpdate.status = "cancelled";
      jobUpdate.payment_status = "refunded";
      break;
    case "disputed":
      jobUpdate.status = "disputed";
      jobUpdate.payment_status = "disputed";
      break;
    case "pending":
      jobUpdate.payment_status = "pending";
      break;
  }

  await supabase.from("jobs").update(jobUpdate).eq("id", jobId);

  await sendPaymentNotifications(supabase, {
    status: internalStatus,
    mpStatusDetail: mpPayment.status_detail,
    payment,
    jobId,
  });
}

async function handleConnectEvent(
  body: MPWebhookBody,
  supabase: ReturnType<typeof createServiceClient>
) {
  const accountId = body.data.id;

  if (body.action === "mp-connect.application-unlinked") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("metadata->>mp_account_id", accountId)
      .limit(1);

    const professionalId = profiles?.[0]?.id;
    if (!professionalId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", professionalId)
      .single();

    const meta = (profile?.metadata ?? {}) as MPProfessionalMetadata & Record<string, unknown>;

    const {
      mp_access_token,
      mp_refresh_token,
      mp_public_key,
      ...restMeta
    } = meta as Record<string, unknown>;

    void mp_access_token;
    void mp_refresh_token;
    void mp_public_key;

    await supabase
      .from("profiles")
      .update({
        metadata: {
          ...restMeta,
          mp_status: "disconnected",
          mp_disconnected_at: new Date().toISOString(),
        },
      })
      .eq("id", professionalId);

    await supabase.from("notifications").insert({
      user_id: professionalId,
      type: "mp_account_disconnected",
      channel: "in_app",
      title: "⚠️ MercadoPago desconectado",
      body: "Sua conta MercadoPago foi desvinculada. Reconecte para continuar recebendo.",
      action_url: "/profissional/mercadopago-connect",
    });
  }
}

async function handleChargebackEvent(
  body: MPWebhookBody,
  supabase: ReturnType<typeof createServiceClient>,
  mp: ReturnType<typeof getMercadoPago>
) {
  const chargebackId = body.data.id;
  console.log("[MP Webhook] Chargeback:", chargebackId, "action:", body.action);

  try {
    const mpPayment = await mp.getPayment(chargebackId);
    const jobId = mpPayment.external_reference;
    if (!jobId) return;

    const { data: payment } = await supabase
      .from("payments")
      .select("id, payer_id, payee_id, amount_cents")
      .eq("job_id", jobId)
      .eq("gateway", "mercadopago")
      .maybeSingle();

    if (!payment) return;

    await supabase.from("payments").update({ status: "disputed" }).eq("id", payment.id);
    await supabase.from("jobs").update({ status: "disputed", payment_status: "disputed" }).eq("id", jobId);

    await supabase.from("disputes").insert({
      payment_id: payment.id,
      job_id: jobId,
      opened_by: payment.payer_id,
      type: "chargeback",
      reason: "chargeback_mp",
      status: "open",
      amount_cents: payment.amount_cents,
      gateway_dispute_id: chargebackId,
      description: `Chargeback via MercadoPago. ID: ${chargebackId}`,
    });

    if (payment.payee_id) {
      await supabase.from("notifications").insert({
        user_id: payment.payee_id,
        type: "dispute_opened",
        channel: "in_app",
        title: "⚠️ Contestação aberta",
        body: "Um chargeback foi iniciado. Nossa equipe está analisando o caso.",
        action_url: `/profissional/jobs/${jobId}`,
      });
    }
  } catch (err) {
    console.error("[MP Webhook] Erro ao processar chargeback:", err);
  }
}

async function sendPaymentNotifications(
  supabase: ReturnType<typeof createServiceClient>,
  opts: {
    status: string;
    mpStatusDetail: string;
    payment: { id: string; payer_id: string; payee_id: string; amount_cents: number };
    jobId: string;
  }
) {
  const { status, mpStatusDetail, payment, jobId } = opts;
  const amountFormatted = (payment.amount_cents / 100).toFixed(2).replace(".", ",");
  const notifications: Array<{
    user_id: string;
    type: string;
    channel: string;
    title: string;
    body: string;
    action_url: string;
  }> = [];

  switch (status) {
    case "captured": {
      if (payment.payer_id) {
        notifications.push({
          user_id: payment.payer_id,
          type: "payment_captured",
          channel: "in_app",
          title: "✅ Pagamento confirmado!",
          body: `R$ ${amountFormatted} aprovado via MercadoPago. O serviço está em andamento.`,
          action_url: `/cliente/jobs/${jobId}`,
        });
      }
      if (payment.payee_id) {
        notifications.push({
          user_id: payment.payee_id,
          type: "payment_received",
          channel: "in_app",
          title: "💰 Pagamento recebido!",
          body: `Pagamento de R$ ${amountFormatted} aprovado. Os fundos serão liberados após o serviço.`,
          action_url: `/profissional/jobs/${jobId}`,
        });
      }
      break;
    }

    case "pending": {
      if (payment.payer_id) {
        notifications.push({
          user_id: payment.payer_id,
          type: "payment_pending",
          channel: "in_app",
          title: "⏳ Pagamento em processamento",
          body: "Seu pagamento está sendo processado. Pode levar até 2 dias úteis.",
          action_url: `/cliente/jobs/${jobId}`,
        });
      }
      break;
    }

    case "failed": {
      const reason = translateMPStatusDetail(mpStatusDetail);
      if (payment.payer_id) {
        notifications.push({
          user_id: payment.payer_id,
          type: "payment_failed",
          channel: "in_app",
          title: "❌ Pagamento não aprovado",
          body: reason,
          action_url: `/cliente/pagamento-mp/${jobId}`,
        });
      }
      break;
    }

    case "refunded": {
      if (payment.payer_id) {
        notifications.push({
          user_id: payment.payer_id,
          type: "payment_refunded",
          channel: "in_app",
          title: "💸 Estorno processado",
          body: `R$ ${amountFormatted} foi estornado e voltará em até 10 dias úteis.`,
          action_url: `/cliente/jobs/${jobId}`,
        });
      }
      break;
    }
  }

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }
}
