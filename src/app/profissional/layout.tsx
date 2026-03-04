import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import SidebarProfissional from "@/components/layout/SidebarProfissional";

// ─── SEO ─────────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    template: "%s | ProntoJá — Área do Profissional",
    default: "Área do Profissional | ProntoJá",
  },
  description:
    "Gerencie suas propostas, serviços, avaliações e pagamentos na ProntoJá.",
  robots: {
    index: false,
    follow: false,
  },
};

// ─── Layout área profissional ────────────────────────────────────────────────
export default async function ProfissionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?redirectTo=/profissional/dashboard");
  }

  // Verificar role: cliente não pode acessar área profissional
  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (roleError) {
    redirect("/auth/login?error=role_check_failed");
  }

  if (roleRow?.role === "client") {
    redirect("/cliente/dashboard");
  }

  // Perfil para o sidebar (profissional precisa de is_available, rating)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, display_name, rating_avg, is_available")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarProfissional
        user={{
          id: user.id,
          email: user.email!,
          full_name: profile?.full_name ?? null,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          rating_avg: profile?.rating_avg ?? null,
          is_available: profile?.is_available ?? true,
        }}
      />
      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
