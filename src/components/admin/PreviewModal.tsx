"use client";

import VideoEmbed from "@/components/ui/VideoEmbed";
import ExerciseGif from "@/components/ui/ExerciseGif";

interface WorkoutPreview {
  title: string;
  description?: string;
  videoUrl?: string;
  /** Phase 4 illustration fields — populated when the workout was built
   *  via the Free Exercise DB picker, or hand-set by the coach. */
  gifUrl?: string | null;
  bodyPart?: string | null;
  equipment?: string | null;
  primaryMuscles?: string | null;
  difficulty?: string;
  duration?: string | null;
  targetGoal?: string | null;
  instructions?: string;
}

interface RecipePreview {
  title: string;
  description?: string;
  videoUrl?: string | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servings?: number;
  prepTimeMins?: number;
  cookTimeMins?: number;
  ingredients?: string;
  instructions?: string;
  category?: string;
}

interface PreviewModalProps {
  type: "workout" | "recipe";
  data: WorkoutPreview | RecipePreview;
  onClose: () => void;
}

function parseJson(s?: string): string[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-500/20 text-green-400",
  Intermediate: "bg-[#FF6B00]/20 text-[#FF6B00]",
  Advanced: "bg-[#E51A1A]/20 text-[#E51A1A]",
};

export default function PreviewModal({ type, data, onClose }: PreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] px-2 py-0.5 rounded-full font-bold uppercase">
              User Preview
            </span>
            <span className="text-sm text-white/50">{type === "workout" ? "Workout" : "Recipe"}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl bg-transparent border-none cursor-pointer leading-none">&times;</button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {type === "workout" ? (
            <WorkoutPreviewContent data={data as WorkoutPreview} />
          ) : (
            <RecipePreviewContent data={data as RecipePreview} />
          )}
        </div>
      </div>
    </div>
  );
}

function WorkoutPreviewContent({ data }: { data: WorkoutPreview }) {
  const hasVideo = !!data.videoUrl;
  const hasGif = !!data.gifUrl;
  return (
    <div className="space-y-5">
      {/* Media: prefer gif + video side-by-side, fall back to whichever
          one is set, and show an explicit "no media" placeholder rather
          than rendering nothing when both are missing. Mirrors the
          /hub/workouts/[slug] layout introduced in Phase 6 so coaches
          preview exactly what their clients see. */}
      {/* Video wins when present — single big player, no side-by-side. */}
      {hasVideo ? (
        <VideoEmbed url={data.videoUrl!} />
      ) : hasGif ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden aspect-square max-h-96 mx-auto">
          <ExerciseGif src={data.gifUrl!} alt={data.title} className="w-full h-full" />
        </div>
      ) : (
        <div className="aspect-video bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl flex flex-col items-center justify-center text-center px-6">
          <svg className="w-10 h-10 text-white/20 mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <p className="text-white/40 text-xs">
            No video or illustration attached. Add one from the edit page so users have something to follow.
          </p>
        </div>
      )}
      <div>
        <h2 className="text-2xl font-black text-white mb-2">{data.title}</h2>
        <div className="flex flex-wrap gap-2">
          {data.difficulty && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${difficultyColor[data.difficulty] || "bg-white/10 text-white/50"}`}>
              {data.difficulty}
            </span>
          )}
          {data.bodyPart && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/50 capitalize">
              {data.bodyPart.replace("_", " ")}
            </span>
          )}
          {data.equipment && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/50 capitalize">
              {data.equipment}
            </span>
          )}
          {data.duration && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/50">{data.duration}</span>
          )}
          {data.targetGoal && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/20 text-purple-400">{data.targetGoal}</span>
          )}
        </div>
        {data.primaryMuscles && (
          <p className="text-white/40 text-xs mt-2 capitalize">
            Primary muscles: {data.primaryMuscles.split(",").join(", ")}
          </p>
        )}
      </div>
      {data.description && <p className="text-white/60 text-sm leading-relaxed">{data.description}</p>}
      {parseJson(data.instructions).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Instructions</h3>
          <ol className="space-y-2">
            {parseJson(data.instructions).map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-[#E51A1A] font-bold shrink-0">{i + 1}.</span>
                <span className="text-white/70">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function RecipePreviewContent({ data }: { data: RecipePreview }) {
  return (
    <div className="space-y-5">
      {data.videoUrl && <VideoEmbed url={data.videoUrl} />}
      <div>
        {data.category && <span className="text-xs text-[#FF6B00] font-semibold uppercase">{data.category}</span>}
        <h2 className="text-2xl font-black text-white mt-1">{data.title}</h2>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#E51A1A]/10 border border-[#E51A1A]/20 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-white">{data.calories || 0}</p>
          <p className="text-[9px] text-white/40 uppercase font-semibold">kcal</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-blue-400">{Math.round(data.protein || 0)}g</p>
          <p className="text-[9px] text-blue-400/60 uppercase font-semibold">Protein</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-amber-400">{Math.round(data.carbs || 0)}g</p>
          <p className="text-[9px] text-amber-400/60 uppercase font-semibold">Carbs</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-rose-400">{Math.round(data.fat || 0)}g</p>
          <p className="text-[9px] text-rose-400/60 uppercase font-semibold">Fat</p>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-white/40">
        {(data.prepTimeMins || 0) > 0 && <span>Prep: {data.prepTimeMins} min</span>}
        {(data.cookTimeMins || 0) > 0 && <span>Cook: {data.cookTimeMins} min</span>}
        <span>Serves: {data.servings || 1}</span>
      </div>
      {data.description && <p className="text-white/60 text-sm leading-relaxed">{data.description}</p>}
      {parseJson(data.ingredients).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Ingredients</h3>
          <ul className="space-y-1.5">
            {parseJson(data.ingredients).map((ing, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E51A1A] shrink-0" />
                {ing}
              </li>
            ))}
          </ul>
        </div>
      )}
      {parseJson(data.instructions).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Instructions</h3>
          <ol className="space-y-2">
            {parseJson(data.instructions).map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-[#E51A1A] font-bold shrink-0">{i + 1}.</span>
                <span className="text-white/70">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
