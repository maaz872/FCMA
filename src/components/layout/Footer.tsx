import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";

export default async function Footer() {
  let socials: { name: string; url: string; visible: boolean }[] = [];

  try {
    const settings = await prisma.siteContent.findMany({
      where: {
        contentKey: {
          in: [
            "social_youtube", "social_instagram", "social_facebook", "social_tiktok",
            "social_youtube_visible", "social_instagram_visible", "social_facebook_visible", "social_tiktok_visible",
          ],
        },
      },
    });

    const s: Record<string, string> = {};
    for (const item of settings) s[item.contentKey] = item.contentValue;

    socials = [
      { name: "YouTube", url: s.social_youtube || "", visible: s.social_youtube_visible === "true" },
      { name: "Instagram", url: s.social_instagram || "", visible: s.social_instagram_visible === "true" },
      { name: "Facebook", url: s.social_facebook || "", visible: s.social_facebook_visible === "true" },
      { name: "TikTok", url: s.social_tiktok || "", visible: s.social_tiktok_visible === "true" },
    ].filter((item) => item.visible);
  } catch {
    // Fallback during build or when DB unavailable
    socials = [
      { name: "YouTube", url: "", visible: true },
      { name: "Instagram", url: "", visible: true },
      { name: "Facebook", url: "", visible: true },
    ];
  }

  return (
    <footer className="bg-[#0A0A0A] text-white pt-15 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.5fr] gap-10">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/images/logo.svg"
                alt="Level Up"
                width={36}
                height={36}
                className="rounded-full"
              />
              <span className="font-bold text-base tracking-wider uppercase">
                Level Up
              </span>
            </div>
            <p className="text-white/50 text-sm mt-2">
              &copy; 2026 LEVEL UP. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[0.85rem] uppercase tracking-[2px] mb-4 text-white/60">
              Find out more
            </h4>
            <div className="flex flex-col gap-1">
              <Link href="/" className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors">Coaching</Link>
              <Link href="/nutrition" className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors">Nutrition</Link>
              <Link href="/about" className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors">About</Link>
              <Link href="/testimonials" className="text-white/70 text-[0.9rem] hover:text-[#E51A1A] transition-colors">Testimonials</Link>
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

          {/* Newsletter */}
          <div>
            <h4 className="text-[0.85rem] uppercase tracking-[2px] mb-4 text-white/60">
              Sign up for our newsletter
            </h4>
            <div className="flex mt-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-3 rounded-l-full text-[0.9rem] bg-[#1E1E1E] border border-[#2A2A2A] border-r-0 text-white placeholder:text-white/40 outline-none focus:border-[#E51A1A]"
              />
              <button className="px-6 py-3 bg-[#E51A1A] text-white border-none rounded-r-full font-bold text-[0.8rem] uppercase cursor-pointer hover:bg-[#C41010] transition-colors">
                Subscribe
              </button>
            </div>
            <p className="text-white/40 text-[0.75rem] mt-2">
              By clicking subscribe, I have read and understood the{" "}
              <Link href="/privacy-policy" className="text-white/50 underline">
                Privacy Policy
              </Link>{" "}
              &amp;{" "}
              <Link href="/terms" className="text-white/50 underline">
                Terms and Conditions
              </Link>
              .
            </p>
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
