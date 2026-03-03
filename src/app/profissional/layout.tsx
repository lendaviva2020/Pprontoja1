import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import SidebarCliente from "@/components/layout/SidebarCliente";

// ─── SEO ─────────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    template: "%s | ProntoJá — Área do Cliente",
    default: "Área do Cliente | ProntoJá",
  },
  description:
    "Gerencie seus pedidos de serviço, acompanhe profissionais e controle seus pagamentos na ProntoJá.",
  robots: {
    index: false, // área autenticada — não indexar
    follow: false,
  },
};

// ─── Layout ───────────────────────────────────────────────────────────────────
export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1) Verificar autenticação
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?redirectTo=/cliente/dashboard");
  }

  // 2) Verificar ROLE do usuário
  //    Um profissional NÃO pode acessar a área do cliente
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // Se houve erro ao buscar roles ou o role é "professional", redireciona
  if (roleError) {
    // Erro de banco → redirecionar para login com mensagem
    redirect("/auth/login?error=role_check_failed");
  }

  const role = roles?.role;

  if (role === "professional") {
    // Profissional tentando acessar área de cliente → redirecionar para a dele
    redirect("/profissional/dashboard");
  }

  // Se não tem role ainda (cadastro muito recente / race condition),
  // tratamos como cliente por padrão e deixamos passar
  // O trigger do Supabase deve ter criado o role — se não criou, ok por ora.

  // 3) Buscar dados do perfil para o sidebar
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarCliente
        user={{
          id: user.id,
          email: user.email!,
          full_name: profile?.full_name ?? null,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        }}
      />

      {/* Conteúdo principal — empurrado pelo sidebar (lg:ml-64) */}
      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}