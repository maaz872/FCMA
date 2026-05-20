"use client";

/**
 * Modal that lets a coach pick one of their EXISTING workouts when
 * building a plan template's daily exercise list. Same UX as
 * `IllustrationPicker` but sources from `/api/admin/workouts` instead
 * of the bundled library, so the result is a real `Workout` id that
 * `PlanExercise.workoutId` can FK to.
 *
 * If the coach needs an exercise that doesn't exist yet, they can
 * close this modal, create a new Workout via the Phase 4 flow at
 * /admin/workouts/new (which DOES use the IllustrationPicker against
 * the library), then reopen this picker.
 */

import { useEffect, useMemo, useState } from "react";

export interface PickableWorkout {
  id: number;
  title: string;
  slug: string;
  gifUrl: string | null;
  bodyPart: string | null;
  equipment: string | null;
  primaryMuscles: string | null;
  difficulty: string;
  subcategory: {
    name: string;
    category: { name: string };
  } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (workout: PickableWorkout) => void;
  workouts: PickableWorkout[];
}

const BODY_PARTS = [
  { v: "chest", l: "Chest" },
  { v: "back", l: "Back" },
  { v: "legs", l: "Legs" },
  { v: "shoulders", l: "Shoulders" },
  { v: "arms", l: "Arms" },
  { v: "core", l: "Core" },
  { v: "full_body", l: "Full body" },
  { v: "cardio", l: "Cardio" },
];

export default function WorkoutPickerModal({
  open,
  onClose,
  onSelect,
  workouts,
}: Props) {
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setBodyPart(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workouts.filter((w) => {
      if (bodyPart && (w.bodyPart || "").toLowerCase() !== bodyPart) {
        return false;
      }
      if (q) {
        const hay =
          w.title.toLowerCase() + " " + (w.primaryMuscles || "").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [workouts, query, bodyPart]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111111] border border-[#2A2A2A] sm:rounded-2xl w-full max-w-4xl h-full sm:h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
          <div>
            <h2 className="text-white font-semibold text-lg">Add exercise</h2>
            <p className="text-white/40 text-xs mt-1">
              Pick from your workout library ({filtered.length} of {workouts.length} match)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none bg-transparent border-none cursor-pointer p-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-[#1A1A1A] space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or muscle…"
            className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg py-2 px-3 text-white text-sm focus:border-[#E51A1A] focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            <Pill label="All bodies" active={!bodyPart} onClick={() => setBodyPart(null)} />
            {BODY_PARTS.map((bp) => (
              <Pill
                key={bp.v}
                label={bp.l}
                active={bodyPart === bp.v}
                onClick={() => setBodyPart(bp.v)}
              />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="text-center text-white/40 text-sm py-10">
              No workouts match. Try clearing filters, or create a new workout via
              <a href="/admin/workouts/new" className="text-[#E51A1A] hover:underline ml-1">
                /admin/workouts/new
              </a>
              .
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    onSelect(w);
                    onClose();
                  }}
                  className="text-left bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#E51A1A]/60 transition-colors cursor-pointer"
                >
                  <div className="aspect-square bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
                    {w.gifUrl ? (
                      <img
                        src={w.gifUrl}
                        alt={w.title}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-white/20 text-xs">No image</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-white text-sm font-medium truncate">{w.title}</p>
                    <p className="text-white/40 text-[11px] mt-0.5 capitalize">
                      {(w.bodyPart ?? "—").replace("_", " ")} · {w.equipment ?? "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
        active
          ? "bg-[#E51A1A] border-[#E51A1A] text-white"
          : "bg-transparent border-[#2A2A2A] text-white/50 hover:border-[#E51A1A]/40 hover:text-white/80"
      }`}
    >
      {label}
    </button>
  );
}
