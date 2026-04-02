import { Metadata } from "next";
import { prisma } from "@/lib/db";
import Section from "@/components/ui/Section";
import TestimonialCard from "@/components/ui/TestimonialCard";
import CTASection from "@/components/ui/CTASection";

export const metadata: Metadata = {
  title: "Testimonials | Level Up",
};

export default async function TestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({
    where: { isPublished: true },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <>
      <Section bg="cream">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Testimonials</h1>
          <p className="text-lg text-gray-600">
            Real transformations from real people.
          </p>
        </div>

        <div
          className="grid gap-8"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          }}
        >
          {testimonials.map((t) => (
            <TestimonialCard
              key={t.id}
              name={t.clientName}
              duration={t.duration}
              text={t.quote}
            />
          ))}
        </div>
      </Section>

      <CTASection
        title="Ready to Write Your Own Success Story?"
        text="Join hundreds of people who have already transformed their lives with Level Up."
        ctaText="Get Started"
        ctaHref="/checkout"
      />
    </>
  );
}
