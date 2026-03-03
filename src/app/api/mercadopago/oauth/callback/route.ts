import { createServiceClient } from "@/lib/supabase/service";
import {
  exchangeMPCode,
  MercadoPagoClient,
  type MPProfessionalMetadata,
} from "@/lib/mercadopago";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/mercadopago/oauth/callback
 *
 * Callback do OAuth do MercadoPago.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    console.warn("[MP OAuth Callback] Usuário cancelou ou erro:", errorParam);
    return NextResponse.redirect(
      `${appUrl}/profissional/mercadopago-connect?error=cancelled`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/profissional/mercadopago-connect?error=missing_params`
    );
  }

  const service = createServiceClient();

  const { data: oauthState, error: stateError } = await service
    .from("oauth_states")
    .select("user_id, expires_at")
    .eq("state", state)
    .eq("gateway", "mercadopago")
    .maybeSingle();

  if (stateError || !oauthState) {
    console.error("[MP OAuth Callback] State inválido:", state);
    return NextResponse.redirect(
      `${appUrl}/profissional/mercadopago-connect?error=invalid_state`
    );
  }

  if (new Date(oauthState.expires_at) < new Date()) {
    await service.from("oauth_states").delete().eq("state", state);
    return NextResponse.redirect(
      `${appUrl}/profissional/mercadopago-connect?error=state_expired`
    );
  }

  const userId = oauthState.user_id;

  await service.from("oauth_states").delete().eq("state", state);

  let tokenData;
  try {
    tokenData = await exchangeMPCode(code);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao trocar código";
    console.error("[MP OAuth Callback] Erro na troca de código:", msg);
    return NextResponse.redirect(
      `${appUrl}/profissional/mercadopago-connect?error=token_exchange_failed`
    );
  }

  let accountInfo;
  try {
    const mpClient = new MercadoPagoClient(tokenData.access_token);
    accountInfo = await mpClient.getAccountInfo();
  } catch {
    // Não crítico
  }

  const { data: profile } = await service
    .from("profiles")
    .select("metadata")
    .eq("id", userId)
    .single();

  const currentMeta = (profile?.metadata as Record<string, unknown>) ?? {};

  const expiresAt = new Date(
    Date.now() + tokenData.expires_in * 1000
  ).toISOString();

  const mpMeta: MPProfessionalMetadata = {
    mp_access_token: tokenData.access_token,
    mp_refresh_token: tokenData.refresh_token,
    mp_account_id: String(tokenData.user_id),
    mp_public_key: tokenData.public_key,
    mp_user_id: String(tokenData.user_id),
    mp_expires_at: expiresAt,
    mp_scope: tokenData.scope,
    mp_live_mode: tokenData.live_mode,
    mp_nickname: accountInfo?.nickname,
    mp_email: accountInfo?.email,
    mp_status: "connected",
    mp_connected_at: new Date().toISOString(),
  };

  const { error: updateError } = await service
    .from("profiles")
    .update({
      metadata: { ...currentMeta, ...mpMeta },
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("[MP OAuth Callback] Erro ao salvar tokens:", updateError);
    return NextResponse.redirect(
      `${appUrl}/profissional/mercadopago-connect?error=save_failed`
    );
  }

  await service.from("notifications").insert({
    user_id: userId,
    type: "mp_account_connected",
    channel: "in_app",
    title: "✅ MercadoPago conectado!",
    body: accountInfo
      ? `Conta ${accountInfo.nickname ?? accountInfo.email} conectada. Você já pode receber pagamentos.`
      : "Sua conta foi conectada. Você já pode receber pagamentos.",
    action_url: "/profissional/mercadopago-connect",
  });

  await service.from("audit_logs").insert({
    actor_id: userId,
    action: "mercadopago.account_connected",
    entity_type: "profile",
    entity_id: userId,
    changes: {
      mp_account_id: String(tokenData.user_id),
      mp_live_mode: tokenData.live_mode,
      connected_at: new Date().toISOString(),
    },
  });

  return NextResponse.redirect(
    `${appUrl}/profissional/mercadopago-connect?success=true`
  );
}
