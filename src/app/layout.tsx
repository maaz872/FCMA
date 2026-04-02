import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Level Up | Online Personal Training",
  description:
    "Transform your body with Level Up. Nutrition tools, meal tracking, and fitness guidance by Coach Raheel.",
  icons: { icon: "/images/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
