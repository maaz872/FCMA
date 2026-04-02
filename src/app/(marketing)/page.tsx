export const dynamic = "force-dynamic";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import TestimonialTabs from "@/components/marketing/TestimonialTabs";

const transformations = [
  { name: "Sarah M.", stat: "Lost 14kg" },
  { name: "Daniel T.", stat: "Lost 20kg" },
  { name: "Emma R.", stat: "Lost 11kg" },
  { name: "James K.", stat: "Lost 18kg" },
  { name: "Aoife B.", stat: "Lost 9kg" },
  { name: "Liam C.", stat: "Lost 16kg" },
  { name: "Sophie W.", stat: "Lost 12kg" },
  { name: "Mark D.", stat: "Lost 22kg" },
  { name: "Rachel H.", stat: "Lost 10kg" },
  { name: "Chris P.", stat: "Lost 15kg" },
];

const coachPhotos = [
  "/images/Coach_1.jpeg",
  "/images/Coach_2.jpeg",
  "/images/Coach_Hero.svg",
  "/images/Coach_4.jpeg",
];

export default async function HomePage() {
  const [hubTestimonials, siteSettings] = await Promise.all([
    prisma.testimonial.findMany({
      where: { isPublished: true },
      take: 12,
      orderBy: { displayOrder: "asc" },
      select: { id: true, clientName: true, duration: true, quote: true, profilePhoto: false },
    }),
    prisma.siteContent.findMany(),
  ]);

  const cfg: Record<string, string> = {};
  for (const s of siteSettings) cfg[s.contentKey] = s.contentValue;

  return (
    <>
      {/* ── Section 1: Hero ── */}
      <section className="relative min-h-[90vh] flex items-center">
        <Image
          src="/images/Coach_Hero.svg"
          alt="Coach Raheel in the gym"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40" />
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-20">
          <span className="inline-block bg-[#E51A1A]/10 border border-[#E51A1A]/30 text-[#E51A1A] text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
            Transform Your Physique
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Build The Body<br />You Deserve.
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-[600px] mb-10 leading-relaxed">
            Level Up gives you the proven nutrition tools, recipes, and tracking system
            you need to lose fat, build lean muscle, and keep it off for good.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/nutrition"
              className="bg-[#E51A1A] hover:bg-[#C41010] text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
            >
              Get The Hub &mdash; &euro;79
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 2: Stats Bar ── */}

      {/* ── Section 3: Stats Bar ── */}
      <section className="bg-[#0A0A0A] py-16 px-6 border-y border-[#1E1E1E]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "500+", label: "Transformations" },
            { value: "10,000+", label: "Hub Members" },
            { value: "4.9\u2605", label: "Average Rating" },
            { value: "15+", label: "Countries" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-white/50 text-sm uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4: Hub Preview ── */}
      <section className="bg-[#111111] py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white text-center mb-14">
            What&rsquo;s Inside The Hub
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "\uD83C\uDF74",
                title: "400+ Recipes",
                desc: "Macro-friendly meals that actually taste good. Every recipe includes a video guide, full ingredient list, and complete macro breakdown.",
              },
              {
                icon: "\uD83E\uDDEE",
                title: "Smart Calculator",
                desc: "Get your exact calorie and macro targets based on your body stats, activity level, and fat loss goals. No more guessing.",
              },
              {
                icon: "\uD83D\uDCCA",
                title: "Track Everything",
                desc: "Log your meals, track your weight, monitor your progress with charts, and stay accountable every single day.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8"
              >
                <span className="text-4xl mb-4 block">{card.icon}</span>
                <h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/nutrition"
              className="text-[#E51A1A] hover:text-[#FF6B00] font-bold text-sm uppercase tracking-wider transition-colors"
            >
              See All Features &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 5: Coaching Spotlight ── */}

      {/* ── Section 6: Testimonials ── */}
      {cfg.section_testimonials_visible === "true" && (
        <TestimonialTabs
          testimonials={hubTestimonials.map((t) => ({
            id: t.id,
            clientName: t.clientName,
            duration: t.duration,
            quote: t.quote,
            profilePhoto: null,
          }))}
        />
      )}

      {/* ── Section 7: Transformation Grid ── */}
      {cfg.section_transformations_visible === "true" && (
        <section className="bg-[#0A0A0A] py-20 px-6">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-white text-center mb-14">
              The Proof Is In The Results
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {transformations.map((t, i) => (
                <div key={t.name} className="relative rounded-xl overflow-hidden group h-64">
                  <Image
                    src={coachPhotos[i % coachPhotos.length]}
                    alt={t.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-bold text-sm">{t.name}</p>
                    <p className="text-[#E51A1A] text-xs font-semibold">{t.stat}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 8: Final CTA ── */}
      <section className="bg-[#111111] py-20 px-6">
        <div className="max-w-[800px] mx-auto">
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <div className="h-1 bg-[#E51A1A]" />
            <div className="p-10 md:p-14 text-center">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Ready To Transform?
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-[550px] mx-auto">
                Stop putting it off. The best time to start was yesterday. The second best time is now.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/checkout"
                  className="bg-[#E51A1A] hover:bg-[#C41010] text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
                >
                  Get The Hub &mdash; &euro;79
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
