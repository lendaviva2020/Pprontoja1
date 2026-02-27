import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature inválida:", err.message);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  const supabase = await createClient();

  // Idempotência
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("gateway", "stripe_connect")
    .eq("event_id", event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  await supabase.from("webhook_events").insert({
    gateway: "stripe_connect",
    event_id: event.id,
    event_type: event.type,
    payload: event as any,
    status: "processing",
  });

  try {
    switch (event.type) {
      // ─── Conta conectada atualizada ───────────────────────────────────────
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.supabase_user_id;
        if (!userId) break;

        const { data: profile } = await supabase
          .from("profiles")
          .select("metadata")
          .eq("id", userId)
          .single();

        const meta = (profile?.metadata as Record<string, any>) || {};
        const isActive = account.charges_enabled && account.payouts_enabled;

        await supabase.from("profiles").update({
          metadata: {
            ...meta,
            stripe_account_id: account.id,
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_details_submitted: account.details_submitted,
            stripe_status: isActive ? "active" : "incomplete",
            stripe_updated_at: new Date().toISOString(),
          },
        }).eq("id", userId);

        // Notificar profissional se conta ficou ativa
        if (isActive) {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "stripe_account_activated",
            channel: "in_app",
            title: "🎉 Conta de pagamentos ativada!",
            body: "Sua conta está pronta. Você pode receber pagamentos pelos seus serviços.",
            action_url: "/profissional/financeiro",
          });
        }
        break;
      }

      // ─── Pagamento para conta conectada (repasse) ─────────────────────────
      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        // Registrar repasse realizado
        console.log("Transfer created:", transfer.id, transfer.amount);
        break;
      }

      // ─── Saque da conta conectada ─────────────────────────────────────────
      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        const connectedAccountId = (event as any).account as string;

        // Buscar profissional pela conta Stripe
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .filter("metadata->stripe_account_id", "eq", connectedAccountId)
          .limit(1);

        const professionalId = profiles?.[0]?.id;

        if (professionalId) {
          await supabase.from("notifications").insert({
            user_id: professionalId,
            type: "payout_paid",
            channel: "in_app",
            title: "💰 Pagamento enviado!",
            body: `R$ ${(payout.amount / 100).toFixed(2).replace(".", ",")} foi enviado para sua conta bancária.`,
            action_url: "/profissional/financeiro",
          });
        }
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        const connectedAccountId = (event as any).account as string;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .filter("metadata->stripe_account_id", "eq", connectedAccountId)
          .limit(1);

        const professionalId = profiles?.[0]?.id;
        if (professionalId) {
          await supabase.from("notifications").insert({
            user_id: professionalId,
            type: "payout_failed",
            channel: "in_app",
            title: "⚠️ Falha no saque",
            body: `Houve um problema ao enviar seu pagamento: ${payout.failure_message || "erro desconhecido"}. Verifique seus dados bancários.`,
            action_url: "/profissional/stripe-connect",
          });
        }
        break;
      }

      // ─── Capability aprovada (receber pagamentos) ─────────────────────────
      case "capability.updated": {
        const capability = event.data.object as Stripe.Capability;
        if (capability.status === "active") {
          console.log("Capability ativada:", capability.id, "para conta:", (event as any).account);
        }
        break;
      }
    }

    await supabase.from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", event.id)
      .eq("gateway", "stripe_connect");

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Erro ao processar webhook Connect:", err);
    await supabase.from("webhook_events")
      .update({ status: "failed", error_message: err.message })
      .eq("event_id", event.id)
      .eq("gateway", "stripe_connect");

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
