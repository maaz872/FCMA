import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateBase64Upload } from "@/lib/upload-validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, paymentScreenshot, paymentAccountName, paymentTransactionRef } = body;

    if (!email || !paymentScreenshot || !paymentAccountName) {
      return NextResponse.json(
        { error: "Email, payment screenshot, and account name are required" },
        { status: 400 }
      );
    }

    const validation = validateBase64Upload(paymentScreenshot);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update payment fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        paymentScreenshot,
        paymentAccountName,
        paymentTransactionRef: paymentTransactionRef || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment proof submitted successfully",
    });
  } catch (error) {
    console.error("Payment proof error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
