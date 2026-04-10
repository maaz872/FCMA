import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const templateId = parseInt(id);

    const template = await prisma.planTemplate.findUnique({
      where: { id: templateId },
      include: {
        days: {
          include: { workout: { select: { id: true, title: true, slug: true } } },
          orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Get plan template error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const templateId = parseInt(id);
    const body = await request.json();
    const { name, description, type, durationWeeks } = body;

    const template = await prisma.planTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(durationWeeks !== undefined && { durationWeeks: parseInt(durationWeeks) }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Update plan template error:", error);
    return NextResponse.json(
      { error: "Failed to update plan template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const templateId = parseInt(id);

    await prisma.planTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete plan template error:", error);
    return NextResponse.json(
      { error: "Failed to delete plan template" },
      { status: 500 }
    );
  }
}
