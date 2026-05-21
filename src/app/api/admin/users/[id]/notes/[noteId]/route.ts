import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/users/[id]/notes/[noteId]
 * Body: { content?: string, isPinned?: boolean }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId, noteId: rawNoteId } = await params;
  const noteId = parseInt(rawNoteId);
  if (!Number.isFinite(noteId)) {
    return NextResponse.json({ error: "Invalid noteId" }, { status: 400 });
  }

  const note = await prisma.coachClientNote.findFirst({
    where: { id: noteId, coachId: scope.coachId, clientId },
  });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const body = (await request.json()) as { content?: string; isPinned?: boolean };
  const patch: Record<string, unknown> = {};
  if (typeof body.content === "string") patch.content = body.content.trim();
  if (typeof body.isPinned === "boolean") patch.isPinned = body.isPinned;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.coachClientNote.update({
    where: { id: noteId },
    data: patch,
  });

  return NextResponse.json({ note: updated });
}

/**
 * DELETE /api/admin/users/[id]/notes/[noteId]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId, noteId: rawNoteId } = await params;
  const noteId = parseInt(rawNoteId);
  if (!Number.isFinite(noteId)) {
    return NextResponse.json({ error: "Invalid noteId" }, { status: 400 });
  }

  const note = await prisma.coachClientNote.findFirst({
    where: { id: noteId, coachId: scope.coachId, clientId },
  });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  await prisma.coachClientNote.delete({ where: { id: noteId } });
  return NextResponse.json({ success: true });
}
