"use client";

import { useState, useEffect, useCallback } from "react";
import { useBranding } from "@/lib/branding";

interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface Post {
  id: number;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

import VideoEmbed from "@/components/ui/VideoEmbed";
import { parseVideoUrl } from "@/lib/video";
import { fetchWithRetry } from "@/lib/fetch-retry";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

export default function HubFeedPage() {
  const { coachName } = useBranding();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentsData, setCommentsData] = useState<Record<number, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [sendingComment, setSendingComment] = useState<number | null>(null);
  const [newPostText, setNewPostText] = useState("");
  const [postingNew, setPostingNew] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetchWithRetry("/api/feed");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  async function createPost() {
    if (!newPostText.trim() || postingNew) return;
    setPostingNew(true);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostText.trim() }),
      });
      if (res.ok) {
        setNewPostText("");
        fetchPosts();
      }
    } catch { /* ignore */ }
    setPostingNew(false);
  }

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleLike(postId: number) {
    try {
      const res = await fetch(`/api/feed/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likedByMe: data.liked, likeCount: data.count }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  }

  async function toggleComments(postId: number) {
    const next = new Set(expandedComments);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
      // Fetch comments if not already loaded
      if (!commentsData[postId]) {
        try {
          const res = await fetch(`/api/feed/${postId}/comments`);
          if (res.ok) {
            const data = await res.json();
            setCommentsData((prev) => ({ ...prev, [postId]: data.comments }));
          }
        } catch (err) {
          console.error("Failed to fetch comments:", err);
        }
      }
    }
    setExpandedComments(next);
  }

  async function handleComment(postId: number) {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    setSendingComment(postId);
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setCommentsData((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
          )
        );
      }
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSendingComment(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-white/30">
        Loading feed...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Feed</h1>

      {/* Create Post */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4 mb-6">
        <textarea
          value={newPostText}
          onChange={(e) => setNewPostText(e.target.value)}
          placeholder="Share your progress, ask a question, or motivate others..."
          rows={2}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A]/50 resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={createPost}
            disabled={!newPostText.trim() || postingNew}
            className="px-5 py-2 bg-[#E51A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#C41717] transition-colors disabled:opacity-40 cursor-pointer border-none"
          >
            {postingNew ? "Posting..." : "Post"}
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-12 text-center">
          <p className="text-white/50 text-lg font-medium mb-2">No posts yet</p>
          <p className="text-white/30 text-sm">Check back later for updates from your coach.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => {
            const videoInfo = post.mediaUrl ? parseVideoUrl(post.mediaUrl) : null;
            const comments = commentsData[post.id] || [];
            const isExpanded = expandedComments.has(post.id);

            return (
              <div
                key={post.id}
                className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden"
              >
                {/* Author header */}
                <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E51A1A]/20 flex items-center justify-center text-[#E51A1A] font-bold text-sm">
                    {post.author.firstName[0]}
                    {post.author.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">
                        {post.author.role === "ADMIN"
                          ? coachName
                          : `${post.author.firstName} ${post.author.lastName}`}
                      </span>
                      {post.author.role === "ADMIN" && (
                        <span className="text-[10px] bg-[#E51A1A]/20 text-[#E51A1A] px-2 py-0.5 rounded-full font-semibold">
                          Coach
                        </span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 pb-4">
                  <p className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Media — auto-detects platform */}
                {post.mediaUrl && videoInfo && (
                  <div className="px-5 pb-4">
                    <VideoEmbed url={post.mediaUrl} />
                  </div>
                )}

                {post.mediaType === "image" && post.mediaUrl && !videoInfo && (
                  <div className="px-5 pb-4">
                    <img
                      src={post.mediaUrl}
                      alt="Post media"
                      className="w-full rounded-xl object-cover max-h-[500px]"
                    />
                  </div>
                )}

                {/* Action bar */}
                <div className="px-5 py-3 border-t border-[#2A2A2A] flex items-center gap-6">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1.5 text-sm transition-colors bg-transparent border-none cursor-pointer"
                    style={{ color: post.likedByMe ? "#E51A1A" : "rgba(255,255,255,0.5)" }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill={post.likedByMe ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={post.likedByMe ? 0 : 1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                    {post.likeCount}
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                      />
                    </svg>
                    {post.commentCount}
                  </button>
                </div>

                {/* Comments section */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[#2A2A2A]">
                    <div className="space-y-3 pt-4 max-h-[300px] overflow-y-auto">
                      {comments.length === 0 ? (
                        <p className="text-white/30 text-xs text-center py-2">
                          No comments yet. Be the first!
                        </p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white/50 font-bold text-[10px] flex-shrink-0 mt-0.5">
                              {c.user.firstName[0]}
                              {c.user.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white/80 text-xs font-semibold">
                                  {c.user.role === "ADMIN"
                                    ? coachName
                                    : `${c.user.firstName} ${c.user.lastName}`}
                                </span>
                                <span className="text-white/20 text-[10px]">
                                  {timeAgo(c.createdAt)}
                                </span>
                              </div>
                              <p className="text-white/60 text-xs mt-0.5">
                                {c.content}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add comment */}
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleComment(post.id);
                          }
                        }}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A] transition-colors"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={
                          !commentInputs[post.id]?.trim() ||
                          sendingComment === post.id
                        }
                        className="px-3 py-2 bg-[#E51A1A] text-white rounded-lg text-xs font-semibold hover:bg-[#E51A1A]/90 transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {sendingComment === post.id ? "..." : "Post"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
