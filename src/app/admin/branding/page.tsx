"use client";

import { useState, useEffect } from "react";

export default function AdminBrandingPage() {
  const [siteName, setSiteName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [siteFavicon, setSiteFavicon] = useState<string | null>(null);
  const [pwaIcon192, setPwaIcon192] = useState<string | null>(null);
  const [pwaIcon512, setPwaIcon512] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        setSiteName(data.site_name || "Level Up");
        setCoachName(data.coach_name || "Coach Raheel");
        if (data.site_logo) setSiteLogo(data.site_logo);
        if (data.site_favicon) setSiteFavicon(data.site_favicon);
        if (data.pwa_icon_192) setPwaIcon192(data.pwa_icon_192);
        if (data.pwa_icon_512) setPwaIcon512(data.pwa_icon_512);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      // Save text fields first
      const textRes = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: {
            site_name: siteName.trim(),
            coach_name: coachName.trim(),
          },
        }),
      });
      if (!textRes.ok) { setError("Failed to save text settings"); return; }

      // Save images one at a time (base64 can be large)
      const imageEntries: [string, string][] = [
        ["site_logo", siteLogo || ""],
        ["site_favicon", siteFavicon || ""],
        ["pwa_icon_192", pwaIcon192 || ""],
        ["pwa_icon_512", pwaIcon512 || ""],
      ];

      for (const [key, value] of imageEntries) {
        if (value || value === "") {
          const imgRes = await fetch("/api/admin/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: { [key]: value } }),
          });
          if (!imgRes.ok) { setError(`Failed to save ${key}`); return; }
        }
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full py-3 px-4 border-2 border-[#2A2A2A] rounded-xl text-base bg-[#1E1E1E] text-white placeholder:text-white/30 focus:border-[#E51A1A] focus:outline-none transition-colors";

  function ImageUploadField({ label, hint, value, onChange, onRemove, accept }: {
    label: string; hint: string; value: string | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void; accept?: string;
  }) {
    return (
      <div>
        <label className="block text-xs text-white/50 mb-1.5">{label}</label>
        <div className="flex items-center gap-3">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="w-12 h-12 rounded-lg border border-[#2A2A2A] object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A] flex items-center justify-center text-white/20 text-xs">
              ?
            </div>
          )}
          <label className="text-xs text-[#E51A1A] hover:text-[#FF6B00] cursor-pointer transition-colors">
            {value ? "Replace" : "Upload"}
            <input type="file" accept={accept || "image/*"} className="hidden" onChange={onChange} />
          </label>
          {value && (
            <button type="button" onClick={onRemove}
              className="text-xs text-white/30 hover:text-white/50 bg-transparent border-none cursor-pointer">
              Remove
            </button>
          )}
        </div>
        <p className="text-white/20 text-[10px] mt-1">{hint}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black text-white mb-2">Branding</h1>
      <p className="text-white/50 mb-8">
        Customize your app name, logo, and icons across the entire platform.
      </p>

      {loading ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8 animate-pulse">
          <div className="h-4 bg-[#2A2A2A] rounded w-32 mb-6" />
          <div className="h-12 bg-[#2A2A2A] rounded mb-6" />
          <div className="h-4 bg-[#2A2A2A] rounded w-32 mb-6" />
          <div className="h-12 bg-[#2A2A2A] rounded" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="max-w-[600px]">
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8 space-y-6">
            {/* App Name */}
            <div>
              <label className="block font-semibold text-sm text-white mb-1.5">App Name</label>
              <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Level Up" required className={inputClass} />
              <p className="text-white/30 text-xs mt-1.5">
                Appears in the header, footer, sidebar, and throughout the site.
              </p>
            </div>

            {/* Coach Name */}
            <div>
              <label className="block font-semibold text-sm text-white mb-1.5">Coach Name</label>
              <input type="text" value={coachName} onChange={(e) => setCoachName(e.target.value)}
                placeholder="e.g. Coach Raheel" required className={inputClass} />
              <p className="text-white/30 text-xs mt-1.5">
                Appears in the admin sidebar, approval messages, and about page.
              </p>
            </div>

            {/* Site Logo & Favicon */}
            <div className="pt-4 border-t border-[#2A2A2A]">
              <h3 className="font-semibold text-sm text-white mb-1">Logo & Favicon</h3>
              <p className="text-white/30 text-xs mb-4">
                Upload your site logo and browser tab favicon.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadField
                  label="Site Logo"
                  hint="Shown in header & footer. Square, any format."
                  value={siteLogo}
                  onChange={(e) => handleFileUpload(e, setSiteLogo)}
                  onRemove={() => setSiteLogo(null)}
                />
                <ImageUploadField
                  label="Favicon"
                  hint="Browser tab icon. Square, ideally 32x32 or SVG."
                  value={siteFavicon}
                  onChange={(e) => handleFileUpload(e, setSiteFavicon)}
                  onRemove={() => setSiteFavicon(null)}
                  accept="image/png,image/svg+xml,image/x-icon"
                />
              </div>
            </div>

            {/* PWA Icons */}
            <div className="pt-4 border-t border-[#2A2A2A]">
              <h3 className="font-semibold text-sm text-white mb-1">App Icon (PWA)</h3>
              <p className="text-white/30 text-xs mb-4">
                Icon shown on home screen when users install the app. Upload square PNG images.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadField
                  label="192 x 192 px"
                  hint="Required for Android install prompt."
                  value={pwaIcon192}
                  onChange={(e) => handleFileUpload(e, setPwaIcon192)}
                  onRemove={() => setPwaIcon192(null)}
                  accept="image/png"
                />
                <ImageUploadField
                  label="512 x 512 px"
                  hint="Used for splash screens."
                  value={pwaIcon512}
                  onChange={(e) => handleFileUpload(e, setPwaIcon512)}
                  onRemove={() => setPwaIcon512(null)}
                  accept="image/png"
                />
              </div>
            </div>

            {error && (
              <div className="bg-[#E51A1A]/10 border border-[#E51A1A]/20 text-[#E51A1A] px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm">
                Branding updated! Changes will appear across the entire site.
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`bg-[#E51A1A] hover:bg-[#C41010] text-white font-bold px-8 py-3 rounded-xl text-sm uppercase tracking-wider transition-colors cursor-pointer ${
                saving ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
