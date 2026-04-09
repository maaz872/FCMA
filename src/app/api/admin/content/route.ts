import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Increase limits for image uploads (base64 can be large)
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// GET — return all SiteContent as { [contentKey]: contentValue }
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.siteContent.findMany();
  const data: Record<string, string> = {};
  for (const row of rows) {
    data[row.contentKey] = row.contentValue;
  }
  return NextResponse.json(data);
}

// PUT — accept { entries: { [key]: value } } and upsert each
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const entries: Record<string, string> = body.entries || {};

  const upserts = Object.entries(entries).map(([key, value]) =>
    prisma.siteContent.upsert({
      where: { contentKey: key },
      update: { contentValue: value },
      create: { contentKey: key, contentValue: value },
    })
  );

  await Promise.all(upserts);

  return NextResponse.json({ success: true });
}
