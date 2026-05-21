import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/hub/photos — current user's progress photos, grouped client-side
 * by category. Returns full image data (base64) so the comparison view can
 * render two photos side-by-side without a second round-trip.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photos = await prisma.progressPhoto.findMany({
    where: { userId: user.userId },
    orderBy: { photoDate: "desc" },
    select: { id: true, imageData: true, photoDate: true, category: true, notes: true },
  });
  return NextResponse.json({ photos });
}

/**
 * POST /api/hub/photos
 * Body: { imageData: "data:image/...;base64,..." | base64, category, photoDate?, notes? }
 *
 * Stores the image as base64 in the existing imageData column. We don't
 * have Supabase Storage wired yet — once it is, swap the storage path
 * but keep the API shape.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    imageData?: string;
    category?: string;
    photoDate?: string;
    notes?: string | null;
  };
  if (!body.imageData) {
    return NextResponse.json({ error: "imageData required" }, { status: 400 });
  }
  // Soft cap to avoid DB bloat — 5 MB encoded payload.
  if (body.imageData.length > 7_500_000) {
    return NextResponse.json({ error: "Image too large (max ~5 MB)" }, { status: 413 });
  }
  const validCategories = ["front", "side", "back"];
  const category = validCategories.includes(body.category ?? "")
    ? (body.category as string)
    : "front";

  const photo = await prisma.progressPhoto.create({
    data: {
      userId: user.userId,
      imageData: body.imageData,
      photoDate: body.photoDate ? new Date(body.photoDate) : new Date(),
      category,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json({ photo });
}
