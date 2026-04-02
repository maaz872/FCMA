import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Coach Raheel | Level Up",
  description:
    "Meet Coach Raheel — Athletic Therapist, Personal Trainer, and the founder of Level Up. Learn about his science-backed approach to fat loss and body recomposition.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero Banner */}
      <section className="relative h-[400px]">
        <Image
          src="/images/Coach_4.jpeg"
          alt="Coach Raheel"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-black/60 to-black/30" />
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-[1200px] mx-auto px-6 pb-12 w-full">
            <span className="inline-block bg-[#E51A1A]/10 border border-[#E51A1A]/30 text-[#E51A1A] text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              About
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white">Meet Coach Raheel</h1>
          </div>
        </div>
      </section>

      {/* Bio Section */}
      <section className="bg-[#0A0A0A] py-20 px-6">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-12 items-start">
          {/* Coach Image */}
          <div className="relative h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-[#2A2A2A]">
            <Image
              src="/images/Coach_1.jpeg"
              alt="Coach Raheel - back muscles"
              fill
              className="object-cover"
            />
          </div>

          {/* Bio Text */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              The Coach Behind Level Up
            </h2>

            <p className="text-white/70 leading-relaxed">
              Coach Raheel is a qualified Athletic Therapist (B.Sc Hons) and certified
              Personal Trainer with years of hands-on experience in fat loss, body
              recomposition, and performance coaching. His background in both clinical
              rehabilitation and strength training gives him a unique edge when it comes
              to designing programmes that are safe, effective, and built to last.
            </p>

            <p className="text-white/70 leading-relaxed">
              His philosophy is straightforward: no fad diets, no extreme restrictions,
              no quick fixes. Everything is rooted in science-backed nutrition and
              training principles that fit your real life. Whether you work long hours,
              travel regularly, or have family commitments, Raheel designs programmes
              that work around your lifestyle — not the other way around.
            </p>

            <p className="text-white/70 leading-relaxed">
              Since founding Level Up, Coach Raheel has helped hundreds of people
              transform their bodies and their confidence. His clients range from
              complete beginners stepping into the gym for the first time to advanced
              lifters looking to break through plateaus — men and women of all ages
              and backgrounds, across more than 15 countries worldwide.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 text-center">
                <p className="text-2xl font-black text-white">500+</p>
                <p className="text-white/50 text-sm">Transformations</p>
              </div>
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 text-center">
                <p className="text-2xl font-black text-white">15+</p>
                <p className="text-white/50 text-sm">Countries</p>
              </div>
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 text-center">
                <p className="text-2xl font-black text-white">B.Sc Hons</p>
                <p className="text-white/50 text-sm">Athletic Therapy</p>
              </div>
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 text-center">
                <p className="text-2xl font-black text-white">4.9</p>
                <p className="text-white/50 text-sm">Average Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="bg-[#111111] py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white text-center mb-14">
            What We Offer
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-[900px] mx-auto">
            {/* The Hub Card */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8">
              <div className="inline-block bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                Self-Guided
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">The Hub</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                400+ macro-friendly recipes, a smart calorie calculator, daily meal
                tracker, restaurant guides, and progress tracking tools. Everything
                you need to take control of your nutrition — for a one-time payment
                of &euro;79.
              </p>
              <Link
                href="/nutrition"
                className="inline-block bg-[#FF6B00] hover:bg-[#E56000] text-white font-bold px-6 py-3 rounded-xl text-sm uppercase tracking-wider transition-colors"
              >
                Learn More
              </Link>
            </div>

            {/* Coaching Card */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8">
              <div className="inline-block bg-[#E51A1A]/10 text-[#E51A1A] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                1:1 Coaching
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Coaching</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Get a fully personalised training and nutrition programme from Coach
                Raheel. Weekly check-ins, direct messaging support, programme
                adjustments, and full Hub access included. Packages starting from
                &euro;399.
              </p>
              <Link
                href="/coaching/apply"
                className="inline-block bg-[#E51A1A] hover:bg-[#C41010] text-white font-bold px-6 py-3 rounded-xl text-sm uppercase tracking-wider transition-colors"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0A0A0A] py-20 px-6">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Ready To Get Started?
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Whether you go self-guided with The Hub or get 1:1 support from Coach
            Raheel, your transformation starts today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/checkout"
              className="bg-[#E51A1A] hover:bg-[#C41010] text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
            >
              Get The Hub &mdash; &euro;79
            </Link>
            <Link
              href="/coaching/apply"
              className="border border-white/30 hover:border-white/60 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
            >
              Apply for Coaching
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
