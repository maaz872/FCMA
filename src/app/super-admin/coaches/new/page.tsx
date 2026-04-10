"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCoachPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    basePriceMonthly: "15000",
    extraClientPrice: "3500",
    includedClients: "5",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ email: string; inviteCode: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basePriceMonthly: parseInt(form.basePriceMonthly),
          extraClientPrice: parseInt(form.extraClientPrice),
          includedClients: parseInt(form.includedClients),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create coach");
        return;
      }

      setSuccess({ email: data.coach.email, inviteCode: data.coach.inviteCode });
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:border-blue-500 focus:outline-none transition-colors";

  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Coach Created!</h1>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
          <p className="text-emerald-400 font-semibold">Account created successfully</p>
          <div className="space-y-2 text-sm">
            <p className="text-white/70">
              Email: <span className="text-white font-mono">{success.email}</span>
            </p>
            <p className="text-white/70">
              Invite Code: <span className="text-blue-400 font-mono">{success.inviteCode}</span>
            </p>
          </div>
          <p className="text-white/40 text-xs">
            The coach can now log in at /login with their credentials. Their invite code can be
            used for client registration.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/super-admin/coaches")}
            className="px-5 py-2.5 bg-[#2A2A2A] text-white rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors cursor-pointer border-none"
          >
            Back to Coaches
          </button>
          <button
            onClick={() => { setSuccess(null); setForm({ firstName: "", lastName: "", email: "", password: "", basePriceMonthly: "15000", extraClientPrice: "3500", includedClients: "5" }); }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer border-none"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Add New Coach</h1>
        <p className="text-white/50 text-sm mt-1">Create a new coaching account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6 space-y-4">
          <p className="text-xs font-bold text-white/30 uppercase tracking-wider">Account Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">First Name</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="John"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Last Name</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Smith"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="coach@example.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters"
              className={inputCls}
            />
          </div>
        </div>

        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6 space-y-4">
          <p className="text-xs font-bold text-white/30 uppercase tracking-wider">Billing</p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Base Price/mo (PKR)</label>
              <input
                type="number"
                required
                value={form.basePriceMonthly}
                onChange={(e) => setForm({ ...form, basePriceMonthly: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Included Clients</label>
              <input
                type="number"
                required
                value={form.includedClients}
                onChange={(e) => setForm({ ...form, includedClients: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Extra Client (PKR)</label>
              <input
                type="number"
                required
                value={form.extraClientPrice}
                onChange={(e) => setForm({ ...form, extraClientPrice: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <p className="text-white/30 text-xs">
            Default: 15,000 PKR/month for 5 clients + 3,500 PKR per additional client
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer border-none"
        >
          {loading ? "Creating..." : "Create Coach Account"}
        </button>
      </form>
    </div>
  );
}
