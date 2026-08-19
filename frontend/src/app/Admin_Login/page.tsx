import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";
import "../admin/admin.css";

export const metadata: Metadata = {
  title: "Admin Login — Mocha Wear",
};

export default function AdminLoginPage() {
  return (
    <main className="admin-root grid min-h-svh bg-[#f3f4f6] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-slate-950 p-10 text-slate-300 lg:flex">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-800 text-sm font-semibold text-white">
            M
          </span>
          <p className="text-sm font-semibold text-white">Mocha Wear</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400">Admin dashboard</p>
          <h1 className="mt-3 max-w-sm text-3xl font-semibold leading-snug tracking-tight text-white">
            Manage products, orders, and the storefront.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            Sign in to update catalog, sales, help, and order status.
          </p>
        </div>
        <p className="text-xs text-slate-500">© 2026 Mocha Wear</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Admin</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use your admin username and password.</p>
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
