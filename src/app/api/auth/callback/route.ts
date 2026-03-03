import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// ─── Forçar execução dinâmica (nunca cachear callbacks de autenticação) ────────
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/callback
//
// Fluxo suportado:
//   1. Confirmação de e-mail após cadastro (email + password)
//   2. OAuth (Google, GitHub, etc.)
//
// Query params opcionais:
//   ?tipo=cliente|profissional  → hint do tipo de usuário (vem do cadastro)
//   ?next=/alguma/rota          → rota final após login
//
// Lógica de redirect final:
//   - Se o usuário JÁ TEM um role no banco → vai ao dashboard do seu role
//   - Se ainda NÃO TEM role → usa o ?tipo para criar, ou cai no /cliente/dashboard
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tipo = searchParams.get("tipo") as "cliente" | "profissional" | null;

  // Validar o parâmetro "next" para evitar open redirect
  let next = searchParams.get("next") ?? "";
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "";
  }

  // ── Sem código → erro imediato ──
  if (!code) {
    console.error("[Auth callback] Código ausente na URL");
    return NextResponse.redirect(
      `${origin}/auth/login?error=missing_code`
    );
  }

  // ── Trocar code por sessão ────────────────────────────────────────────────
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component lendo cookies read-only — ignorar
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[Auth callback] Erro ao trocar código:", error?.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth_callback_failed`
    );
  }

  const userId = data.user.id;
  const userEmail = data.user.email ?? "";

  // ── Criar/atualizar profile e role via service client ─────────────────────
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const service = createServiceClient();

      // Dados do perfil (vêm do OAuth metadata ou do cadastro email/password)
      const fullName =
        data.user.user_metadata?.full_name ??
        data.user.user_metadata?.name ??
        userEmail.split("@")[0] ??
        "Usuário";

      const avatarUrl =
        data.user.user_metadata?.avatar_url ??
        data.user.user_metadata?.picture ??
        null;

      // 1) Upsert no profiles (para OAuth — o trigger pode não ter criado ainda)
      await service
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: fullName,
            avatar_url: avatarUrl,
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id", ignoreDuplicates: false }
        );

      // 2) Verificar se o usuário JÁ TEM um role cadastrado
      const { data: existingRole } = await service
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (existingRole) {
        // ── Usuário existente: respeitar o role que ele JÁ TEM ──────────────
        // Ignorar completamente o ?tipo da URL — pode ser um re-login
        const dashboardDestino =
          existingRole.role === "professional"
            ? "/profissional/dashboard"
            : "/cliente/dashboard";

        return NextResponse.redirect(`${origin}${dashboardDestino}`);
      }

      // ── Usuário novo: criar o role baseado no ?tipo ──────────────────────
      const roleParaCriar = tipo === "profissional" ? "professional" : "client";

      const { error: roleError } = await service
        .from("user_roles")
        .insert({ user_id: userId, role: roleParaCriar });

      if (roleError) {
        // Pode ocorrer race condition com o trigger do Supabase — verificar novamente
        console.warn(
          "[Auth callback] Erro ao inserir role (possível duplicata):",
          roleError.message
        );
      }

      // ── Determinar destino final ─────────────────────────────────────────
      let destino: string;

      if (next) {
        // Respeitar o ?next se foi passado explicitamente no cadastro
        destino = next;
      } else if (roleParaCriar === "professional") {
        // Profissional novo → onboarding
        destino = "/profissional/onboarding";
      } else {
        // Cliente novo → dashboard
        destino = "/cliente/dashboard";
      }

      return NextResponse.redirect(`${origin}${destino}`);
    } catch (err) {
      console.error("[Auth callback] Erro ao criar profile/role:", err);
      // Falha na criação do profile não deve bloquear o login
      // Redirecionar para home como fallback seguro
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // ── Fallback: service role não configurado (ambiente de dev sem .env) ─────
  // Tentar detectar role pelo cliente anon (menos confiável mas funcional)
  const { data: rolesFallback } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (rolesFallback?.role === "professional") {
    return NextResponse.redirect(`${origin}/profissional/dashboard`);
  }

  if (rolesFallback?.role === "client") {
    return NextResponse.redirect(`${origin}/cliente/dashboard`);
  }

  // Sem role → ir para o next ou home
  const fallbackDest = next || "/";
  return NextResponse.redirect(`${origin}${fallbackDest}`);
}