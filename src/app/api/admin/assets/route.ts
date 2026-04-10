import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assets = await prisma.asset.findMany({
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
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { filename, data, fileSize, mimeType } = body;

    if (!filename || !data || !mimeType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        filename,
        data,
        fileSize: fileSize || 0,
        mimeType,
        uploadedById: user.userId,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Admin assets POST error:", error);
    return NextResponse.json({ error: "Failed to upload asset" }, { status: 500 });
  }
}
