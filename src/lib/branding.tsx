"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface BrandingContextType {
  siteName: string;
  coachName: string;
  logoUrl: string;
  faviconUrl: string;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  siteName: "Fitness Coach",
  coachName: "Your Coach",
  logoUrl: "/images/logo.svg",
  faviconUrl: "/images/logo.svg",
  loading: true,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [siteName, setSiteName] = useState("Fitness Coach");
  const [coachName, setCoachName] = useState("Your Coach");
  const [logoUrl, setLogoUrl] = useState("/images/logo.svg");
  const [faviconUrl, setFaviconUrl] = useState("/images/logo.svg");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.site_name) setSiteName(data.site_name);
        if (data.coach_name) setCoachName(data.coach_name);
        if (data.site_logo) setLogoUrl(data.site_logo);
        if (data.site_favicon) setFaviconUrl(data.site_favicon);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Dynamically update favicon — use API route instead of base64 for efficiency
  useEffect(() => {
    if (loading) return;
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    // Always point to /api/favicon which serves the DB image or falls back to static
    const href = faviconUrl !== "/images/logo.svg" ? "/api/favicon" : "/images/logo.svg";
    if (link) {
      link.href = href;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = href;
      document.head.appendChild(newLink);
    }
  }, [faviconUrl, loading]);

  return (
    <BrandingContext.Provider value={{ siteName, coachName, logoUrl, faviconUrl, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
