export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      mealLogs: { orderBy: { loggedDate: "desc" }, take: 20 },
      weightLogs: { orderBy: { loggedDate: "desc" }, take: 30 },
      progressPhotos: { orderBy: { photoDate: "desc" }, take: 10 },
      macroTarget: true,
      favourites: { include: { recipe: true } },
    },
  });

  if (!user) redirect("/admin/users");

  // Fetch last 5 messages involving this user
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: id }, { receiverId: id }],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      sender: { select: { firstName: true, lastName: true } },
      receiver: { select: { firstName: true, lastName: true } },
    },
  });

  // Serialize dates for client component
  const serialized = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    country: user.country || "",
    role: user.role,
    plan: user.plan,
    planStatus: user.planStatus,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    paymentScreenshot: user.paymentScreenshot || null,
    paymentAccountName: user.paymentAccountName || null,
    paymentTransactionRef: user.paymentTransactionRef || null,
    macroTarget: user.macroTarget
      ? {
          calories: user.macroTarget.calories,
          protein: user.macroTarget.protein,
          carbs: user.macroTarget.carbs,
          fat: user.macroTarget.fat,
          goal: user.macroTarget.goal,
        }
      : null,
    mealLogs: user.mealLogs.map((m) => ({
      id: m.id,
      description: m.description,
      mealType: m.mealType,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      loggedDate: m.loggedDate.toISOString(),
      loggedTime: m.loggedTime,
    })),
    weightLogs: user.weightLogs.map((w) => ({
      id: w.id,
      weightKg: w.weightKg,
      loggedDate: w.loggedDate.toISOString(),
    })),
    progressPhotos: user.progressPhotos.map((p) => ({
      id: p.id,
      imageData: p.imageData,
      photoDate: p.photoDate.toISOString(),
      notes: p.notes || "",
    })),
    favourites: user.favourites.map((f) => ({
      id: f.id,
      recipe: {
        id: f.recipe.id,
        title: f.recipe.title,
        slug: f.recipe.slug,
        calories: f.recipe.calories,
        protein: f.recipe.protein,
      },
    })),
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      receiverName: `${m.receiver.firstName} ${m.receiver.lastName}`,
      isSentByUser: m.senderId === id,
    })),
  };

  return <UserDetailClient user={serialized} />;
}
