import type { Metadata } from "next";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import PhoneMockup from "@/components/ui/PhoneMockup";
import PricingBox from "@/components/ui/PricingBox";
import StatsBar from "@/components/ui/StatsBar";
import FeatureItem from "@/components/ui/FeatureItem";
import StepCard from "@/components/ui/StepCard";
import WhyCard from "@/components/ui/WhyCard";
import TransformationCard from "@/components/ui/TransformationCard";
import CountdownTimer from "@/components/ui/CountdownTimer";
import FAQAccordion from "@/components/ui/FAQAccordion";
import CTASection from "@/components/ui/CTASection";

export const metadata: Metadata = {
  title: "The Hub | Level Up",
};

export default function NutritionPage() {
  return (
    <>
      {/* 1. Hero */}
      <Section bg="cream">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-6">
              You Don&apos;t Need A New Diet. You Need{" "}
              <span className="text-primary">The Hub</span>.
            </h1>
            <p className="text-white/60 text-lg mb-8 max-w-[520px]">
              Stop relying on willpower. The Hub gives you a proven system
              with recipes, tracking tools, and guidance so you can finally
              take control of your nutrition for good.
            </p>

            <ul className="mb-8 space-y-3">
              {[
                "400+ easy-to-follow recipes with macro breakdowns",
                "Built-in calorie & macro calculator",
                "Photo-based meal tracking with Snap My Macros",
                "Lifetime access with one single payment",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-white/70"
                >
                  <span className="text-primary font-bold text-xl leading-none mt-0.5">
                    &#10003;
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <PricingBox
              price={79}
              oldPrice={119}
              note="One-off payment for lifetime access"
              oldNote="annual renewal of &euro;49"
              ctaText="Start Now"
              ctaHref="/checkout"
            />
          </div>

          <div className="flex justify-center">
            <PhoneMockup size="lg" label="The Hub<br>by Level Up" />
          </div>
        </div>
      </Section>

      {/* 2. Stats Bar */}
      <StatsBar
        items={[
          {
            title: "400+ Recipes",
            description: "Hundreds of recipes updated regularly",
          },
          {
            title: "One Payment",
            description:
              "One-off payment for lifetime access with no hidden fees",
          },
          {
            title: "Instant Access",
            description:
              "Once you sign up, you'll have instant access",
          },
          {
            title: "10,000+ Members",
            description:
              "Join the thousands who have already started",
          },
        ]}
      />

      {/* 3. What's Inside */}
      <Section bg="light">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold">
            What&apos;s Inside
          </h2>
          <p className="text-white/50 mt-3 max-w-[550px] mx-auto">
            Everything you need to take control of your nutrition in one
            place.
          </p>
        </div>

        <FeatureItem
          label="Recipes"
          title="Recipe Videos & Books"
          emoji="&#127860;"
          items={[
            "400+ easy-to-follow recipes with full macro breakdowns",
            "HD step-by-step video tutorials for every recipe",
            "Categorised by meal type: breakfast, lunch, dinner, and snacks",
            "New recipes added regularly to keep things fresh",
            "Filter by calories, protein, prep time, and dietary preference",
          ]}
        />
        <FeatureItem
          label="Eating Out"
          title="Restaurant Survival Guides"
          emoji="&#127869;"
          reverse
          items={[
            "Macro-friendly menu picks from 50+ popular restaurants",
            "Know exactly what to order before you even arrive",
            "Stay on track without sacrificing your social life",
          ]}
        />
        <FeatureItem
          label="Calculator"
          title="Calorie & Macro Calculator"
          emoji="&#128202;"
          items={[
            "Personalised calorie and macro targets based on your goals",
            "Adjust for fat loss, maintenance, or muscle gain",
            "Recalculate any time your weight or activity changes",
          ]}
        />
        <FeatureItem
          label="Tracking"
          title="Snap My Macros"
          emoji="&#128247;"
          reverse
          items={[
            "Take a photo of your meal and instantly log your macros",
            "No more tedious manual entry or guessing portion sizes",
            "Quick, accurate, and built for real-world use",
          ]}
        />
        <FeatureItem
          label="Progress"
          title="Progress Tracker"
          emoji="&#128200;"
          items={[
            "Log your weight and see your trends over time",
            "Stay motivated with visual progress charts and milestones",
          ]}
        />
      </Section>

      {/* 4. How It Works */}
      <Section bg="cream">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            number="01"
            title="Sign Up"
            description="Choose your plan and create your account in under two minutes."
          />
          <StepCard
            number="02"
            title="Set Up Your Account"
            description="Enter your details and let the calculator set your personalised targets."
          />
          <StepCard
            number="03"
            title="Get Started"
            description="Browse recipes, track your meals, and start seeing results."
          />
        </div>
      </Section>

      {/* 5. Pricing Repeat */}
      <Section bg="beige">
        <PricingBox
          price={79}
          oldPrice={119}
          note="One-off payment for lifetime access"
          oldNote="annual renewal of &euro;49"
          ctaText="Start Now"
          ctaHref="/checkout"
          centered
        />
      </Section>

      {/* 6. Your Account */}
      <Section bg="light">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold">Your Account</h2>
          <p className="text-white/50 mt-3 max-w-[550px] mx-auto">
            A look at what you get inside The Hub once you sign up.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <PhoneMockup
            label="Recipe<br>Videos"
            gradient="from-primary to-[#ff7043]"
          />
          <PhoneMockup
            label="Featured<br>Recipes"
            gradient="from-[#ff7043] to-[#ffa726]"
          />
          <PhoneMockup
            label="Nutrition<br>Calculator"
            gradient="from-[#42a5f5] to-[#1565c0]"
          />
          <PhoneMockup
            label="Meal<br>Tracker"
            gradient="from-[#66bb6a] to-[#2e7d32]"
          />
        </div>
      </Section>

      {/* 7. Why It Works */}
      <Section bg="cream">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
          Why It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          <WhyCard
            title="Because You Get To Eat."
            text="No starvation diets. No cutting out the foods you love. The Hub is built around meals you actually want to eat, with the macros to match your goals."
          />
          <WhyCard
            title="Because You Don't Need To Guess."
            text="Every recipe comes with a full macro breakdown. Combined with the calorie calculator, you always know exactly what you're eating and why."
          />
          <WhyCard
            title="Because You'll Know Exactly Where You Are."
            text="With the built-in progress tracker and Snap My Macros, you can see your journey unfold in real time and stay motivated."
          />
          <WhyCard
            title="Because Real Life Doesn't Pause."
            text="Eating out with friends? Travelling? The restaurant survival guides make sure you stay on track no matter what life throws at you."
          />
          <WhyCard
            title="Because It's Worked For So Many Others."
            text="Over 10,000 members have already used The Hub to take control of their nutrition. The system is proven and the results are real."
          />
        </div>
      </Section>

      {/* 8. Transformations */}
      <Section bg="light">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
          It Worked For Them. It Will Work For You.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <TransformationCard name="Adam C." duration="10 months" />
          <TransformationCard
            name="Daniel T."
            duration="6 months"
            gradient="from-[#d7c8b8] to-beige"
          />
          <TransformationCard name="Dustin C." duration="5 months" />
          <TransformationCard
            name="Sarah M."
            duration="8 months"
            gradient="from-[#c8b8a8] to-beige"
          />
          <TransformationCard name="Kristian H." duration="12 months" />
          <TransformationCard
            name="Nathan S."
            duration="4 months"
            gradient="from-[#d7c8b8] to-beige"
          />
          <TransformationCard name="Ross C." duration="12 weeks" />
          <TransformationCard
            name="Sean O."
            duration="6 months"
            gradient="from-[#c8b8a8] to-beige"
          />
          <TransformationCard name="Stephen H." duration="9 months" />
          <TransformationCard
            name="Ryan S."
            duration="10 months"
            gradient="from-[#d7c8b8] to-beige"
          />
        </div>
      </Section>

      {/* 9. Countdown Timer */}
      <CountdownTimer />

      {/* 10. FAQ */}
      <Section bg="cream">
        <h2 className="text-3xl lg:text-4xl font-bold text-center">
          Frequently Asked Questions
        </h2>
        <FAQAccordion
          items={[
            {
              question: "I'm a picky eater. Will this work for me?",
              answer:
                "Absolutely. With over 400 recipes across every category, there's something for everyone. You can filter by ingredients, prep time, and dietary preference to find meals you'll actually enjoy.",
            },
            {
              question:
                "Is The Hub suitable for vegans or vegetarians?",
              answer:
                "Yes. The Hub includes a wide range of plant-based recipes with full macro breakdowns. Whether you're fully vegan, vegetarian, or just looking to eat more plants, you're covered.",
            },
            {
              question:
                "What if I only have limited ingredients at home?",
              answer:
                "Many of our recipes are designed with simplicity in mind, using common household ingredients. You can also filter recipes by what you have available.",
            },
            {
              question: "Is this just a recipe app?",
              answer:
                "Not at all. The Hub is a complete nutrition system. It includes a calorie and macro calculator, photo-based meal tracking with Snap My Macros, restaurant survival guides, a progress tracker, and over 400 recipes. It's everything you need in one place.",
            },
          ]}
        />
      </Section>

      {/* 11. CTA */}
      <CTASection
        title="Start Your Journey"
        text="No more second-guessing. No more starting over on Monday. Get lifetime access to The Hub and start building the habits that last."
        ctaText="Get Started"
        ctaHref="/checkout"
      />
    </>
  );
}
