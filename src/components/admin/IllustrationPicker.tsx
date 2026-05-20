"use client";

/**
 * Modal that lets a coach search and pick an exercise from the Free
 * Exercise DB. Selecting an entry calls `onSelect(entry)` with the
 * fully-resolved `ExerciseLibraryEntry` (image URLs absolute, app
 * enums projected). The parent component decides what to do with it
 * — populate a workout form, attach to a plan day, etc.
 *
 * Used by:
 *   - /admin/workouts/new + /admin/workouts/[id]/edit  (Phase 4)
 *   - /admin/plans/[id]/edit "Add exercise" button     (Phase 5)
 */

import { useEffect, useRef, useState } from "react";
import type {
  AppBodyPart,
  AppEquipment,
  ExerciseLibraryEntry,
} from "@/lib/exercise-library";

interface IllustrationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: ExerciseLibraryEntry) => void;
  /** Optional initial query / filter prefills. */
  initialQuery?: string;
  initialBodyPart?: AppBodyPart;
  initialEquipment?: AppEquipment;
}

const BODY_PARTS: { value: AppBodyPart; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "legs", label: "Legs" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full Body" },
  { value: "cardio", label: "Cardio" },
];

const EQUIPMENT: { value: AppEquipment; label: string }[] = [
  { value: "bodyweight", label: "Bodyweight" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "barbell", label: "Barbell" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "machine", label: "Machine" },
  { value: "cable", label: "Cable" },
  { value: "band", label: "Band" },
  { value: "other", label: "Other" },
];

export default function IllustrationPicker({
  open,
  onClose,
  onSelect,
  initialQuery = "",
  initialBodyPart,
  initialEquipment,
}: IllustrationPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [bodyPart, setBodyPart] = useState<AppBodyPart | undefined>(initialBodyPart);
  const [equipment, setEquipment] = useState<AppEquipment | undefined>(initialEquipment);
  const [entries, setEntries] = useState<ExerciseLibraryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when re-opened with new initial values.
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setBodyPart(initialBodyPart);
      setEquipment(initialEquipment);
      setFocusedId(null);
    }
  }, [open, initialQuery, initialBodyPart, initialEquipment]);

  // Body-scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced fetch whenever filters change.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (bodyPart) params.set("bodyPart", bodyPart);
      if (equipment) params.set("equipment", equipment);
      params.set("limit", "60");

      setLoading(true);
      setError(null);
      fetch(`/api/admin/exercise-library?${params.toString()}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load library");
          return res.json();
        })
        .then((data: { entries: ExerciseLibraryEntry[]; total: number }) => {
          setEntries(data.entries);
          setTotal(data.total);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Failed to load library");
          setEntries([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query, bodyPart, equipment]);

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
            <h2 className="text-white font-semibold text-lg">Choose illustration</h2>
            <p className="text-white/40 text-xs mt-1">
              Powered by Free Exercise DB ({total} matching exercises)
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
            placeholder="Search by name or instruction text…"
            className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg py-2 px-3 text-white text-sm focus:border-[#E51A1A] focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              label="All bodies"
              active={!bodyPart}
              onClick={() => setBodyPart(undefined)}
            />
            {BODY_PARTS.map((bp) => (
              <FilterPill
                key={bp.value}
                label={bp.label}
                active={bodyPart === bp.value}
                onClick={() => setBodyPart(bp.value)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              label="All equipment"
              active={!equipment}
              onClick={() => setEquipment(undefined)}
            />
            {EQUIPMENT.map((eq) => (
              <FilterPill
                key={eq.value}
                label={eq.label}
                active={equipment === eq.value}
                onClick={() => setEquipment(eq.value)}
              />
            ))}
          </div>
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="text-center text-white/40 text-sm py-10">Loading…</div>
          )}
          {error && (
            <div className="text-center text-red-400 text-sm py-10">{error}</div>
          )}
          {!loading && !error && entries.length === 0 && (
            <div className="text-center text-white/40 text-sm py-10">
              No exercises match those filters.
            </div>
          )}
          {!loading && !error && entries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {entries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setFocusedId(e.id);
                    onSelect(e);
                    onClose();
                  }}
                  className={`text-left bg-[#1E1E1E] border rounded-xl overflow-hidden hover:border-[#E51A1A]/60 transition-colors cursor-pointer ${
                    focusedId === e.id
                      ? "border-[#E51A1A]"
                      : "border-[#2A2A2A]"
                  }`}
                >
                  <div className="aspect-square bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
                    {e.primaryImageUrl ? (
                      <img
                        src={e.primaryImageUrl}
                        alt={e.name}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-white/20 text-xs">No image</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-white text-sm font-medium truncate">
                      {e.name}
                    </p>
                    <p className="text-white/40 text-[11px] mt-0.5 capitalize">
                      {e.appBodyPart.replace("_", " ")} · {e.appEquipment}
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

function FilterPill({
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
