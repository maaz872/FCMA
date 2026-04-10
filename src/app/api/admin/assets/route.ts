import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";
import { validateBase64Upload } from "@/lib/upload-validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const assets = await prisma.asset.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Admin assets GET error:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const body = await req.json();
    const { filename, data, fileSize, mimeType } = body;

    if (!filename || !data || !mimeType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validation = validateBase64Upload(data, mimeType);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        filename,
        data,
        fileSize: fileSize || 0,
        mimeType,
        uploadedById: scope.user.userId,
        coachId,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Admin assets POST error:", error);
    return NextResponse.json({ error: "Failed to upload asset" }, { status: 500 });
  }
}
