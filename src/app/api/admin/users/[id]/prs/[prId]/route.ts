import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/users/[id]/prs/[prId]
 * Removes a single PR row. Used to undo a mistaken entry.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; prId: string }> },
) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId, prId: rawPrId } = await params;
  const prId = parseInt(rawPrId);
  if (!Number.isFinite(prId)) {
    return NextResponse.json({ error: "Invalid prId" }, { status: 400 });
  }

  const pr = await prisma.personalRecord.findFirst({
    where: { id: prId, userId: clientId, user: { coachId: scope.coachId } },
  });
  if (!pr) return NextResponse.json({ error: "PR not found" }, { status: 404 });

  await prisma.personalRecord.delete({ where: { id: prId } });
  return NextResponse.json({ success: true });
}
