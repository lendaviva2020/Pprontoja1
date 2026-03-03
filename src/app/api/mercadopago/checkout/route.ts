import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MercadoPagoClient,
  calculateMPFees,
  refreshMPToken,
  type MPProfessionalMetadata,
} from "@/lib/mercadopago";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/mercadopago/checkout
 *
 * Cria uma Preference do MercadoPago para pagamento de um job.
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

    let body: { job_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { job_id } = body;
    if (!job_id) {
      return NextResponse.json({ error: "job_id é obrigatório" }, { status: 400 });
    }

    const { data: jobData } = await supabase
      .from("jobs")
      .select(
        `id, title, description, status, agreed_price_cents, platform_fee_pct,
         client_id, professional_id, payment_status,
         professional:professional_id(id, full_name, display_name, metadata),
         client:client_id(full_name, email)`
      )
      .eq("id", job_id)
      .eq("client_id", user.id)
      .single();

    if (!jobData) {
      return NextResponse.json(
        { error: "Job não encontrado ou sem permissão" },
        { status: 404 }
      );
    }

    const job = jobData as typeof jobData & {
      professional: { id: string; full_name: string; display_name: string | null; metadata: MPProfessionalMetadata } | null;
      client: { full_name: string; email: string } | null;
    };

    if (job.status !== "accepted") {
      return NextResponse.json(
        { error: `Job no status '${job.status}' não pode ser pago` },
        { status: 400 }
      );
    }

    if (!job.agreed_price_cents || job.agreed_price_cents <= 0) {
      return NextResponse.json(
        { error: "Preço não acordado ou inválido" },
        { status: 400 }
      );
    }

    const { data: existingPayment } = await service
      .from("payments")
      .select("id, status, gateway_payment_id, metadata")
      .eq("job_id", job_id)
      .eq("gateway", "mercadopago")
      .in("status", ["pending", "captured", "authorized"])
      .maybeSingle();

    if (existingPayment) {
      if (existingPayment.status === "pending" && existingPayment.gateway_payment_id) {
        const meta = (existingPayment.metadata ?? {}) as Record<string, string>;
        const initPoint = meta.mp_init_point;
        const sandboxPoint = meta.mp_sandbox_init_point;

        if (initPoint) {
          const row = existingPayment as unknown as { platform_fee_cents: number; professional_payout_cents: number; amount_cents: number };
          return NextResponse.json({
            preference_id: existingPayment.gateway_payment_id,
            init_point: initPoint,
            sandbox_init_point: sandboxPoint ?? initPoint,
            payment_id: existingPayment.id,
            amount_cents: row.amount_cents,
            platform_fee_cents: row.platform_fee_cents,
            professional_payout_cents: row.professional_payout_cents,
            reused: true,
          });
        }
      }

      if (["captured", "authorized"].includes(existingPayment.status)) {
        return NextResponse.json(
          { error: "Este serviço já foi pago" },
          { status: 409 }
        );
      }
    }

    const professional = Array.isArray(job.professional)
      ? job.professional[0]
      : job.professional;

    const meta = professional?.metadata as MPProfessionalMetadata | null;

    if (!meta?.mp_access_token || meta.mp_status !== "connected") {
      return NextResponse.json(
        {
          error:
            "O profissional ainda não conectou sua conta MercadoPago. Peça que ele configure em /profissional/mercadopago-connect.",
        },
        { status: 422 }
      );
    }

    let accessToken = meta.mp_access_token;

    if (meta.mp_expires_at && new Date(meta.mp_expires_at) < new Date()) {
      if (!meta.mp_refresh_token) {
        return NextResponse.json(
          { error: "Token do profissional expirado. Peça que ele reconecte." },
          { status: 422 }
        );
      }
      try {
        const newTokens = await refreshMPToken(meta.mp_refresh_token);
        accessToken = newTokens.access_token;

        const { data: proProfile } = await service
          .from("profiles")
          .select("metadata")
          .eq("id", professional!.id)
          .single();

        const currentMeta = (proProfile?.metadata ?? {}) as Record<string, unknown>;

        await service
          .from("profiles")
          .update({
            metadata: {
              ...currentMeta,
              mp_access_token: newTokens.access_token,
              mp_refresh_token: newTokens.refresh_token,
              mp_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            },
          })
          .eq("id", professional!.id);
      } catch {
        return NextResponse.json(
          { error: "Falha ao renovar token MP do profissional. Peça que ele reconecte." },
          { status: 422 }
        );
      }
    }

    const platformFeePct = job.platform_fee_pct ?? 10;
    const fees = calculateMPFees(job.agreed_price_cents, platformFeePct);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const clientInfo = Array.isArray(job.client) ? job.client[0] : job.client;
    const professionalName =
      professional?.display_name ?? professional?.full_name ?? "Profissional";

    const mpWithProToken = new MercadoPagoClient(accessToken);

    const preference = await mpWithProToken.createPreference({
      items: [
        {
          id: job_id,
          title: `ProntoJá: ${job.title}`,
          description:
            (job as { description?: string }).description?.slice(0, 255) ??
            `Serviço prestado por ${professionalName}`,
          quantity: 1,
          unit_price: fees.amountBRL,
          currency_id: "BRL",
          category_id: "services",
        },
      ],
      payer: clientInfo
        ? {
            name: clientInfo.full_name?.split(" ")[0],
            surname: clientInfo.full_name?.split(" ").slice(1).join(" "),
            email: clientInfo.email,
          }
        : undefined,
      back_urls: {
        success: `${appUrl}/cliente/pagamento-mp/sucesso?job_id=${job_id}`,
        pending: `${appUrl}/cliente/pagamento-mp/pendente?job_id=${job_id}`,
        failure: `${appUrl}/cliente/pagamento-mp/falhou?job_id=${job_id}`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/mercadopago/webhook`,
      external_reference: job_id,
      marketplace_fee: fees.platformFeesBRL,
      statement_descriptor: "PRONTOJA",
      expires: true,
      expiration_date_to: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
      metadata: {
        job_id,
        client_id: user.id,
        professional_id: professional?.id ?? "",
        platform_fee_pct: String(platformFeePct),
      },
    });

    const { data: payment, error: insertError } = await service
      .from("payments")
      .insert({
        job_id,
        payer_id: user.id,
        payee_id: professional?.id,
        gateway: "mercadopago",
        gateway_payment_id: preference.id,
        gateway_account_id: meta.mp_account_id,
        amount_cents: job.agreed_price_cents,
        platform_fee_cents: fees.platformFeesCents,
        professional_payout_cents: fees.professionalPayoutCents,
        currency: "BRL",
        status: "pending",
        metadata: {
          mp_preference_id: preference.id,
          mp_init_point: preference.init_point,
          mp_sandbox_init_point: preference.sandbox_init_point,
          mp_collector_id: String(preference.collector_id),
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[MP Checkout] Erro ao inserir payment:", insertError);
      return NextResponse.json(
        { error: "Erro ao registrar pagamento" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      payment_id: payment?.id,
      amount_cents: job.agreed_price_cents,
      amount_brl: fees.amountBRL,
      platform_fee_cents: fees.platformFeesCents,
      platform_fee_brl: fees.platformFeesBRL,
      professional_payout_cents: fees.professionalPayoutCents,
      professional_payout_brl: fees.professionalPayoutBRL,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[MP Checkout] Erro:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
