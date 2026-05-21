import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id]/notes
 *
 * Returns all CoachClientNote rows the calling coach has written about
 * this client. Pinned notes first, then newest-first. Never returned to
 * the client themselves (no hub endpoint exists).
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

  const notes = await prisma.coachClientNote.findMany({
    where: { coachId: scope.coachId, clientId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ notes });
}

/**
 * POST /api/admin/users/[id]/notes
 * Body: { content: string, isPinned?: boolean }
 */
export async function POST(
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

  const body = (await request.json()) as { content?: string; isPinned?: boolean };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const note = await prisma.coachClientNote.create({
    data: {
      coachId: scope.coachId,
      clientId,
      content: body.content.trim(),
      isPinned: !!body.isPinned,
    },
  });

  return NextResponse.json({ note });
}
