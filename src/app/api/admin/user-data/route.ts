import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, type, data } = body;

    if (!userId || !type || !data) {
      return NextResponse.json({ error: "Missing userId, type, or data" }, { status: 400 });
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let result;

    switch (type) {
      case "meal": {
        const { description, mealType, calories, protein, carbs, fat, loggedDate, loggedTime } = data;
        if (!description || calories === undefined) {
          return NextResponse.json({ error: "Description and calories required" }, { status: 400 });
        }
        result = await prisma.mealLog.create({
          data: {
            userId,
            description,
            mealType: mealType || "Snack",
            calories: parseInt(calories),
            protein: parseFloat(protein) || 0,
            carbs: parseFloat(carbs) || 0,
            fat: parseFloat(fat) || 0,
            loggedDate: new Date(loggedDate),
            loggedTime: loggedTime || "12:00",
          },
        });
        break;
      }

      case "weight": {
        const { weightKg, loggedDate } = data;
        if (!weightKg || !loggedDate) {
          return NextResponse.json({ error: "weightKg and loggedDate required" }, { status: 400 });
        }
        result = await prisma.weightLog.create({
          data: {
            userId,
            weightKg: parseFloat(weightKg),
            loggedDate: new Date(loggedDate),
          },
        });
        break;
      }

      case "step": {
        const { steps, goal, loggedDate } = data;
        if (!steps || !loggedDate) {
          return NextResponse.json({ error: "steps and loggedDate required" }, { status: 400 });
        }
        result = await prisma.stepLog.create({
          data: {
            userId,
            steps: parseInt(steps),
            goal: parseInt(goal) || 10000,
            loggedDate: new Date(loggedDate),
          },
        });
        break;
      }

      case "measurement": {
        const { loggedDate, weightKg, bellyInches, waistInches, chestInches, hipsInches, armsInches, notes } = data;
        if (!loggedDate) {
          return NextResponse.json({ error: "loggedDate required" }, { status: 400 });
        }
        result = await prisma.bodyMeasurement.create({
          data: {
            userId,
            loggedDate: new Date(loggedDate),
            weightKg: weightKg ? parseFloat(weightKg) : null,
            bellyInches: bellyInches ? parseFloat(bellyInches) : null,
            waistInches: waistInches ? parseFloat(waistInches) : null,
            chestInches: chestInches ? parseFloat(chestInches) : null,
            hipsInches: hipsInches ? parseFloat(hipsInches) : null,
            armsInches: armsInches ? parseFloat(armsInches) : null,
            notes: notes || null,
          },
        });
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Admin user-data POST error:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
    }

    const numId = parseInt(id);

    switch (type) {
      case "weight":
        await prisma.weightLog.delete({ where: { id: numId } });
        break;
      case "step":
        await prisma.stepLog.delete({ where: { id: numId } });
        break;
      case "measurement":
        await prisma.bodyMeasurement.delete({ where: { id: numId } });
        break;
      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user-data DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
