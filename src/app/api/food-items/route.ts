import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getCoachScope } from "@/lib/coach-scope";

export async function GET(req: NextRequest) {
  try {
    const scope = await getCoachScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const items = await prisma.foodItem.findMany({
      where: {
        coachId,
        ...(search && { name: { contains: search, mode: "insensitive" as const } }),
        ...(category && { category }),
      },
      take: 50,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Food items search error:", error);
    return NextResponse.json({ error: "Failed to fetch food items" }, { status: 500 });
  }
}
