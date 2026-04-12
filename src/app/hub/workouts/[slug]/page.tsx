export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import VideoEmbed from "@/components/ui/VideoEmbed";
import VideoThumbnail from "@/components/ui/VideoThumbnail";

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

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const coachId = user.role === "COACH" ? user.userId : user.coachId;
  if (!coachId) redirect("/login");

  const workout = await prisma.workout.findFirst({
    where: { slug, coachId },
    include: { subcategory: { include: { category: true } } },
  });

  if (!workout || !workout.isPublished) {
    notFound();
  }

  const instructions: string[] = JSON.parse(workout.instructions || "[]");
  const hasVideo = !!workout.videoUrl;

  // Related workouts from same subcategory (also scoped to coach)
  const related = await prisma.workout.findMany({
    where: {
      subcategoryId: workout.subcategoryId,
      isPublished: true,
      coachId,
      id: { not: workout.id },
    },
    include: { subcategory: { include: { category: true } } },
    take: 3,
  });

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/hub/workouts"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#E51A1A] transition-colors mb-6"
      >
        <svg
          className="w-4 h-4"
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
        Back to Workouts
      </Link>

      {/* Title */}
      <h1 className="text-3xl font-black text-white mb-4">{workout.title}</h1>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            difficultyColor[workout.difficulty] || "bg-white/10 text-white/50"
          }`}
        >
          {workout.difficulty}
        </span>
        {workout.duration && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/60">
            {workout.duration}
          </span>
        )}
        {workout.targetGoal && (
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              goalColor[workout.targetGoal] || "bg-white/10 text-white/50"
            }`}
          >
            {workout.targetGoal}
          </span>
        )}
        {workout.sets && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400">
            {workout.sets}
          </span>
        )}
        {workout.reps && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400">
            {workout.reps}
          </span>
        )}
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#1E1E1E] border border-[#2A2A2A] text-white/50">
          {workout.subcategory.category.name}{" "}
          <span className="text-white/20">&gt;</span>{" "}
          {workout.subcategory.name}
        </span>
      </div>

      {/* Video Embed */}
      {hasVideo ? (
        <div className="mb-8">
          <VideoEmbed url={workout.videoUrl} />
        </div>
      ) : (
        <div className="relative aspect-video bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl flex flex-col items-center justify-center mb-8 overflow-hidden">
          <svg className="w-16 h-16 text-white/20 mb-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-white/40 text-sm font-semibold">Video Unavailable</span>
        </div>
      )}

      {/* Description */}
      <p className="text-white/70 text-lg leading-relaxed mb-8">
        {workout.description}
      </p>

      {/* Instructions */}
      {instructions.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-black text-white mb-4">Instructions</h2>
          <div className="space-y-4">
            {instructions.map((step, i) => (
              <div
                key={i}
                className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5 flex gap-4"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E51A1A] text-white flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-white/70 pt-1">{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Workouts */}
      {related.length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-white mb-4">
            Related Workouts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map(
              (w: {
                id: number;
                title: string;
                slug: string;
                videoUrl: string;
                difficulty: string;
                duration: string | null;
                targetGoal: string | null;
                subcategory: {
                  name: string;
                  category: { name: string };
                };
              }) => {
                return (
                  <Link
                    key={w.id}
                    href={`/hub/workouts/${w.slug}`}
                    className="group bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#E51A1A]/30"
                  >
                    <VideoThumbnail url={w.videoUrl} height="h-[160px]" />
                    <div className="p-4">
                      <h3 className="font-bold text-white text-sm mb-2 group-hover:text-[#E51A1A] transition-colors line-clamp-2">
                        {w.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            difficultyColor[w.difficulty] ||
                            "bg-white/10 text-white/50"
                          }`}
                        >
                          {w.difficulty}
                        </span>
                        {w.duration && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                            {w.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </section>
      )}
    </div>
  );
}
