"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

type FilterTab = "all" | "unread" | "admin_alert" | "achievement";

const TYPE_ICONS: Record<string, string> = {
  admin_alert: "!",
  achievement: "*",
  system: "i",
  meal_reminder: "m",
};

const TYPE_COLORS: Record<string, string> = {
  admin_alert: "bg-[#E51A1A]",
  achievement: "bg-[#FFB800]",
  system: "bg-white/20",
  meal_reminder: "bg-[#FF6B00]",
};

export default function HubNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAsRead(id: number) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // revert on error
      fetchNotifications();
    }
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      fetchNotifications();
    }
  }

  function timeAgo(dateStr: string) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "admin_alert") return n.type === "admin_alert";
    if (filter === "achievement") return n.type === "achievement";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "admin_alert", label: "Admin Alerts" },
    { key: "achievement", label: "Achievements" },
  ];

  return (
    <div className="space-y-6 max-w-3xl w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-white">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1E1E1E] text-white/60 hover:text-white border border-[#2A2A2A] cursor-pointer transition-colors min-h-[44px]"
          >
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer border-none transition-colors min-h-[44px] ${
              filter === t.key
                ? "bg-[#E51A1A] text-white"
                : "bg-[#1E1E1E] text-white/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#E51A1A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl">
          <svg className="w-12 h-12 text-white/10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm text-white/30">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`bg-[#1E1E1E] border rounded-2xl px-4 py-3 transition-colors cursor-pointer ${
                n.isRead
                  ? "border-[#2A2A2A] hover:bg-[#252525]"
                  : "border-[#E51A1A]/30 hover:bg-[#1E1E1E]/80"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Type Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    TYPE_COLORS[n.type] || "bg-white/20"
                  }`}
                >
                  {TYPE_ICONS[n.type] || "?"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#E51A1A] shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-white/60 mt-0.5 break-words">{n.message}</p>
                  <p className="text-xs text-white/30 mt-1">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Arrow for actionUrl */}
                {n.actionUrl && (
                  <div className="flex items-center shrink-0 mt-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/30"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
