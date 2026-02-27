import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, metadata")
      .eq("id", user.id)
      .single();

    const meta = (profile?.metadata as Record<string, string>) || {};
    let stripeAccountId = meta.stripe_account_id;

    // Criar conta Express se não existir
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          email: user.email,
          first_name: profile?.full_name?.split(" ")[0],
          last_name: profile?.full_name?.split(" ").slice(1).join(" ") || "",
        },
        settings: {
          payouts: {
            schedule: { interval: "manual" }, // controle manual de repasses
          },
        },
        metadata: { supabase_user_id: user.id },
      });

      stripeAccountId = account.id;

      // Salvar na tabela profiles.metadata
      await supabase
        .from("profiles")
        .update({
          metadata: {
            ...meta,
            stripe_account_id: stripeAccountId,
            stripe_onboarding_started_at: new Date().toISOString(),
          },
        })
        .eq("id", user.id);
    }

    // Criar Account Link para onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profissional/stripe-connect?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profissional/stripe-connect/retorno`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error("Stripe Connect error:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao criar conta Stripe" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    const meta = (profile?.metadata as Record<string, string>) || {};
    const stripeAccountId = meta.stripe_account_id;

    if (!stripeAccountId) {
      return NextResponse.json({ status: "not_started" });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);

    const status = account.charges_enabled && account.payouts_enabled
      ? "active"
      : account.details_submitted
      ? "pending_verification"
      : "incomplete";

    return NextResponse.json({
      status,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
      stripe_account_id: stripeAccountId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
