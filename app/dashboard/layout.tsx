"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Activity, LayoutGrid, CreditCard, Users } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Panel", icon: Activity },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/odontograma", label: "Odontograma", icon: LayoutGrid },
  { href: "/dashboard/lealtad", label: "Lealtad", icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const esClinico = pathname?.startsWith("/dashboard/odontograma");

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: esClinico ? "#0a0714" : "#F5F1EA" }}
    >
      <div className="mx-auto max-w-md pb-10">
        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          <h1 className="text-[26px] leading-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            <span className={`font-bold ${esClinico ? "text-white" : "text-[#2b2118]"}`}>Sonris</span>
            <span className="font-bold italic text-[#C96F3B]">App</span>
          </h1>
          <button
            className={`flex h-10 w-10 items-center justify-center rounded-full border ${
              esClinico ? "border-white/15 bg-white/5" : "border-[#EFE9DC] bg-white"
            }`}
          >
            <Menu size={17} className={esClinico ? "text-white" : "text-[#2b2118]"} />
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
                    ? esClinico
                      ? "border-[#7C5CE0] bg-[#7C5CE0] text-white"
                      : "border-[#2b2118] bg-[#2b2118] text-white"
                    : esClinico
                    ? "border-white/15 bg-white/5 text-white/50"
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
