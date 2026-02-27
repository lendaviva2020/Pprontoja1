"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CreditCard, AlertTriangle, Users,
  FileText, Settings, LogOut, ShieldCheck, Menu, X, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const links = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/admin/disputas", label: "Disputas", icon: AlertTriangle },
  { href: "/admin/profissionais", label: "Profissionais", icon: Users },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/logs", label: "Logs de auditoria", icon: FileText },
];

interface Props {
  user: { email: string; role: string };
}

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    finance: "Financeiro",
    support: "Suporte",
  };

  const NavContent = () => (
    <>
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">ProntoJá Admin</p>
            <p className="text-xs text-gray-400">{roleLabel[user.role] || user.role}</p>
          </div>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 px-2">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 px-4 py-4">
        <p className="mb-2 truncate text-xs text-gray-500">{user.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white shadow-md lg:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-gray-900 lg:flex">
        <NavContent />
      </aside>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gray-900 transition-transform duration-300 lg:hidden",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="pt-16"><NavContent /></div>
      </aside>
    </>
  );
}
