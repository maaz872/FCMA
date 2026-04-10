import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const restaurants = await prisma.restaurantGuide.findMany({
      where: { coachId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error("Admin GET restaurants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const body = await request.json();
    const { name, slug, logoUrl, introduction, tips, menuItems, isPublished } =
      body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (!introduction || !introduction.trim()) {
      return NextResponse.json(
        { error: "Introduction is required" },
        { status: 400 }
      );
    }

    const generatedSlug =
      slug ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const existing = await prisma.restaurantGuide.findFirst({
      where: { slug: generatedSlug, coachId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A restaurant with this slug already exists" },
        { status: 409 }
      );
    }

    const restaurant = await prisma.restaurantGuide.create({
      data: {
        name: name.trim(),
        slug: generatedSlug,
        logoUrl: logoUrl || null,
        introduction: introduction.trim(),
        tips: tips || null,
        menuItems: typeof menuItems === "string" ? menuItems : JSON.stringify(menuItems || []),
        isPublished: Boolean(isPublished),
        coachId,
      },
    });

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error) {
    console.error("Admin POST restaurant error:", error);
    return NextResponse.json(
      { error: "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
