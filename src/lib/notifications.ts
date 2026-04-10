import { prisma } from "@/lib/db";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = "system",
  actionUrl?: string
) {
  return prisma.notification.create({
    data: { userId, title, message, type, actionUrl },
  });
}

// Find admin user ID (for sending admin notifications)
export async function getAdminUserId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "COACH" },
    select: { id: true },
  });
  return admin?.id || null;
}

export async function notifyAdmin(
  title: string,
  message: string,
  type: string = "admin_alert",
  actionUrl?: string
) {
  const adminId = await getAdminUserId();
  if (!adminId) return;
  return createNotification(adminId, title, message, type, actionUrl);
}
