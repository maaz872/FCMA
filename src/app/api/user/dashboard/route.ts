import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Today's meals
    const todayMeals = await prisma.mealLog.findMany({
      where: { userId, loggedDate: { gte: today } },
    });
    const mealTotals = todayMeals.reduce(
      (acc: { calories: number; protein: number; carbs: number; fat: number }, m: { calories: number; protein: number; carbs: number; fat: number }) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Macro targets
    const targets = await prisma.userMacroTarget.findUnique({
      where: { userId },
    });

    // Weight
    const latestWeight = await prisma.weightLog.findFirst({
      where: { userId },
      orderBy: { loggedDate: "desc" },
    });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoWeight = await prisma.weightLog.findFirst({
      where: { userId, loggedDate: { lte: weekAgo } },
      orderBy: { loggedDate: "desc" },
    });

    // Streak: count consecutive days backwards from today with meals
    const recentMeals = await prisma.mealLog.findMany({
      where: { userId },
      select: { loggedDate: true },
      orderBy: { loggedDate: "desc" },
    });

    let streak = 0;
    if (recentMeals.length > 0) {
      const uniqueDates = new Set<string>();
      for (const m of recentMeals) {
        const d = new Date(m.loggedDate);
        d.setHours(0, 0, 0, 0);
        uniqueDates.add(d.toISOString());
      }
      const sortedDates = Array.from(uniqueDates).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Check if today or yesterday is the most recent logged date
      const mostRecent = new Date(sortedDates[0]);
      const diffFromToday = Math.round(
        (now.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (diffFromToday > 1) {
        streak = 0;
      } else {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prev = new Date(sortedDates[i - 1]);
          const curr = new Date(sortedDates[i]);
          const diff = Math.round(
            (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000)
          );
          if (diff === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Favourites
    const favCount = await prisma.favourite.count({ where: { userId } });

    // Unread messages
    const unreadCount = await prisma.message.count({
      where: { receiverId: userId, isRead: false },
    });

    // Latest 3 feed posts
    const latestPosts = await prisma.post.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { firstName: true, lastName: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    // User info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    return NextResponse.json({
      user,
      mealTotals,
      targets: targets
        ? {
            calories: targets.calories,
            protein: targets.protein,
            carbs: targets.carbs,
            fat: targets.fat,
            goal: targets.goal,
          }
        : null,
      weight: {
        latest: latestWeight ? latestWeight.weightKg : null,
        weekAgo: weekAgoWeight ? weekAgoWeight.weightKg : null,
      },
      streak,
      favCount,
      unreadCount,
      latestPosts: latestPosts.map((p) => ({
        id: p.id,
        content: p.content.substring(0, 120),
        authorName: `${p.author.firstName} ${p.author.lastName}`,
        likes: p._count.likes,
        comments: p._count.comments,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
