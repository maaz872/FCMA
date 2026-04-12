export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminPlansClient from "./AdminPlansClient";

export default async function AdminPlansPage() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "COACH") redirect("/login");
  const coachId = admin.userId;

  const templates = await prisma.planTemplate.findMany({
    where: { coachId },
    include: { _count: { select: { days: true } } },
    orderBy: { createdAt: "desc" },
  });

  const serialized = templates.map(
    (t: {
      id: number;
      name: string;
      description: string | null;
      type: string;
      durationWeeks: number;
      createdAt: Date;
      _count: { days: number };
    }) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      durationWeeks: t.durationWeeks,
      dayCount: t._count.days,
      createdAt: t.createdAt.toISOString(),
    })
  );

  return <AdminPlansClient templates={serialized} />;
}
