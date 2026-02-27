"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  type: string;
};

const TYPE_ICONS: Record<string, string> = {
  new_proposal: "💬",
  proposal_accepted: "✅",
  payment_confirmed: "💳",
  payment_captured: "💳",
  payment_received: "💰",
  payment_released: "💰",
  payment_refunded: "💸",
  payment_failed: "❌",
  new_message: "📩",
  job_completed: "🎉",
  new_review: "⭐",
  default: "🔔",
};

export default function ClienteNotificacoesPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, action_url, is_read, created_at, type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data as NotificationItem[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/cliente/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notificações</h1>
            <p className="text-sm text-gray-500">
              {unread > 0 ? `${unread} não lida${unread !== 1 ? "s" : ""}` : "Todas lidas"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
            <Bell className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-gray-500">Nenhuma notificação ainda</p>
            <Link href="/cliente/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
              Voltar ao dashboard
            </Link>
          </div>
        ) : (
          notifications.map((n) => {
            const emoji = TYPE_ICONS[n.type] ?? TYPE_ICONS.default;
            const content = (
              <div
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex cursor-pointer gap-4 rounded-xl border p-4 transition-colors hover:bg-gray-50 ${
                  !n.is_read ? "border-brand-100 bg-brand-50/30" : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex-shrink-0 text-2xl">{emoji}</div>
                <div className="min-w-0 flex-1">
                  <p className={n.is_read ? "font-medium text-gray-900" : "font-semibold text-gray-900"}>
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                )}
              </div>
            );

            return n.action_url ? (
              <Link key={n.id} href={n.action_url}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
