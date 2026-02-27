import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Verificar role admin
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = roles?.some(r => ["admin", "super_admin", "finance", "support"].includes(r.role));
  if (!isAdmin) redirect("/");

  const topRole = roles?.find(r => ["super_admin", "admin", "finance", "support"].includes(r.role))?.role;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar user={{ email: user.email!, role: topRole || "support" }} />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
