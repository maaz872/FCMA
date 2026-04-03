import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      country,
      plan,
      planStatus,
      age,
      gender,
      heightCm,
      currentWeightKg,
      fitnessGoal,
      activityLevel,
      targetWeightKg,
      dietaryPrefs,
    } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least 1 letter and 1 number" },
        { status: 400 }
      );
    }

    // Check existing user
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create user in DB with unified plan model + health profile
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        firstName,
        lastName,
        country: country || "OTHER",
        role: "USER",
        unitPreference: "METRIC",
        isActive: true,
        plan: plan || "HUB",
        planStatus: planStatus || "PENDING",
        // Health profile fields
        ...(age && { age: parseInt(String(age)) }),
        ...(gender && { gender }),
        ...(heightCm && { heightCm: parseFloat(String(heightCm)) }),
        ...(currentWeightKg && {
          currentWeightKg: parseFloat(String(currentWeightKg)),
        }),
        ...(fitnessGoal && { fitnessGoal }),
        ...(activityLevel && { activityLevel }),
        ...(targetWeightKg && {
          targetWeightKg: parseFloat(String(targetWeightKg)),
        }),
        ...(dietaryPrefs && { dietaryPrefs }),
      },
    });

    // Do NOT create session / set cookie — account needs admin approval first
    return NextResponse.json({
      success: true,
      message:
        "Your account has been created! Coach Raheel will review and activate your account within 24 hours of payment confirmation.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
