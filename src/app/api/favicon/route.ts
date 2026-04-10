import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const setting = await prisma.siteContent.findFirst({
      where: { contentKey: "site_favicon" },
    });

    if (setting?.contentValue && setting.contentValue.startsWith("data:")) {
      // Parse base64 data URI: data:image/png;base64,xxxxx
      const match = setting.contentValue.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      }
    }

    // Fallback: redirect to static logo
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/images/logo.svg`);
  } catch {
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/images/logo.svg`);
  }
}
