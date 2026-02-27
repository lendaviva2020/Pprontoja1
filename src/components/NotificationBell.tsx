"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDateTime } from "@/lib/utils";
import Link from "next/link";

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
  stripe_account_activated: "🎉",
  payout_paid: "💰",
  payout_failed: "⚠️",
  default: "🔔",
};

interface NotificationBellProps {
  userId: string;
  notificationsHref?: string;
}

export default function NotificationBell({ userId, notificationsHref }: NotificationBellProps) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    async function loadNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, action_url, is_read, created_at, type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data as NotificationItem[]);
    }
    loadNotifications();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as NotificationItem;
          setNotifications((prev) => [{ ...n, is_read: n.is_read ?? false }, ...prev]);
          try {
            new Audio("/notification.mp3").play();
          } catch {
            // ignore
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          open ? "bg-brand-50 text-brand-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        )}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Notificações</span>
              {unread > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                  {unread} nova{unread !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                <p className="text-sm text-gray-400">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => {
                const emoji = TYPE_ICONS[n.type] ?? TYPE_ICONS.default;
                const content = (
                  <div
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-gray-50",
                      !n.is_read && "bg-brand-50/50"
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0 text-lg leading-none">{emoji}</div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm text-gray-900", !n.is_read && "font-semibold")}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="mt-2 flex-shrink-0">
                        <span className="block h-2 w-2 rounded-full bg-brand-500" />
                      </div>
                    )}
                  </div>
                );

                const url = n.action_url;
                return url ? (
                  <Link key={n.id} href={url} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>

          {notificationsHref && (
            <div className="border-t border-gray-100 px-4 py-3 text-center">
              <Link
                href={notificationsHref}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Ver todas as notificações
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
