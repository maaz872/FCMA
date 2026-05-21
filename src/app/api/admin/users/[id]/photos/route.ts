import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id]/photos
 * Coach read of a client's progress photos. Returns full image data so
 * the comparison UI can render two photos side-by-side without N
 * round-trips.
 */
export async function GET(
  _request: Request,
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

  const photos = await prisma.progressPhoto.findMany({
    where: { userId: clientId },
    orderBy: { photoDate: "desc" },
    select: { id: true, imageData: true, photoDate: true, category: true, notes: true },
  });
  return NextResponse.json({ photos });
}
