import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: rawId } = await params;
  const photoId = parseInt(rawId);
  if (!Number.isFinite(photoId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const photo = await prisma.progressPhoto.findFirst({
    where: { id: photoId, userId: user.userId },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  await prisma.progressPhoto.delete({ where: { id: photoId } });
  return NextResponse.json({ success: true });
}
