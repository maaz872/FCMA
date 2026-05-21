import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDateParam(s: string | null): Date {
  if (!s) return todayUtc();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return todayUtc();
  return new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])));
}

/**
 * GET /api/hub/habits?date=YYYY-MM-DD
 * Returns the user's habit row for the requested date (or today if omitted),
 * plus a small history rollup for the last 7 days.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const date = parseDateParam(url.searchParams.get("date"));

  const habit = await prisma.dailyHabit.findUnique({
    where: { userId_date: { userId: user.userId, date } },
  });

  const sevenDaysAgo = new Date(date.getTime() - 6 * 24 * 60 * 60 * 1000);
  const last7 = await prisma.dailyHabit.findMany({
    where: { userId: user.userId, date: { gte: sevenDaysAgo, lte: date } },
    orderBy: { date: "desc" },
    select: { date: true, sleepHours: true, waterLiters: true, moodScore: true, stressScore: true },
  });

  return NextResponse.json({ habit, last7 });
}

/**
 * PUT /api/hub/habits
 * Body: { date: "YYYY-MM-DD", sleepHours?, waterLiters?, moodScore?, stressScore?, notes? }
 * Upserts the row for the given user+date.
 */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    date?: string;
    sleepHours?: number | null;
    waterLiters?: number | null;
    moodScore?: number | null;
    stressScore?: number | null;
    notes?: string | null;
  };
  const date = parseDateParam(body.date ?? null);

  const data = {
    sleepHours: body.sleepHours ?? null,
    waterLiters: body.waterLiters ?? null,
    moodScore: body.moodScore ?? null,
    stressScore: body.stressScore ?? null,
    notes: body.notes ?? null,
  };

  const habit = await prisma.dailyHabit.upsert({
    where: { userId_date: { userId: user.userId, date } },
    create: { userId: user.userId, date, ...data },
    update: data,
  });

  return NextResponse.json({ habit });
}
