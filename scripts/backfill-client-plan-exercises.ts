/**
 * Backfill missing PlanExercise rows on `ClientPlanDay`s that were
 * assigned before /api/admin/plans/assign learned about exercises.
 *
 * For every ClientPlan that has a `templateId` and whose days are
 * missing exercises but the source template's days have them, this
 * copies the template's PlanExercise rows over to the client side,
 * preserving the (weekNumber, dayOfWeek) mapping.
 *
 * Idempotent: skips ClientPlanDays that already have any PlanExercise
 * rows.
 *
 * Run:
 *   npx tsx scripts/backfill-client-plan-exercises.ts
 *   npx tsx scripts/backfill-client-plan-exercises.ts <clientPlanId>   # one plan only
 */

import "dotenv/config";
import { prisma, getDb } from "../src/lib/db";

async function backfillClientPlan(clientPlanId: number) {
  const plan = await prisma.clientPlan.findUnique({
    where: { id: clientPlanId },
    include: {
      days: {
        include: {
          exercises: { select: { id: true } },
        },
      },
    },
  });
  if (!plan) {
    console.log(`  ClientPlan #${clientPlanId} not found`);
    return 0;
  }
  if (!plan.templateId) {
    console.log(`  ClientPlan #${clientPlanId} ("${plan.name}") has no templateId — skipping`);
    return 0;
  }

  const template = await prisma.planTemplate.findUnique({
    where: { id: plan.templateId },
    include: {
      days: {
        include: { exercises: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!template) {
    console.log(`  ClientPlan #${clientPlanId} references missing template ${plan.templateId}`);
    return 0;
  }

  // Index template days by (week, day) for lookup.
  const tplByKey = new Map<string, (typeof template.days)[number]>();
  for (const td of template.days) {
    tplByKey.set(`${td.weekNumber}-${td.dayOfWeek}`, td);
  }

  let inserted = 0;
  for (const cd of plan.days) {
    if (cd.exercises.length > 0) continue;
    const td = tplByKey.get(`${cd.weekNumber}-${cd.dayOfWeek}`);
    if (!td || td.exercises.length === 0) continue;

    await prisma.planExercise.createMany({
      data: td.exercises.map((ex) => ({
        clientDayId: cd.id,
        workoutId: ex.workoutId,
        orderIndex: ex.orderIndex,
        sets: ex.sets,
        repsLow: ex.repsLow,
        repsHigh: ex.repsHigh,
        durationSeconds: ex.durationSeconds,
        restSeconds: ex.restSeconds,
        weightKg: ex.weightKg,
        notes: ex.notes,
      })),
    });
    inserted += td.exercises.length;
  }
  console.log(
    `  ClientPlan #${clientPlanId} ("${plan.name}"): inserted ${inserted} PlanExercise rows across ${plan.days.length} days`
  );
  return inserted;
}

async function main() {
  const arg = process.argv[2];

  if (arg) {
    const id = parseInt(arg, 10);
    if (!Number.isFinite(id)) {
      console.error(`Invalid clientPlanId: ${arg}`);
      process.exit(1);
    }
    console.log(`Backfilling single ClientPlan #${id}\n`);
    await backfillClientPlan(id);
    return;
  }

  // Bulk: every ClientPlan with a templateId.
  const plans = await prisma.clientPlan.findMany({
    where: { templateId: { not: null } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  console.log(`Found ${plans.length} ClientPlan(s) with a templateId\n`);
  let total = 0;
  for (const p of plans) {
    total += await backfillClientPlan(p.id);
  }
  console.log(`\nTotal PlanExercise rows inserted: ${total}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await (getDb() as unknown as { $disconnect(): Promise<void> }).$disconnect();
    } catch {
      // ignore
    }
    process.exit(0);
  });
