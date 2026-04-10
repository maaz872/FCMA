import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Users who uploaded payment proof (have a screenshot)
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
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
