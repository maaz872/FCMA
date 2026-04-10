import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export default async function Footer() {
  let socials: { name: string; url: string; visible: boolean }[] = [];
  let siteName = "FCMA";
  let logoUrl = "/images/logo.svg";

  try {
    // Resolve the current coach from the session, if any
    let coachId: string | null = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        coachId = user.role === "COACH" ? user.userId : user.coachId || null;
      }
    } catch {}

    // Anonymous (or SUPER_ADMIN) → use static FCMA defaults, no DB query
    // so we never leak another coach's branding to public visitors.
    if (!coachId) {
      socials = [];
    } else {
      const settings = await prisma.siteContent.findMany({
        where: {
          coachId,
          contentKey: {
            in: [
              "social_youtube", "social_instagram", "social_facebook", "social_tiktok",
              "social_youtube_visible", "social_instagram_visible", "social_facebook_visible", "social_tiktok_visible",
              "site_name", "site_logo",
            ],
          },
        },
      });

      const s: Record<string, string> = {};
      for (const item of settings) s[item.contentKey] = item.contentValue;

      if (s.site_name) siteName = s.site_name;
      if (s.site_logo) logoUrl = s.site_logo;

      socials = [
        { name: "YouTube", url: s.social_youtube || "", visible: s.social_youtube_visible === "true" },
        { name: "Instagram", url: s.social_instagram || "", visible: s.social_instagram_visible === "true" },
        { name: "Facebook", url: s.social_facebook || "", visible: s.social_facebook_visible === "true" },
        { name: "TikTok", url: s.social_tiktok || "", visible: s.social_tiktok_visible === "true" },
      ].filter((item) => item.visible);
    }
  } catch {
    socials = [];
  }

  return (
    <footer className="bg-[#0A0A0A] text-white pt-15 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Logo + Copyright */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={siteName}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
              <span className="font-bold text-base tracking-wider uppercase">
                {siteName}
              </span>
            </div>
            <p className="text-white/50 text-sm mt-2">
              &copy; 2026 {siteName.toUpperCase()}. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[0.85rem] uppercase tracking-[2px] mb-4 text-white/60">
              Quick Links
            </h4>
            <div className="flex flex-col gap-1">
              <Link href="/login" className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors">Login</Link>
              <Link href="/privacy-policy" className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors">Terms</Link>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-[0.85rem] uppercase tracking-[2px] mb-4 text-white/60">
              Follow us
            </h4>
            <div className="flex flex-col gap-1">
              {socials.length > 0 ? (
                socials.map((social) =>
                  social.url ? (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors"
                    >
                      {social.name}
                    </a>
                  ) : (
                    <span
                      key={social.name}
                      className="text-white/70 text-[0.9rem]"
                    >
                      {social.name}
                    </span>
                  )
                )
              ) : (
                <span className="text-white/40 text-[0.9rem]">Coming soon</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[#1E1E1E] mt-10 pt-5 text-center text-white/40 text-sm">
          <Link href="/privacy-policy" className="hover:text-white/60">Privacy Policy</Link>
          <span className="mx-2">|</span>
          <Link href="/terms" className="hover:text-white/60">Terms and Conditions</Link>
        </div>
      </div>
    </footer>
  );
}
