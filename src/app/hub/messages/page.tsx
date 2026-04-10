"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBranding } from "@/lib/branding";

interface Message {
  id: string;
  senderId: string;
  content: string;
  imageData?: string | null;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface Conversation {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

export default function UserMessagesPage() {
  const { coachName } = useBranding();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        const adminConv = data.conversations?.find(
          (c: Conversation) => c.role === "COACH"
        );
        if (adminConv) {
          setAdminId(adminConv.userId);
          setAdminName(`${adminConv.firstName} ${adminConv.lastName}`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, []);

  const fetchAdmin = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/admin");
      if (res.ok) {
        const data = await res.json();
        if (data.adminId) {
          setAdminId(data.adminId);
          if (data.adminName) setAdminName(data.adminName);
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await fetch(`/api/messages/${adminId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.messages?.length > 0) {
          const msg = data.messages[0];
          if (msg.sender.role !== "COACH") {
            setCurrentUserId(msg.sender.id);
          } else {
            const userMsg = data.messages.find(
              (m: Message) => m.sender.role !== "COACH"
            );
            if (userMsg) setCurrentUserId(userMsg.sender.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchConversations().then(() => fetchAdmin());
  }, [fetchConversations, fetchAdmin]);

  useEffect(() => {
    if (adminId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [adminId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!newMessage.trim() && !imagePreview) || !adminId || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: adminId,
          content: newMessage.trim() || (imagePreview ? "[Image]" : ""),
          imageData: imagePreview || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
        clearImage();
        if (!currentUserId && data.message.sender) {
          setCurrentUserId(data.message.sender.id);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Messages</h1>

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-240px)] min-h-[500px]">
        {/* Chat header */}
        <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E51A1A]/20 flex items-center justify-center text-[#E51A1A] font-bold text-sm">
            {(adminName || coachName).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{adminName || coachName}</p>
            <p className="text-xs text-white/40">Your Coach</p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/30">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-white/50 text-lg font-medium mb-2">
                  No messages yet
                </p>
                <p className="text-white/30 text-sm max-w-sm">
                  Start a conversation with {adminName || coachName}. Ask anything about
                  your nutrition, training, or progress.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender.role !== "COACH";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isMe
                        ? "bg-[#E51A1A] text-white"
                        : "bg-[#2A2A2A] text-white"
                    }`}
                  >
                    {msg.imageData && (
                      <img
                        src={msg.imageData}
                        alt="Shared image"
                        className="max-w-[300px] w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFullScreenImage(msg.imageData!)}
                      />
                    )}
                    {msg.content && msg.content !== "[Image]" && (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1.5 ${
                        isMe ? "text-white/60" : "text-white/30"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-[#2A2A2A] bg-[#0A0A0A]">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-16 rounded-lg"
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-[#E51A1A] text-white rounded-full text-xs flex items-center justify-center cursor-pointer border-none hover:bg-red-600"
              >
                x
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-[#2A2A2A] flex gap-3 items-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-white/40 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer flex-shrink-0"
            title="Send image"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A] transition-colors"
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !imagePreview) || sending}
            className="px-6 py-3 bg-[#E51A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#E51A1A]/90 transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>

      {/* Full-screen image modal */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullScreenImage(null)}
        >
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl border-none cursor-pointer transition-colors"
          >
            x
          </button>
          <img
            src={fullScreenImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
