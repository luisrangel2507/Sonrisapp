"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Activity, Users, CreditCard, Calendar } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Panel", icon: Activity },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/citas", label: "Citas", icon: Calendar },
  { href: "/dashboard/lealtad", label: "Lealtad", icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      <div className="mx-auto max-w-md pb-10">
        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          <h1 className="text-[26px] leading-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            <span className="font-bold text-[#2b2118]">Sonris</span>
            <span className="font-bold italic text-[#C96F3B]">App</span>
          </h1>
          <button
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EFE9DC] bg-white"
          >
            <LogOut size={17} className="text-[#2b2118]" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 pb-4">
          {TABS.map((t) => {
            const activo = t.href === "/dashboard" ? pathname === t.href : pathname?.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium ${
                  activo
                    ? "border-[#2b2118] bg-[#2b2118] text-white"
                    : "border-[#EFE9DC] bg-white text-[#8a8272]"
                }`}
              >
                <t.icon size={13} /> {t.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
