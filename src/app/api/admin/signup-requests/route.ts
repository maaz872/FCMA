import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET() {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { coachId } = scope;

  // Users who uploaded payment proof (have a screenshot) and belong to this coach
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      coachId,
      paymentScreenshot: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      country: true,
      plan: true,
      planStatus: true,
      paymentScreenshot: true,
      paymentAccountName: true,
      paymentTransactionRef: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
