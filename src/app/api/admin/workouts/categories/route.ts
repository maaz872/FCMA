import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.workoutCategory.findMany({
      include: {
        subcategories: {
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
