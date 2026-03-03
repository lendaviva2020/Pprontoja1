import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MercadoPagoClient,
  refreshMPToken,
  type MPProfessionalMetadata,
} from "@/lib/mercadopago";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    const meta = (profile?.metadata ?? {}) as MPProfessionalMetadata & Record<string, unknown>;

    const status = meta.mp_status ?? "not_connected";
    const isConnected = status === "connected";
    const hasToken = !!meta.mp_access_token;

    let tokenExpired = false;
    if (meta.mp_expires_at) {
      tokenExpired = new Date(meta.mp_expires_at) < new Date();
    }

    if (isConnected && hasToken && tokenExpired && meta.mp_refresh_token) {
      try {
        const service = createServiceClient();
        const newTokens = await refreshMPToken(meta.mp_refresh_token);

        const expiresAt = new Date(
          Date.now() + newTokens.expires_in * 1000
        ).toISOString();

        await service
          .from("profiles")
          .update({
            metadata: {
              ...meta,
              mp_access_token: newTokens.access_token,
              mp_refresh_token: newTokens.refresh_token,
              mp_expires_at: expiresAt,
            },
          })
          .eq("id", user.id);

        tokenExpired = false;
      } catch (err) {
        console.error("[MP Connect] Falha ao renovar token:", err);
      }
    }

    let accountNickname = meta.mp_nickname ?? null;

    if (isConnected && hasToken && !tokenExpired && meta.mp_access_token) {
      try {
        const mpClient = new MercadoPagoClient(meta.mp_access_token);
        const accountInfo = await mpClient.getAccountInfo();
        accountNickname = accountInfo.nickname ?? accountInfo.email;
      } catch {
        // Conta pode ter sido revogada
      }
    }

    return NextResponse.json({
      status,
      is_connected: isConnected && !tokenExpired,
      token_expired: tokenExpired,
      mp_account_id: meta.mp_account_id ?? null,
      mp_nickname: accountNickname,
      mp_email: meta.mp_email ?? null,
      mp_live_mode: meta.mp_live_mode ?? false,
      mp_connected_at: meta.mp_connected_at ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[MP Connect GET]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const service = createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    const meta = (profile?.metadata ?? {}) as MPProfessionalMetadata & Record<string, unknown>;

    const {
      mp_access_token,
      mp_refresh_token,
      mp_account_id,
      mp_public_key,
      mp_user_id,
      mp_expires_at,
      ...restMeta
    } = meta as Record<string, unknown>;

    void mp_access_token;
    void mp_refresh_token;
    void mp_account_id;
    void mp_public_key;
    void mp_user_id;
    void mp_expires_at;

    await service
      .from("profiles")
      .update({
        metadata: {
          ...restMeta,
          mp_status: "disconnected",
          mp_disconnected_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    await service.from("notifications").insert({
      user_id: user.id,
      type: "mp_account_disconnected",
      channel: "in_app",
      title: "⚠️ MercadoPago desconectado",
      body: "Sua conta MercadoPago foi desconectada. Reconecte para continuar recebendo pagamentos.",
      action_url: "/profissional/mercadopago-connect",
    });

    await service.from("audit_logs").insert({
      actor_id: user.id,
      action: "mercadopago.account_disconnected",
      entity_type: "profile",
      entity_id: user.id,
      changes: { disconnected_at: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, message: "Conta desconectada" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
