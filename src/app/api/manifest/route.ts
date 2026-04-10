import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Try to resolve coachId from session for coach-specific manifest
    let coachId: string | null = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        coachId = user.role === "COACH" ? user.userId : user.coachId || null;
      }
    } catch {}

    const where = coachId
      ? { contentKey: { in: ["site_name", "pwa_icon_192", "pwa_icon_512"] }, coachId }
      : { contentKey: { in: ["site_name", "pwa_icon_192", "pwa_icon_512"] } };

    const settings = await prisma.siteContent.findMany({ where });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.contentKey] = s.contentValue;
    }

    const appName = map.site_name || "FCMA";

    const icons = [];

    if (map.pwa_icon_192) {
      icons.push({
        src: map.pwa_icon_192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      });
    } else {
      icons.push({
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      });
    }

    if (map.pwa_icon_512) {
      icons.push({
        src: map.pwa_icon_512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      });
    } else {
      icons.push({
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      });
    }

    const manifest = {
      name: appName,
      short_name: appName,
      description: `Premium fitness coaching with ${appName}`,
      start_url: "/hub",
      scope: "/",
      display: "standalone",
      background_color: "#0A0A0A",
      theme_color: "#0A0A0A",
      orientation: "portrait-primary",
      icons,
    };

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    // Fallback to static manifest
    return NextResponse.json(
      {
        name: "FCMA",
        short_name: "FCMA",
        start_url: "/hub",
        scope: "/",
        display: "standalone",
        background_color: "#0A0A0A",
        theme_color: "#0A0A0A",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      { headers: { "Content-Type": "application/manifest+json" } }
    );
  }
}
