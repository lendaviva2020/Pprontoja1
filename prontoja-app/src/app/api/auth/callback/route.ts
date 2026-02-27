import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { AppRole } from "@/types/database";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const tipo = searchParams.get("tipo");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const serviceClient = createServiceClient();

        const { data: existingRoles } = await serviceClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1);

        let role: AppRole | undefined = existingRoles?.[0]?.role;

        if (!existingRoles || existingRoles.length === 0) {
          role = tipo === "profissional" ? "professional" : "client";
          await serviceClient.from("user_roles").insert({
            user_id: user.id,
            role,
          });

          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "";

          await serviceClient.from("profiles").upsert({
            id: user.id,
            full_name: fullName,
            display_name: fullName,
            avatar_url: user.user_metadata?.avatar_url || null,
            status: "active" as const,
          });
        }

        if (next) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        const dest = role === "professional"
          ? "/profissional/dashboard"
          : "/cliente/dashboard";
        return NextResponse.redirect(`${origin}${dest}`);
      }

      return NextResponse.redirect(`${origin}${next || "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
