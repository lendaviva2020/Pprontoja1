import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  const tipo = searchParams.get("tipo") as "cliente" | "profissional" | null;

  if (!next.startsWith("/")) next = "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Para novos usuários (OAuth), criar profile e user_role se necessário
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const service = createServiceClient();
          const userId = data.user.id;
          const fullName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email?.split("@")[0] ?? "Usuário";
          const avatarUrl = data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture ?? null;

          const role = tipo === "profissional" ? "professional" : "client";

          // Upsert profile (para OAuth - o trigger pode não ter criado)
          await service.from("profiles").upsert(
            {
              id: userId,
              full_name: fullName,
              avatar_url: avatarUrl,
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

          // Verificar se já tem role; se não, criar
          const { data: existingRole } = await service
            .from("user_roles")
            .select("id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

          if (!existingRole && role) {
            await service.from("user_roles").insert({
              user_id: userId,
              role,
            });
          }
        } catch (err) {
          console.error("[Auth callback] Erro ao criar profile/role:", err);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
