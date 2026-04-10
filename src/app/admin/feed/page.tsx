"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import VideoEmbed from "@/components/ui/VideoEmbed";
import { parseVideoUrl } from "@/lib/video";

interface PostUser {
  firstName: string;
  lastName: string;
}

interface PostLike {
  id: number;
  user: PostUser;
}

interface PostComment {
  id: number;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: string };
}

interface Post {
  id: number;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likes: PostLike[];
  comments: PostComment[];
}

export default function AdminFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "youtube" | "image">("none");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [showLikers, setShowLikers] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyPosting, setReplyPosting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/feed");
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);

    let finalMediaType: string | null = null;
    let finalMediaUrl: string | null = null;

    if (mediaType === "youtube" && youtubeUrl.trim()) {
      finalMediaType = "youtube";
      finalMediaUrl = youtubeUrl.trim();
    } else if (mediaType === "image" && imagePreview) {
      finalMediaType = "image";
      finalMediaUrl = imagePreview;
    }

    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          mediaType: finalMediaType,
          mediaUrl: finalMediaUrl,
        }),
      });

      if (res.ok) {
        setContent("");
        setMediaType("none");
        setYoutubeUrl("");
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchPosts();
      }
    } catch (err) {
      console.error("Failed to post:", err);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(postId: number) {
    if (!confirm("Delete this post?")) return;
    setDeleting(postId);
    try {
      const res = await fetch(`/api/feed/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteComment(postId: number, commentId: number) {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/feed/${postId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments.filter((c) => c.id !== commentId),
                  commentCount: p.commentCount - 1,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  async function handleReply(postId: number) {
    const text = replyText[postId]?.trim();
    if (!text) return;
    setReplyPosting(postId);
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [...p.comments, data.comment],
                  commentCount: p.commentCount + 1,
                }
              : p
          )
        );
        setReplyText((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setReplyPosting(null);
    }
  }

  function toggleComments(postId: number) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Social Feed</h1>
        <p className="text-sm text-white/50 mt-1">
          Create and manage posts for your clients
        </p>
      </div>

      {/* Create post */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
          New Post
        </h2>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post..."
          rows={4}
          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A] transition-colors resize-none"
        />

        <div className="flex items-center gap-3">
          <label className="text-white/50 text-sm">Media:</label>
          <select
            value={mediaType}
            onChange={(e) => {
              setMediaType(e.target.value as "none" | "youtube" | "image");
              setYoutubeUrl("");
              setImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#E51A1A] transition-colors"
          >
            <option value="none">None</option>
            <option value="youtube">Video (YouTube, Instagram, TikTok, FB)</option>
            <option value="image">Image Upload</option>
          </select>
        </div>

        {mediaType === "youtube" && (
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Paste any video URL (YouTube, Instagram Reel, TikTok, Facebook)"
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A] transition-colors"
          />
        )}

        {mediaType === "image" && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#2A2A2A] file:text-white hover:file:bg-[#3A3A3A] file:cursor-pointer"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-[200px] rounded-lg"
              />
            )}
          </div>
        )}

        <button
          onClick={handlePost}
          disabled={!content.trim() || posting}
          className="px-6 py-3 bg-[#E51A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#E51A1A]/90 transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>

      {/* Posts list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-white/30 py-8">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8 text-center">
            <p className="text-white/50">No posts yet. Create your first post above.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl"
            >
              {/* Post content */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm whitespace-pre-wrap line-clamp-3">
                      {post.content}
                    </p>

                    {/* Video embed (YouTube, Instagram, TikTok, Facebook) */}
                    {post.mediaUrl && parseVideoUrl(post.mediaUrl) && (
                      <div className="mt-3">
                        <VideoEmbed url={post.mediaUrl} />
                      </div>
                    )}
                    {/* Image */}
                    {post.mediaType === "image" && post.mediaUrl && !parseVideoUrl(post.mediaUrl) && (
                      <img src={post.mediaUrl} alt="Post media" className="mt-3 max-w-full rounded-xl max-h-[400px] object-cover" />
                    )}

                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {post.mediaType && (
                        <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] px-2 py-0.5 rounded-full font-semibold uppercase">
                          {post.mediaType}
                        </span>
                      )}

                      {/* Like count - clickable to show likers */}
                      <button
                        onClick={() =>
                          setShowLikers(showLikers === post.id ? null : post.id)
                        }
                        className="text-white/30 text-xs flex items-center gap-1 bg-transparent border-none cursor-pointer hover:text-white/50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                        {post.likeCount}
                      </button>

                      {/* Comment count - clickable to expand */}
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="text-white/30 text-xs flex items-center gap-1 bg-transparent border-none cursor-pointer hover:text-white/50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                        </svg>
                        {post.commentCount}
                      </button>

                      <span className="text-white/20 text-xs">
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors bg-transparent border border-red-500/30 cursor-pointer disabled:opacity-40"
                  >
                    {deleting === post.id ? "..." : "Delete"}
                  </button>
                </div>

                {/* Likers dropdown */}
                {showLikers === post.id && (
                  <div className="mt-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                      Liked by ({post.likeCount})
                    </p>
                    {post.likes && post.likes.length > 0 ? (
                      <div className="space-y-1">
                        {post.likes.map((like) => (
                          <p key={like.id} className="text-xs text-white/70">
                            {like.user.firstName} {like.user.lastName}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30">No likes yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Comments section */}
              {expandedComments.has(post.id) && (
                <div className="border-t border-[#2A2A2A] px-5 py-4 space-y-3">
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                    Comments ({post.comments?.length || 0})
                  </p>

                  {post.comments && post.comments.length > 0 ? (
                    <div className="space-y-2">
                      {post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex items-start gap-3 bg-[#0A0A0A] rounded-xl p-3"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-white/50 shrink-0">
                            {comment.user.firstName.charAt(0)}
                            {comment.user.lastName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">
                                {comment.user.firstName} {comment.user.lastName}
                              </span>
                              {comment.user.role === "COACH" && (
                                <span className="text-[9px] bg-[#E51A1A]/20 text-[#E51A1A] px-1.5 py-0.5 rounded font-bold">
                                  ADMIN
                                </span>
                              )}
                              <span className="text-[10px] text-white/20">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-white/60 mt-1">
                              {comment.content}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(post.id, comment.id)}
                            className="text-[10px] text-red-400/50 hover:text-red-400 bg-transparent border-none cursor-pointer shrink-0"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30">No comments yet</p>
                  )}

                  {/* Admin reply input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={replyText[post.id] || ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleReply(post.id);
                      }}
                      placeholder="Reply as admin..."
                      className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A] transition-colors"
                    />
                    <button
                      onClick={() => handleReply(post.id)}
                      disabled={!replyText[post.id]?.trim() || replyPosting === post.id}
                      className="px-4 py-2 bg-[#E51A1A] text-white rounded-lg text-xs font-semibold hover:bg-[#E51A1A]/90 transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {replyPosting === post.id ? "..." : "Reply"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
