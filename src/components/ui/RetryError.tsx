"use client";

import { useEffect, useState } from "react";

export default function RetryError({ message }: { message?: string }) {
  const [autoRetried, setAutoRetried] = useState(false);

  // Auto-reload once on mount (handles cold start — user sees brief loading then page loads)
  useEffect(() => {
    const hasRetried = sessionStorage.getItem("_retry_" + window.location.pathname);
    if (!hasRetried) {
      sessionStorage.setItem("_retry_" + window.location.pathname, "1");
      window.location.reload();
    } else {
      setAutoRetried(true);
      // Clear retry flag after 30s so next cold start can auto-retry again
      setTimeout(() => sessionStorage.removeItem("_retry_" + window.location.pathname), 30000);
    }
  }, []);

  // Show nothing while auto-retrying (user just sees the loading state)
  if (!autoRetried) return null;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#E51A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-white/50 text-sm mb-6">{message || "Please try again."}</p>
      <button
        onClick={() => {
          sessionStorage.removeItem("_retry_" + window.location.pathname);
          window.location.reload();
        }}
        className="px-6 py-3 bg-[#E51A1A] text-white font-semibold rounded-xl hover:bg-[#C41717] transition-colors cursor-pointer border-none"
      >
        Try Again
      </button>
    </div>
  );
}
