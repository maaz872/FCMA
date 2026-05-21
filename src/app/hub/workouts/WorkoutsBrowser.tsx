"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface WorkoutData {
  id: number;
  title: string;
  slug: string;
  description: string;
  videoUrl: string;
  difficulty: string;
  duration: string | null;
  targetGoal: string | null;
  gifUrl: string | null;
  bodyPart: string | null;
  equipment: string | null;
  primaryMuscles: string | null;
  subcategoryId: number;
  subcategoryName: string;
  categoryId: number;
  categoryName: string;
}

interface Props {
  workouts: WorkoutData[];
}

import VideoThumbnail from "@/components/ui/VideoThumbnail";
import ExerciseGif from "@/components/ui/ExerciseGif";
import WorkoutMediaThumbnail from "@/components/ui/WorkoutMediaThumbnail";

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-500/20 text-green-400",
  Intermediate: "bg-[#FF6B00]/20 text-[#FF6B00]",
  Advanced: "bg-[#E51A1A]/20 text-[#E51A1A]",
};

const goalColor: Record<string, string> = {
  "Fat Loss": "bg-purple-500/20 text-purple-400",
  "Muscle Gain": "bg-blue-500/20 text-blue-400",
  "General Fitness": "bg-teal-500/20 text-teal-400",
};

export default function WorkoutsBrowser({ workouts }: Props) {
  const [search, setSearch] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("All");
  const [goal, setGoal] = useState<string>("All");

  const filtered = useMemo(() => {
    let result = [...workouts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q),
      );
    }

    if (selectedBodyPart) {
      result = result.filter(
        (w) => (w.bodyPart || "").toLowerCase() === selectedBodyPart,
      );
    }

    if (difficulty !== "All") {
      result = result.filter((w) => w.difficulty === difficulty);
    }

    if (goal !== "All") {
      result = result.filter((w) => w.targetGoal === goal);
    }

    return result;
  }, [workouts, search, selectedBodyPart, difficulty, goal]);

  const difficultyOptions = ["All", "Beginner", "Intermediate", "Advanced"];
  const goalOptions = ["All", "Fat Loss", "Muscle Gain", "General Fitness"];

  return (
    <div>
      <h1 className="text-3xl font-black mb-2 text-white">Workouts</h1>
      <p className="text-white/60 mb-6">
        Follow along with workout videos for every fitness level.
      </p>

      {/* Body-part fast filter — primary nav. */}
      <div className="flex flex-wrap gap-1.5 mb-8">
        {(
          [
            { v: null, l: "All" },
            { v: "chest", l: "Chest" },
            { v: "back", l: "Back" },
            { v: "legs", l: "Legs" },
            { v: "shoulders", l: "Shoulders" },
            { v: "arms", l: "Arms" },
            { v: "core", l: "Core" },
            { v: "full_body", l: "Full body" },
            { v: "cardio", l: "Cardio" },
          ] as const
        ).map((p) => {
          const count = p.v
            ? workouts.filter(
                (w) => (w.bodyPart || "").toLowerCase() === p.v
              ).length
            : workouts.length;
          if (p.v && count === 0) return null;
          const active = selectedBodyPart === p.v;
          return (
            <button
              key={p.l}
              type="button"
              onClick={() => setSelectedBodyPart(p.v as string | null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                active
                  ? "bg-[#E51A1A] border-[#E51A1A] text-white"
                  : "bg-transparent border-[#2A2A2A] text-white/50 hover:border-[#E51A1A]/40 hover:text-white/80"
              }`}
            >
              {p.l} <span className="opacity-50">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <div className="w-full lg:w-[260px] flex-shrink-0 space-y-6">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-3 px-4 text-white focus:border-[#E51A1A] focus:outline-none placeholder:text-white/30 text-sm"
            />
          </div>

          {/* Difficulty filter */}
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              Difficulty
            </h3>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setDifficulty(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    difficulty === opt
                      ? "bg-[#E51A1A] text-white"
                      : "bg-[#0A0A0A] text-white/50 border border-[#2A2A2A] hover:border-[#E51A1A]/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Goal filter */}
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              Goal
            </h3>
            <div className="flex flex-wrap gap-2">
              {goalOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setGoal(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    goal === opt
                      ? "bg-[#E51A1A] text-white"
                      : "bg-[#0A0A0A] text-white/50 border border-[#2A2A2A] hover:border-[#E51A1A]/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/60 mb-6">
            <span className="font-semibold text-white">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "workout" : "workouts"} found
          </p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((workout) => {
                return (
                  <Link
                    key={workout.id}
                    href={`/hub/workouts/${workout.slug}`}
                    className="group bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#E51A1A]/30"
                  >
                    {/* Video autoplays muted+looped when available; gif is
                        the fallback. VideoThumbnail (YouTube poster
                        image) is the last-resort when neither is set. */}
                    {workout.videoUrl || workout.gifUrl ? (
                      <WorkoutMediaThumbnail
                        videoUrl={workout.videoUrl}
                        gifUrl={workout.gifUrl}
                        title={workout.title}
                        className="h-[180px] bg-[#0A0A0A] w-full"
                      />
                    ) : (
                      <VideoThumbnail url={workout.videoUrl} height="h-[180px]" />
                    )}

                    {/* Card body */}
                    <div className="p-4">
                      <h3 className="font-bold text-white text-sm mb-2 group-hover:text-[#E51A1A] transition-colors line-clamp-2">
                        {workout.title}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            difficultyColor[workout.difficulty] ||
                            "bg-white/10 text-white/50"
                          }`}
                        >
                          {workout.difficulty}
                        </span>
                        {workout.bodyPart && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/50 capitalize">
                            {workout.bodyPart.replace("_", " ")}
                          </span>
                        )}
                        {workout.equipment && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/50 capitalize">
                            {workout.equipment}
                          </span>
                        )}
                        {workout.duration && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                            {workout.duration}
                          </span>
                        )}
                        {workout.targetGoal && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              goalColor[workout.targetGoal] ||
                              "bg-white/10 text-white/50"
                            }`}
                          >
                            {workout.targetGoal}
                          </span>
                        )}
                      </div>

                      {workout.primaryMuscles && (
                        <p className="text-[10px] text-white/30 mb-1 capitalize">
                          {workout.primaryMuscles.split(",").slice(0, 3).join(", ")}
                        </p>
                      )}
                      <p className="text-xs text-white/40">
                        {workout.categoryName}{" "}
                        <span className="text-white/20">&gt;</span>{" "}
                        {workout.subcategoryName}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-bold text-white mb-2">
                No workouts found
              </h2>
              <p className="text-white/50">
                Try adjusting your filters to find what you&apos;re looking for.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
