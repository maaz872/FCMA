import type { Metadata } from "next";
import "./globals.css";
import { BrandingProvider } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Online Personal Training & Fitness Coaching",
  description:
    "Transform your body with personalized nutrition tools, meal tracking, and expert fitness coaching.",
  icons: { icon: "/api/favicon" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/api/manifest" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Fitness Coach" />
        <link rel="apple-touch-icon" href="/api/apple-icon" />
      </head>
      <body className="min-h-screen flex flex-col">
        <BrandingProvider>{children}</BrandingProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
