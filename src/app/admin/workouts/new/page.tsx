"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [subcategoryId, setSubcategoryId] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [duration, setDuration] = useState("");
  const [targetGoal, setTargetGoal] = useState("All");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    fetch("/api/admin/workouts/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function generateSlug(val: string) {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  function addInstruction() {
    setInstructions([...instructions, ""]);
  }

  function removeInstruction(index: number) {
    setInstructions(instructions.filter((_, i) => i !== index));
  }

  function updateInstruction(index: number, value: string) {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  }

  function moveInstruction(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= instructions.length) return;
    const updated = [...instructions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setInstructions(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !slug || !description || !videoUrl || !subcategoryId) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          description,
          sets: sets || null,
          reps: reps || null,
          videoUrl,
          instructions: instructions.filter((s) => s.trim()),
          subcategoryId,
          difficulty,
          duration: duration || null,
          targetGoal: targetGoal === "All" ? null : targetGoal,
          isPublished,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create workout");
        return;
      }

      router.push("/admin/workouts");
    } catch {
      setError("Failed to create workout");
    } finally {
      setLoading(false);
    }
  }

  const difficultyOptions = ["Beginner", "Intermediate", "Advanced"];
  const goalOptions = ["All", "Fat Loss", "Muscle Gain", "General Fitness"];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/workouts"
          className="text-white/50 hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Workout</h1>
          <p className="text-white/50 mt-1">
            Create a new workout video for the hub.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSlug(generateSlug(e.target.value));
            }}
            className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none"
            placeholder="e.g. Full Body HIIT Burn"
          />
        </div>

        {/* Sets & Reps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Sets
            </label>
            <input
              type="text"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none"
              placeholder="e.g. 3-4 sets"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Reps
            </label>
            <input
              type="text"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none"
              placeholder="e.g. 8-12 reps"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none resize-none"
            placeholder="Brief description of the workout..."
          />
        </div>

        {/* YouTube Video URL */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2">
            YouTube Video URL *
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none"
            placeholder="Paste video URL (YouTube, Instagram, TikTok, Facebook)"
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2">
            Instructions
          </label>
          <div className="space-y-3">
            {instructions.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-8 h-10 flex items-center justify-center text-sm font-bold text-white/40">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateInstruction(i, e.target.value)}
                  className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-2.5 px-4 text-white focus:border-[#E51A1A] focus:outline-none text-sm"
                  placeholder={`Step ${i + 1}`}
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveInstruction(i, -1)}
                    disabled={i === 0}
                    className="w-8 h-10 flex items-center justify-center text-white/30 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInstruction(i, 1)}
                    disabled={i === instructions.length - 1}
                    className="w-8 h-10 flex items-center justify-center text-white/30 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    onClick={() => removeInstruction(i)}
                    className="w-8 h-10 flex items-center justify-center text-red-400/50 hover:text-red-400 cursor-pointer"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addInstruction}
            className="mt-3 text-sm text-[#E51A1A] hover:text-[#E51A1A]/80 font-semibold cursor-pointer"
          >
            + Add Step
          </button>
        </div>

        {/* Category + Subcategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value ? parseInt(e.target.value) : "");
                setSubcategoryId("");
              }}
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none cursor-pointer"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Subcategory *
            </label>
            <select
              value={subcategoryId}
              onChange={(e) =>
                setSubcategoryId(
                  e.target.value ? parseInt(e.target.value) : ""
                )
              }
              disabled={!selectedCategory}
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none cursor-pointer disabled:opacity-40"
            >
              <option value="">Select subcategory</option>
              {selectedCategory?.subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2">
            Difficulty
          </label>
          <div className="grid grid-cols-3 gap-3">
            {difficultyOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDifficulty(opt)}
                className={`py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                  difficulty === opt
                    ? "bg-[#E51A1A] text-white border-[#E51A1A]"
                    : "bg-[#1E1E1E] text-white/60 border-[#2A2A2A] hover:border-[#E51A1A]/30"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Duration + Target Goal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Duration
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none"
              placeholder="e.g. 15 min"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Target Goal
            </label>
            <select
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none cursor-pointer"
            >
              {goalOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Published Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
              isPublished ? "bg-[#E51A1A]" : "bg-[#2A2A2A]"
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                isPublished ? "left-6" : "left-1"
              }`}
            />
          </button>
          <span className="text-sm text-white/70 font-semibold">
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#E51A1A] hover:bg-[#E51A1A]/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Saving..." : "Save Workout"}
          </button>
          <Link
            href="/admin/workouts"
            className="text-white/50 hover:text-white font-semibold transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
