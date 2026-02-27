"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Plus, ClipboardList, MessageSquare, LogOut, Zap, Menu, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import { useState } from "react";

const links = [
  { href: "/cliente/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cliente/jobs/novo", label: "Solicitar serviço", icon: Plus },
  { href: "/cliente/jobs", label: "Meus pedidos", icon: ClipboardList },
  { href: "/cliente/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/cliente/configuracoes", label: "Configurações", icon: Settings },
];

interface Props {
  user: { id: string; email: string; full_name?: string; display_name?: string; avatar_url?: string | null };
}

export default function SidebarCliente({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const name = user.display_name || user.full_name || user.email;
  const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-4 pb-6 pt-2 border-b border-gray-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">ProntoJá</span>
        <div className="ml-auto">
          <NotificationBell userId={user.id} notificationsHref="/cliente/notificacoes" />
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md border border-gray-200 lg:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-white border-r border-gray-100 shadow-sm lg:flex">
        <NavContent />
      </aside>

      {/* Sidebar mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-gray-100 shadow-xl transition-transform duration-300 lg:hidden",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="pt-16">
          <NavContent />
        </div>
      </aside>
    </>
  );
}
