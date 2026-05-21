import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id]/habits?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns this client's habit rows in the given window (defaults to
 * last 30 days). Coach-only read.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;

  const client = await prisma.user.findFirst({
    where: { id: clientId, coachId: scope.coachId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const url = new URL(request.url);
  function parseDate(s: string | null, fallback: Date): Date {
    if (!s) return fallback;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return fallback;
    return new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])));
  }
  const today = (() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  })();
  const thirtyAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = parseDate(url.searchParams.get("from"), thirtyAgo);
  const to = parseDate(url.searchParams.get("to"), today);

  const habits = await prisma.dailyHabit.findMany({
    where: { userId: clientId, date: { gte: from, lte: to } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ habits });
}
