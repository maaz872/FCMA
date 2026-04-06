"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Template {
  id: number;
  name: string;
  description: string | null;
  type: string;
  durationWeeks: number;
  dayCount: number;
  createdAt: string;
}

const typeBadge: Record<string, { label: string; color: string }> = {
  workout: { label: "Workout", color: "bg-blue-500/20 text-blue-400" },
  diet: { label: "Diet", color: "bg-green-500/20 text-green-400" },
  combined: { label: "Combined", color: "bg-purple-500/20 text-purple-400" },
};

export default function AdminPlansClient({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);

  async function handleDuplicate(id: number, name: string) {
    setDuplicating(id);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateId: id, name: `${name} (Copy)` }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to duplicate template");
      }
    } catch {
      alert("Failed to duplicate template");
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this plan template? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete template");
      }
    } catch {
      alert("Failed to delete template");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Plan Templates</h1>
          <p className="text-sm text-white/40 mt-1">
            Create and manage workout/diet plan templates to assign to clients
          </p>
        </div>
        <Link
          href="/admin/plans/new"
          className="px-4 py-2 bg-[#E51A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#E51A1A]/90 transition-colors"
        >
          + Create Template
        </Link>
      </div>

      {/* Grid */}
      {templates.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-12 text-center">
          <p className="text-white/40 mb-4">No plan templates yet</p>
          <Link
            href="/admin/plans/new"
            className="text-[#E51A1A] text-sm font-semibold hover:underline"
          >
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => {
            const badge = typeBadge[t.type] || typeBadge.combined;
            return (
              <div
                key={t.id}
                className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{t.name}</h3>
                    {t.description && (
                      <p className="text-white/40 text-sm mt-1 line-clamp-2">{t.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-white/40 mb-4">
                  <span>{t.durationWeeks} week{t.durationWeeks !== 1 ? "s" : ""}</span>
                  <span>{t.dayCount} day{t.dayCount !== 1 ? "s" : ""} configured</span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/plans/${t.id}/edit`}
                    className="flex-1 text-center px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDuplicate(t.id, t.name)}
                    disabled={duplicating === t.id}
                    className="px-3 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] text-sm rounded-lg hover:bg-[#FF6B00]/20 transition-colors disabled:opacity-50 cursor-pointer border-none"
                  >
                    {duplicating === t.id ? "..." : "Duplicate"}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting === t.id}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer border-none"
                  >
                    {deleting === t.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
