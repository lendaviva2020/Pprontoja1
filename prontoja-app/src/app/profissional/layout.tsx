import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SidebarProfissional from "@/components/layout/SidebarProfissional";

export default async function ProfissionalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, display_name, rating_avg, is_available")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarProfissional user={{ email: user.email!, ...profile }} />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
