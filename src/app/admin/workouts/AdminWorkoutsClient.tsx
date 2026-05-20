"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface WorkoutRow {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  duration: string | null;
  isPublished: boolean;
  createdAt: string;
  subcategoryName: string;
  categoryName: string;
  videoUrl: string;
  gifUrl: string | null;
  bodyPart: string | null;
  equipment: string | null;
}

import VideoThumbnail from "@/components/ui/VideoThumbnail";
import PreviewModal from "@/components/admin/PreviewModal";

export default function AdminWorkoutsClient({
  workouts,
}: {
  workouts: WorkoutRow[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = useState<any>(null);

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/admin/workouts/${id}`);
      if (res.ok) {
        const data = await res.json();
        const w = data.workout || data;
        setPreviewData({
          title: w.title,
          description: w.description,
          videoUrl: w.videoUrl,
          difficulty: w.difficulty,
          duration: w.duration,
          targetGoal: w.targetGoal,
          instructions: w.instructions,
          // Phase 4 illustration fields — required for the PreviewModal
          // to render the gif when a workout has no video.
          gifUrl: w.gifUrl,
          bodyPart: w.bodyPart,
          equipment: w.equipment,
          primaryMuscles: w.primaryMuscles,
        });
      }
    } catch { /* ignore */ }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this workout?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/workouts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete workout");
      }
    } catch {
      alert("Failed to delete workout");
    } finally {
      setDeleting(null);
    }
  }

  async function togglePublished(id: number, current: boolean) {
    try {
      const w = workouts.find((w) => w.id === id);
      if (!w) return;
      await fetch(`/api/admin/workouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...w,
          isPublished: !current,
          instructions: [],
          subcategoryId: 0,
        }),
      });
      router.refresh();
    } catch {
      alert("Failed to update workout");
    }
  }

  const difficultyColor: Record<string, string> = {
    Beginner: "bg-green-500/20 text-green-400",
    Intermediate: "bg-[#FF6B00]/20 text-[#FF6B00]",
    Advanced: "bg-[#E51A1A]/20 text-[#E51A1A]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workouts</h1>
          <p className="text-white/50 mt-1">
            Manage workout videos for the hub.
          </p>
        </div>
        <Link
          href="/admin/workouts/new"
          className="bg-[#E51A1A] hover:bg-[#E51A1A]/90 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          + Add Workout
        </Link>
      </div>

      {workouts.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl px-6 py-12 text-center text-white/40">
          No workouts yet. Add your first workout to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workouts.map((w) => {
            return (
              <div
                key={w.id}
                className="group bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-[#3A3A3A] transition-colors flex flex-col"
              >
                {/* Thumbnail — prefer the gif illustration when present
                    (Phase 4), fall back to the existing VideoThumbnail. */}
                <div className="relative w-full aspect-video bg-[#0A0A0A]">
                  {w.gifUrl ? (
                    <img
                      src={w.gifUrl}
                      alt={w.title}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <VideoThumbnail url={w.videoUrl} height="h-full" />
                  )}
                  {/* Duration badge */}
                  {w.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                      {w.duration}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <h3 className="font-semibold text-sm text-white line-clamp-2">
                    {w.title}
                  </h3>

                  <p className="text-[11px] text-white/40">
                    {w.categoryName}{" "}
                    <span className="text-white/20">&gt;</span>{" "}
                    {w.subcategoryName}
                  </p>

                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        difficultyColor[w.difficulty] ||
                        "bg-white/10 text-white/50"
                      }`}
                    >
                      {w.difficulty}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A] mt-2">
                    <button
                      onClick={() => togglePublished(w.id, w.isPublished)}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer border-none ${
                        w.isPublished ? "bg-[#E51A1A]" : "bg-[#2A2A2A]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          w.isPublished ? "left-5" : "left-1"
                        }`}
                      />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPreview(w.id)}
                        className="text-[#FF6B00]/70 hover:text-[#FF6B00] text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10 transition-colors cursor-pointer border-none"
                      >
                        Preview
                      </button>
                      <Link
                        href={`/admin/workouts/${w.id}/edit`}
                        className="text-white/50 hover:text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(w.id)}
                        disabled={deleting === w.id}
                        className="text-red-400/60 hover:text-red-400 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors disabled:opacity-40 cursor-pointer border-none"
                      >
                        {deleting === w.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <PreviewModal type="workout" data={previewData} onClose={() => setPreviewData(null)} />
      )}
    </div>
  );
}
