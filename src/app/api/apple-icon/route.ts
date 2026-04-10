import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Try to resolve coachId from session for coach-specific PWA icon
    let coachId: string | null = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        coachId = user.role === "COACH" ? user.userId : user.coachId || null;
      }
    } catch {}

    // Only query DB if coachId is known — otherwise anonymous users would
    // see whichever coach's icon happened to be first in the table.
    const setting = coachId
      ? await prisma.siteContent.findFirst({
          where: { contentKey: "pwa_icon_192", coachId },
        })
      : null;

    if (setting?.contentValue && setting.contentValue.startsWith("data:")) {
      const match = setting.contentValue.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }
    }

    // Fallback to static placeholder
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/icon-192.png`);
  } catch {
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/icon-192.png`);
  }
}
