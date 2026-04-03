import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseRange(rangeParam: string): number {
  switch (rangeParam) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    case "all": return 0;
    default: {
      const num = parseInt(rangeParam);
      return isNaN(num) ? 90 : num;
    }
  }
}

export async function GET(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") || "90";
  const range = parseRange(rangeParam);

  const cutoff = range > 0
    ? new Date(Date.now() - range * 24 * 60 * 60 * 1000)
    : new Date(0);

  const logs = await prisma.stepLog.findMany({
    where: {
      userId: session.userId,
      loggedDate: { gte: cutoff },
    },
    orderBy: { loggedDate: "desc" },
  });

  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { steps, goal, loggedDate } = body;

  if (!steps || typeof steps !== "number" || steps < 0) {
    return NextResponse.json({ error: "Invalid steps value" }, { status: 400 });
  }

  const date = loggedDate
    ? new Date(loggedDate + "T00:00:00.000Z")
    : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  const log = await prisma.stepLog.upsert({
    where: {
      userId_loggedDate: {
        userId: session.userId,
        loggedDate: date,
      },
    },
    update: {
      steps,
      ...(goal !== undefined && { goal }),
    },
    create: {
      userId: session.userId,
      steps,
      goal: goal || 10000,
      loggedDate: date,
    },
  });

  return NextResponse.json({ log });
}

export async function DELETE(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { loggedDate } = body;

  if (!loggedDate) {
    return NextResponse.json({ error: "loggedDate required" }, { status: 400 });
  }

  const date = new Date(loggedDate + "T00:00:00.000Z");

  await prisma.stepLog.deleteMany({
    where: {
      userId: session.userId,
      loggedDate: date,
    },
  });

  return NextResponse.json({ success: true });
}
