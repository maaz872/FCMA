import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-lg">
            SA
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Super Admin Panel</h1>
            <p className="text-white/50 text-sm">FCMA Platform Management</p>
          </div>
        </div>

        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-8">
          <h2 className="text-xl font-semibold text-white mb-4">Coming Soon</h2>
          <p className="text-white/60 leading-relaxed">
            The full Super Admin dashboard is being built in Phase 2. This will include:
          </p>
          <ul className="mt-4 space-y-2 text-white/50">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Coach management (create, edit, activate/deactivate)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Billing overview (per-coach revenue tracking)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Platform analytics (total coaches, clients, growth)
            </li>
          </ul>

          <div className="mt-8 p-4 bg-[#0A0A0A] rounded-xl">
            <p className="text-white/40 text-sm">
              Logged in as: <span className="text-blue-400">Super Admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
