export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "COACH") redirect("/login");
  const coachId = admin.userId;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      mealLogs: { orderBy: { loggedDate: "desc" }, take: 100 },
      weightLogs: { orderBy: { loggedDate: "desc" }, take: 90 },
      macroTarget: true,
      favourites: { include: { recipe: true } },
      stepLogs: { orderBy: { loggedDate: "desc" }, take: 90 },
      bodyMeasurements: { orderBy: { loggedDate: "desc" }, take: 30 },
    },
  });

  if (!user || user.coachId !== coachId) redirect("/admin/users");

  // Last activity metrics
  const lastMealLog = user.mealLogs[0];
  const hoursSinceLastLog = lastMealLog
    ? Math.floor((Date.now() - new Date(lastMealLog.loggedDate).getTime()) / (1000 * 60 * 60))
    : null;

  // Unread messages from this user
  const unreadMessages = await prisma.message.count({
    where: { senderId: id, isRead: false },
  });

  // Messages
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: id }, { receiverId: id }] },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      sender: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  // Calc averages
  const last7Meals = user.mealLogs.filter(m => new Date(m.loggedDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const avgDailyCals = last7Meals.length > 0 ? Math.round(last7Meals.reduce((s, m) => s + m.calories, 0) / 7) : 0;

  const last7Steps = user.stepLogs.filter(s => new Date(s.loggedDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const avgDailySteps = last7Steps.length > 0 ? Math.round(last7Steps.reduce((s, l) => s + l.steps, 0) / 7) : 0;

  const firstWeight = user.weightLogs[user.weightLogs.length - 1];
  const latestWeight = user.weightLogs[0];
  const weightChange = (firstWeight && latestWeight) ? Math.round((latestWeight.weightKg - firstWeight.weightKg) * 10) / 10 : null;

  // Fetch plan templates for assignment dropdown
  const planTemplates = await prisma.planTemplate.findMany({
    include: { _count: { select: { days: true } } },
    orderBy: { name: "asc" },
  });

  // Fetch user's active plan with days and progress
  const activePlan = user.activePlanId ? await prisma.clientPlan.findFirst({
    where: { userId: id, status: "active" },
    include: {
      days: {
        include: {
          workout: { select: { title: true, videoUrl: true } },
          meals: { include: { recipe: { select: { id: true, title: true } } }, orderBy: [{ mealType: "asc" }, { sortOrder: "asc" }] },
        },
        orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
      },
      progress: { orderBy: { date: "desc" } },
    },
  }) : null;

  // Fetch weekly targets for this user + enrich with current values
  const weeklyTargets = await prisma.weeklyTarget.findMany({
    where: { userId: id },
    orderBy: { weekStartDate: "desc" },
    take: 20,
  });

  // Fetch latest measurement data for target enrichment
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [latestMeasurement, latestWeightLog, stepLogs] = await Promise.all([
    prisma.bodyMeasurement.findFirst({
      where: { userId: id },
      orderBy: { loggedDate: "desc" },
    }),
    prisma.weightLog.findFirst({
      where: { userId: id },
      orderBy: { loggedDate: "desc" },
      select: { weightKg: true },
    }),
    prisma.stepLog.findMany({
      where: { userId: id, loggedDate: { gte: weekAgo } },
    }),
  ]);

  // Serialize all data
  const serialized = {
    // User profile
    id: user.id, firstName: user.firstName, lastName: user.lastName,
    email: user.email, country: user.country || "",
    role: user.role, plan: user.plan, planStatus: user.planStatus,
    isActive: user.isActive,
    age: user.age, gender: user.gender, heightCm: user.heightCm,
    currentWeightKg: user.currentWeightKg, bodyFatPercent: user.bodyFatPercent,
    fitnessGoal: user.fitnessGoal, activityLevel: user.activityLevel,
    dietaryPrefs: user.dietaryPrefs, targetWeightKg: user.targetWeightKg,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    paymentScreenshot: user.paymentScreenshot,
    paymentAccountName: user.paymentAccountName,
    activePlanId: user.activePlanId,

    // Quick stats
    avgDailyCals, avgDailySteps, weightChange,
    hoursSinceLastLog, unreadMessages,

    // Macro targets
    macroTarget: user.macroTarget ? {
      calories: user.macroTarget.calories, protein: user.macroTarget.protein,
      carbs: user.macroTarget.carbs, fat: user.macroTarget.fat, goal: user.macroTarget.goal,
    } : null,

    // Data arrays (serialized dates)
    mealLogs: user.mealLogs.map(m => ({
      id: m.id, description: m.description, mealType: m.mealType,
      calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
      imageData: m.imageData, ingredients: m.ingredients,
      loggedDate: m.loggedDate.toISOString(), loggedTime: m.loggedTime,
    })),
    weightLogs: user.weightLogs.map(w => ({
      id: w.id, weightKg: w.weightKg, loggedDate: w.loggedDate.toISOString(),
    })),
    stepLogs: user.stepLogs.map(s => ({
      id: s.id, steps: s.steps, goal: s.goal, loggedDate: s.loggedDate.toISOString(),
    })),
    bodyMeasurements: user.bodyMeasurements.map(b => ({
      id: b.id, loggedDate: b.loggedDate.toISOString(),
      weightKg: b.weightKg, bellyInches: b.bellyInches,
      waistInches: b.waistInches, chestInches: b.chestInches,
      hipsInches: b.hipsInches, armsInches: b.armsInches,
      imageData: b.imageData, notes: b.notes,
    })),
    favourites: user.favourites.filter(f => f.recipe).map(f => ({
      id: f.id, recipe: { id: f.recipe!.id, title: f.recipe!.title, slug: f.recipe!.slug, calories: f.recipe!.calories },
    })),
    messages: messages.map(m => ({
      id: m.id, content: m.content, imageData: m.imageData,
      isRead: m.isRead, createdAt: m.createdAt.toISOString(),
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      senderRole: m.sender.role, isSentByUser: m.senderId === id,
    })),
  };

  // Serialize plan templates
  const serializedTemplates = planTemplates.map(t => ({
    id: t.id, name: t.name, description: t.description,
    type: t.type, durationWeeks: t.durationWeeks,
    dayCount: t._count.days,
  }));

  // Serialize active plan
  const serializedActivePlan = activePlan ? {
    id: activePlan.id, name: activePlan.name, description: activePlan.description,
    type: activePlan.type, status: activePlan.status,
    startDate: activePlan.startDate.toISOString(),
    endDate: activePlan.endDate?.toISOString() || null,
    days: activePlan.days.map(d => ({
      id: d.id, dayOfWeek: d.dayOfWeek, weekNumber: d.weekNumber,
      workoutNotes: d.workoutNotes, mealPlan: d.mealPlan,
      calorieTarget: d.calorieTarget, proteinTarget: d.proteinTarget,
      carbsTarget: d.carbsTarget, fatTarget: d.fatTarget, notes: d.notes,
      workoutTitle: d.workout?.title || null,
      workoutVideoUrl: d.workout?.videoUrl || null,
      meals: (d.meals || []).map((m: { mealType: string; recipeId: number; servings: number; recipe: { title: string } }) => ({
        mealType: m.mealType, recipeTitle: m.recipe.title, servings: m.servings,
      })),
    })),
    progress: activePlan.progress.map(p => ({
      id: p.id, date: p.date.toISOString(),
      workoutCompleted: p.workoutCompleted,
      breakfastCompleted: p.breakfastCompleted, lunchCompleted: p.lunchCompleted,
      snackCompleted: p.snackCompleted, dinnerCompleted: p.dinnerCompleted,
      notes: p.notes,
    })),
  } : null;

  // Serialize weekly targets with enriched current values
  const serializedTargets = weeklyTargets.map(t => {
    let currentValue: number | null = t.currentValue;

    // Enrich with actual measurement data if DB currentValue is null
    if (currentValue === null) {
      switch (t.metric) {
        case "weight":
          if (latestWeightLog) currentValue = latestWeightLog.weightKg;
          else if (latestMeasurement?.weightKg != null) currentValue = latestMeasurement.weightKg;
          break;
        case "belly":
          if (latestMeasurement?.bellyInches != null) currentValue = latestMeasurement.bellyInches;
          break;
        case "waist":
          if (latestMeasurement?.waistInches != null) currentValue = latestMeasurement.waistInches;
          break;
        case "chest":
          if (latestMeasurement?.chestInches != null) currentValue = latestMeasurement.chestInches;
          break;
        case "hips":
          if (latestMeasurement?.hipsInches != null) currentValue = latestMeasurement.hipsInches;
          break;
        case "arms":
          if (latestMeasurement?.armsInches != null) currentValue = latestMeasurement.armsInches;
          break;
        case "steps":
          if (stepLogs.length > 0) {
            currentValue = Math.round(stepLogs.reduce((sum, s) => sum + s.steps, 0) / stepLogs.length);
          }
          break;
      }
    }

    return {
      id: t.id, weekStartDate: t.weekStartDate.toISOString(),
      metric: t.metric, targetValue: t.targetValue,
      currentValue, isVisible: t.isVisible,
    };
  });

  return (
    <UserDetailClient
      user={serialized}
      planTemplates={serializedTemplates}
      activePlan={serializedActivePlan}
      weeklyTargets={serializedTargets}
    />
  );
}
