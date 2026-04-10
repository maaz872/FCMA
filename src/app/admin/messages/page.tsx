"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/messages/${selectedUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUserId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function selectConversation(userId: string) {
    setSelectedUserId(userId);
    setShowSidebar(false);
    setConversations((prev) =>
      prev.map((c) => (c.userId === userId ? { ...c, unreadCount: 0 } : c))
    );
  }

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
    if ((!newMessage.trim() && !imagePreview) || !selectedUserId || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUserId,
          content: newMessage.trim() || (imagePreview ? "[Image]" : ""),
          imageData: imagePreview || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
        clearImage();
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

  function formatPreviewDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (diffHrs < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
    return d.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
  }

  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Search users for new conversation
  useEffect(() => {
    if (!userSearch.trim() || !showNewChat) {
      setUserResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          const users = (data.users || []).filter((u: { firstName: string; lastName: string; email: string; role: string }) =>
            u.role !== "COACH" &&
            (`${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
              u.email.toLowerCase().includes(userSearch.toLowerCase()))
          );
          setUserResults(users.slice(0, 8));
        }
      } catch { /* ignore */ }
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch, showNewChat]);

  function startNewConversation(user: { id: string; firstName: string; lastName: string }) {
    // Check if conversation already exists
    const existing = conversations.find((c) => c.userId === user.id);
    if (existing) {
      selectConversation(user.id);
    } else {
      // Add temporary conversation entry and select it
      setConversations((prev) => [
        { userId: user.id, firstName: user.firstName, lastName: user.lastName, role: "USER", lastMessage: "", lastMessageDate: new Date().toISOString(), unreadCount: 0 },
        ...prev,
      ]);
      setSelectedUserId(user.id);
      setShowSidebar(false);
    }
    setShowNewChat(false);
    setUserSearch("");
    setUserResults([]);
  }

  const selectedConv = conversations.find((c) => c.userId === selectedUserId);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-sm text-white/50 mt-1">
            {conversations.length} conversation{conversations.length !== 1 && "s"}
            {totalUnread > 0 && (
              <span className="ml-2 text-[#E51A1A] font-semibold">
                ({totalUnread} unread)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          className="px-4 py-2 bg-[#E51A1A] text-white text-sm font-semibold rounded-xl hover:bg-[#C41010] transition-colors cursor-pointer border-none"
        >
          + New Message
        </button>
      </div>

      {/* New conversation search */}
      {showNewChat && (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-3">Start a new conversation</p>
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search user by name or email..."
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A] transition-colors"
            autoFocus
          />
          {searchingUsers && <p className="text-xs text-white/30 mt-2">Searching...</p>}
          {userResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {userResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startNewConversation(u)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-transparent hover:bg-white/5 transition-colors cursor-pointer border-none flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white/60 font-bold text-[10px] flex-shrink-0">
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {userSearch.trim() && !searchingUsers && userResults.length === 0 && (
            <p className="text-xs text-white/30 mt-2">No users found</p>
          )}
        </div>
      )}

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden flex h-[calc(100vh-200px)] min-h-[500px]">
        {/* Conversations sidebar */}
        <div
          className={`w-full md:w-[320px] border-r border-[#2A2A2A] flex flex-col ${
            !showSidebar && selectedUserId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="px-4 py-3 border-b border-[#2A2A2A]">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Conversations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-white/30 text-sm">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-white/30 text-sm">
                No conversations yet.
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => selectConversation(conv.userId)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer border-none ${
                    selectedUserId === conv.userId
                      ? "bg-[#E51A1A]/10"
                      : "bg-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white/60 font-bold text-xs flex-shrink-0">
                    {conv.firstName[0]}
                    {conv.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white truncate">
                        {conv.firstName} {conv.lastName}
                      </p>
                      <span className="text-[10px] text-white/30 flex-shrink-0 ml-2">
                        {formatPreviewDate(conv.lastMessageDate)}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="bg-[#E51A1A] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div
          className={`flex-1 flex flex-col ${
            showSidebar && !selectedUserId ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedUserId && selectedConv ? (
            <>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden text-white/50 hover:text-white mr-2 bg-transparent border-none cursor-pointer text-lg"
                >
                  &larr;
                </button>
                <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white/60 font-bold text-xs">
                  {selectedConv.firstName[0]}
                  {selectedConv.lastName[0]}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">
                    {selectedConv.firstName} {selectedConv.lastName}
                  </p>
                  <p className="text-xs text-white/40">User</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => {
                  const isAdmin = msg.sender.role === "COACH";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          isAdmin
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
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}
                        <p
                          className={`text-[10px] mt-1.5 ${
                            isAdmin ? "text-white/60" : "text-white/30"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                  placeholder="Type your reply..."
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-white/30 text-sm mb-3">
                  Select a conversation or start a new one
                </p>
                <button
                  onClick={() => { setShowSidebar(true); setShowNewChat(true); }}
                  className="px-4 py-2 bg-[#E51A1A] text-white text-sm font-semibold rounded-xl hover:bg-[#C41010] transition-colors cursor-pointer border-none"
                >
                  + New Message
                </button>
              </div>
            </div>
          )}
        </div>
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
