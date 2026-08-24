"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserCog, Activity, Users, Calendar, Package, BarChart3 } from "lucide-react";

// Cierra la sesión sola después de 5 minutos sin tocar la pantalla —
// pensado para un dispositivo compartido del consultorio.
const TIEMPO_INACTIVIDAD_MS = 5 * 60 * 1000;

const TABS = [
  { href: "/dashboard", label: "Panel", icon: Activity },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/citas", label: "Agenda", icon: Calendar },
  { href: "/dashboard/inventario", label: "Inventario", icon: Package },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/perfil")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setFoto(data?.foto ?? null))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;

    async function cerrarPorInactividad() {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      router.push("/login");
      router.refresh();
    }

    function reiniciarTemporizador() {
      clearTimeout(temporizador);
      temporizador = setTimeout(cerrarPorInactividad, TIEMPO_INACTIVIDAD_MS);
    }

    const eventos = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    eventos.forEach((ev) => window.addEventListener(ev, reiniciarTemporizador));
    reiniciarTemporizador();

    return () => {
      clearTimeout(temporizador);
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciarTemporizador));
    };
  }, [router]);

  function esActivo(href: string) {
    return href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
  }

  return (
    <div className="min-h-dvh bg-[#F5F1EA] md:flex">
      {/* Barra lateral — solo escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[#EFE9DC] bg-white/60 px-4 py-6 md:flex">
        <div className="px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="h-auto w-44" />
        </div>

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

        <Link
          href="/dashboard/perfil"
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
            esActivo("/dashboard/perfil") ? "bg-[#2b2118] text-white" : "text-[#8a8272] hover:bg-[#EFE9DC]/70"
          }`}
        >
          {foto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={foto} alt="" className="h-4 w-4 rounded-full object-cover" />
          ) : (
            <UserCog size={16} />
          )}
          Perfil
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Encabezado + tabs — solo celular */}
        <div className="mx-auto max-w-md md:hidden">
          <div className="flex items-center justify-between px-5 pb-4 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vina-sonrisas.png" alt="Viña Sonrisas" className="h-auto w-48" />
            <Link
              href="/dashboard/perfil"
              aria-label="Perfil"
              title="Perfil"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#EFE9DC] bg-white"
            >
              {foto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={foto} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserCog size={17} className="text-[#2b2118]" />
              )}
            </Link>
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

        <div className="mx-auto max-w-md pb-10 md:max-w-5xl md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
