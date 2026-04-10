import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const restaurant = await prisma.restaurantGuide.findFirst({
      where: { id: Number(id), coachId },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error("Admin GET restaurant error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const restaurantId = Number(id);

    // Verify ownership
    const existing = await prisma.restaurantGuide.findFirst({
      where: { id: restaurantId, coachId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, logoUrl, introduction, tips, menuItems, isPublished } =
      body;

    const restaurant = await prisma.restaurantGuide.update({
      where: { id: restaurantId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(introduction !== undefined && { introduction: introduction.trim() }),
        ...(tips !== undefined && { tips }),
        ...(menuItems !== undefined && {
          menuItems:
            typeof menuItems === "string"
              ? menuItems
              : JSON.stringify(menuItems),
        }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
      },
    });

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error("Admin PUT restaurant error:", error);
    return NextResponse.json(
      { error: "Failed to update restaurant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const restaurantId = Number(id);

    // Verify ownership
    const existing = await prisma.restaurantGuide.findFirst({
      where: { id: restaurantId, coachId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    await prisma.restaurantGuide.delete({ where: { id: restaurantId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin DELETE restaurant error:", error);
    return NextResponse.json(
      { error: "Failed to delete restaurant" },
      { status: 500 }
    );
  }
}
