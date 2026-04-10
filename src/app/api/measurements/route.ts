import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyAdmin } from "@/lib/notifications";
import { validateBase64Upload } from "@/lib/upload-validation";

export async function GET(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") || "90";
  const range = rangeParam === "all" ? 0 : parseInt(rangeParam) || 90;

  const cutoff = range > 0
    ? new Date(Date.now() - range * 24 * 60 * 60 * 1000)
    : new Date(0);

  const measurements = await prisma.bodyMeasurement.findMany({
    where: {
      userId: session.userId,
      loggedDate: { gte: cutoff },
    },
    orderBy: { loggedDate: "desc" },
  });

  return NextResponse.json({ measurements });
}

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const {
    loggedDate,
    weightKg,
    bellyInches,
    chestInches,
    waistInches,
    hipsInches,
    armsInches,
    imageData,
    notes,
  } = body;

  // If a progress photo is attached, validate it
  if (imageData) {
    const validation = validateBase64Upload(imageData);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
  }

  const date = loggedDate
    ? new Date(loggedDate + "T00:00:00.000Z")
    : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  const measurement = await prisma.bodyMeasurement.upsert({
    where: {
      userId_loggedDate: {
        userId: session.userId,
        loggedDate: date,
      },
    },
    update: {
      ...(weightKg !== undefined && { weightKg }),
      ...(bellyInches !== undefined && { bellyInches }),
      ...(chestInches !== undefined && { chestInches }),
      ...(waistInches !== undefined && { waistInches }),
      ...(hipsInches !== undefined && { hipsInches }),
      ...(armsInches !== undefined && { armsInches }),
      ...(imageData !== undefined && { imageData }),
      ...(notes !== undefined && { notes }),
    },
    create: {
      userId: session.userId,
      loggedDate: date,
      weightKg: weightKg || null,
      bellyInches: bellyInches || null,
      chestInches: chestInches || null,
      waistInches: waistInches || null,
      hipsInches: hipsInches || null,
      armsInches: armsInches || null,
      imageData: imageData || null,
      notes: notes || null,
    },
  });

  // Notify admin about new measurements
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true },
    });
    const firstName = dbUser?.firstName || "A user";
    notifyAdmin(
      `${firstName} logged new measurements`,
      `${firstName} updated their body measurements${weightKg ? ` (${weightKg}kg)` : ""}`,
      "admin_alert",
      `/admin/users/${session.userId}#body`
    );
  } catch {
    // Don't fail the request if notification fails
  }

  return NextResponse.json({ measurement });
}
