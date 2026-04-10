import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const setting = await prisma.siteContent.findFirst({
      where: { contentKey: "pwa_icon_192" },
    });

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
