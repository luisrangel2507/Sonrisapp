"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Activity, Users, CreditCard, Calendar, UserCog } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Panel", icon: Activity },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/citas", label: "Citas", icon: Calendar },
  { href: "/dashboard/lealtad", label: "Lealtad", icon: CreditCard },
  { href: "/dashboard/perfil", label: "Perfil", icon: UserCog },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function esActivo(href: string) {
    return href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
  }

  return (
    <div className="min-h-dvh bg-[#F5F1EA] md:flex">
      {/* Barra lateral — solo escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[#EFE9DC] bg-white/60 px-4 py-6 md:flex">
        <h1 className="px-2 text-[24px] leading-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          <span className="font-bold text-[#2b2118]">Sonris</span>
          <span className="font-bold italic text-[#C96F3B]">App</span>
        </h1>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                esActivo(t.href) ? "bg-[#2b2118] text-white" : "text-[#8a8272] hover:bg-[#EFE9DC]/70"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={cerrarSesion}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#8a8272] hover:bg-[#EFE9DC]/70"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Encabezado + tabs — solo celular */}
        <div className="mx-auto max-w-md md:hidden">
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
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium ${
                  esActivo(t.href)
                    ? "border-[#2b2118] bg-[#2b2118] text-white"
                    : "border-[#EFE9DC] bg-white text-[#8a8272]"
                }`}
              >
                <t.icon size={13} /> {t.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-md pb-10 md:max-w-4xl md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
