import { createClient } from "@/lib/supabase/server";
import { getMPOAuthUrl } from "@/lib/mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/mercadopago/oauth
 *
 * Inicia o fluxo OAuth do MercadoPago para um profissional.
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?redirectTo=/profissional/mercadopago-connect`
    );
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (role?.role !== "professional") {
    return NextResponse.json(
      { error: "Apenas profissionais podem conectar conta MercadoPago" },
      { status: 403 }
    );
  }

  const state = `${user.id}_${crypto.randomUUID()}`;

  await service.from("oauth_states").upsert(
    {
      state,
      user_id: user.id,
      gateway: "mercadopago",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id,gateway" }
  );

  try {
    const oauthUrl = getMPOAuthUrl(state);
    return NextResponse.redirect(oauthUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar URL OAuth";
    console.error("[MP OAuth] Erro:", msg);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/profissional/mercadopago-connect?error=${encodeURIComponent(msg)}`
    );
  }
}
