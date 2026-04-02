export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import TestimonialsAdmin from "./TestimonialsAdmin";

export default async function AdminTestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const serialized = testimonials.map((t) => ({
    id: t.id,
    clientName: t.clientName,
    duration: t.duration,
    quote: t.quote,
    isFeatured: t.isFeatured,
    isPublished: t.isPublished,
    displayOrder: t.displayOrder,
  }));

  return <TestimonialsAdmin testimonials={serialized} />;
}
