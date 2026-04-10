import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const categories = await prisma.workoutCategory.findMany({
      where: { coachId },
      include: {
        subcategories: {
          where: { coachId },
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(
      categories.map(
        (c: {
          id: number;
          name: string;
          slug: string;
          subcategories: { id: number; name: string; slug: string }[];
        }) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          subcategories: c.subcategories,
        })
      )
    );
  } catch (error) {
    console.error("Get workout categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
