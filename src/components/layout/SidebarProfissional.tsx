"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Search, FileText, DollarSign, Star, LogOut, Zap, Menu, X, ToggleLeft, ToggleRight, User, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import { useState } from "react";
import { toast } from "sonner";

const links = [
  { href: "/profissional/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profissional/oportunidades", label: "Oportunidades", icon: Search },
  { href: "/profissional/propostas", label: "Propostas", icon: FileText },
  { href: "/profissional/avaliacoes", label: "Avaliações", icon: Star },
  { href: "/profissional/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/profissional/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/profissional/perfil", label: "Meu Perfil", icon: User },
  { href: "/profissional/configuracoes", label: "Configurações", icon: Settings },
];

interface Props {
  user: {
    id: string;
    email: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string | null;
    rating_avg?: number | null;
    is_available?: boolean | null;
  };
}

export default function SidebarProfissional({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(user.is_available ?? true);
  const [toggling, setToggling] = useState(false);

  async function toggleAvailability() {
    setToggling(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const newVal = !available;
    await supabase.from("profiles").update({ is_available: newVal }).eq("id", authUser.id);
    setAvailable(newVal);
    toast.success(newVal ? "Você está disponível para novos serviços!" : "Você ficou indisponível.");
    setToggling(false);
  }

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
        <span className="text-xs rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">Pro</span>
        <div className="ml-auto">
          <NotificationBell userId={user.id} notificationsHref="/profissional/notificacoes" />
        </div>
      </div>

      {/* Toggle disponibilidade */}
      <div className="mx-2 mt-3 mb-1">
        <button
          onClick={toggleAvailability}
          disabled={toggling}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
            available ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-500"
          )}
        >
          <span className="font-medium">{available ? "🟢 Disponível" : "⚫ Indisponível"}</span>
          {available
            ? <ToggleRight className="h-5 w-5 text-brand-500" />
            : <ToggleLeft className="h-5 w-5 text-gray-400" />}
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-2">
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
            {user.rating_avg && (
              <p className="text-xs text-yellow-600">⭐ {Number(user.rating_avg).toFixed(1)}</p>
            )}
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
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md border border-gray-200 lg:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-white border-r border-gray-100 shadow-sm lg:flex">
        <NavContent />
      </aside>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-gray-100 shadow-xl transition-transform duration-300 lg:hidden",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="pt-16"><NavContent /></div>
      </aside>
    </>
  );
}
