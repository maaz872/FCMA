import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FCMA — Fitness Coach Management App",
  description:
    "Multi-tenant platform for fitness coaches. Manage clients, recipes, workouts, and plans in your own branded portal.",
  icons: { icon: "/images/logo.svg" },
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
        <meta name="apple-mobile-web-app-title" content="FCMA" />
        <link rel="apple-touch-icon" href="/api/apple-icon" />
      </head>
      <body className="min-h-screen flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
