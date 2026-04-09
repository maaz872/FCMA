"use client";

import { useState, useEffect, useCallback } from "react";

interface NotificationRecord {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const TYPE_OPTIONS = [
  { value: "admin_alert", label: "Admin Alert" },
  { value: "achievement", label: "Achievement" },
  { value: "system", label: "System" },
  { value: "meal_reminder", label: "Meal Reminder" },
];

const TYPE_COLORS: Record<string, string> = {
  admin_alert: "bg-[#E51A1A]/20 text-[#E51A1A]",
  achievement: "bg-[#FFB800]/20 text-[#FFB800]",
  system: "bg-white/10 text-white/70",
  meal_reminder: "bg-[#FF6B00]/20 text-[#FF6B00]",
};

export default function AdminNotificationsPage() {
  const [recipientMode, setRecipientMode] = useState<"all" | "specific">("all");
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("admin_alert");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      setHistory(data.notifications || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // User search
  useEffect(() => {
    if (recipientMode !== "specific" || userSearch.length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
        const data = await res.json();
        setUserResults(
          (data.users || []).slice(0, 10).map((u: UserOption) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
          }))
        );
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, recipientMode]);

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    if (recipientMode === "specific" && !selectedUser) return;

    setSending(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const body: Record<string, string> = { title, message, type };
      if (recipientMode === "specific" && selectedUser) {
        body.userId = selectedUser.id;
      }

      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const count = data.sent || 1;
        setSuccessMsg(`Notification sent to ${count} user${count > 1 ? "s" : ""}!`);
        setTitle("");
        setMessage("");
        setSelectedUser(null);
        setUserSearch("");
        fetchHistory();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg("Failed to send notification.");
      }
    } catch {
      setErrorMsg("Something went wrong.");
    } finally {
      setSending(false);
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Notifications</h1>

      {/* ── Section 1: Send Notification ─────────────────── */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Send Notification</h2>

        {/* Recipient Toggle */}
        <div>
          <label className="block text-xs text-white/50 mb-2 uppercase tracking-wide">Recipient</label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setRecipientMode("all");
                setSelectedUser(null);
                setUserSearch("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-colors ${
                recipientMode === "all"
                  ? "bg-[#E51A1A] text-white"
                  : "bg-[#141414] text-white/50 hover:text-white"
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setRecipientMode("specific")}
              className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-colors ${
                recipientMode === "specific"
                  ? "bg-[#E51A1A] text-white"
                  : "bg-[#141414] text-white/50 hover:text-white"
              }`}
            >
              Specific User
            </button>
          </div>
        </div>

        {/* User Search */}
        {recipientMode === "specific" && (
          <div className="relative">
            <label className="block text-xs text-white/50 mb-1">Search User</label>
            {selectedUser ? (
              <div className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2">
                <span className="text-sm text-white flex-1">
                  {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
                </span>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserSearch("");
                  }}
                  className="text-white/40 hover:text-white text-sm cursor-pointer bg-transparent border-none"
                >
                  x
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E51A1A]"
                  placeholder="Type name or email..."
                />
                {userResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg max-h-[200px] overflow-y-auto">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setUserSearch("");
                          setUserResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-[#141414] cursor-pointer bg-transparent border-none transition-colors"
                      >
                        {u.firstName} {u.lastName}{" "}
                        <span className="text-white/40">({u.email})</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E51A1A]"
            placeholder="Notification title"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E51A1A] min-h-[100px] resize-y"
            placeholder="Notification message"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs text-white/50 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E51A1A]"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Send Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim() || (recipientMode === "specific" && !selectedUser)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#E51A1A] text-white hover:bg-[#E51A1A]/80 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send Notification"}
          </button>
          {successMsg && <span className="text-sm text-green-400">{successMsg}</span>}
          {errorMsg && <span className="text-sm text-red-400">{errorMsg}</span>}
        </div>
      </div>

      {/* ── Section 2: Sent History ──────────────────────── */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-semibold text-white">History</h2>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#E51A1A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-white/30">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Message</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Recipient</th>
                  <th className="px-4 py-3 text-left font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {history.map((n) => (
                  <tr key={n.id} className="border-b border-[#2A2A2A]/50 text-white/80">
                    <td className="px-4 py-2.5 font-medium">{n.title}</td>
                    <td className="px-4 py-2.5 max-w-[250px] truncate text-white/60">{n.message}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[n.type] || "bg-white/10 text-white/70"}`}>
                        {n.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-white/60">
                      {n.user.firstName} {n.user.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-white/40">{timeAgo(n.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
