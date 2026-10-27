"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserCog, Activity, Users, Calendar, Package, BarChart3, Tv, Wallet, Smile, Search, Bell, Home, Plus, MoreHorizontal, UserPlus, X, Settings, ChevronDown } from "lucide-react";
import { DOCTORA } from "@/lib/panel-data";

const NOMBRE_CORTO_DOCTORA = DOCTORA.nombre.split(" ").slice(0, 2).join(" ");

// Cierra la sesión sola después de 5 minutos sin tocar la pantalla —
// pensado para un dispositivo compartido del consultorio.
const TIEMPO_INACTIVIDAD_MS = 5 * 60 * 1000;

const TABS = [
  { href: "/dashboard", label: "Panel", icon: Activity },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/citas", label: "Agenda", icon: Calendar },
  { href: "/dashboard/inventario", label: "Inventario", icon: Package },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/dashboard/caja", label: "Caja", icon: Wallet },
  { href: "/dashboard/ortodoncia", label: "Ortodoncia", icon: Smile },
  { href: "/dashboard/tv", label: "Pantalla TV", icon: Tv },
];

// Barra inferior — solo celular. "Inicio"/"Agenda" van directo; el resto
// de las secciones (Inventario, Reportes, Perfil) vive detrás de "Más"
// para no saturar la barra.
const NAV_INFERIOR_IZQ = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
];
const NAV_INFERIOR_DER = [{ href: "/dashboard/citas", label: "Agenda", icon: Calendar }];
const SOLO_ADMIN_NAV = ["/dashboard/reportes", "/dashboard/caja"];

const NAV_MAS = [
  { href: "/dashboard/inventario", label: "Inventario", icon: Package },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/dashboard/caja", label: "Caja", icon: Wallet },
  { href: "/dashboard/ortodoncia", label: "Ortodoncia", icon: Smile },
  { href: "/dashboard/tv", label: "Pantalla TV", icon: Tv },
  { href: "/dashboard/perfil", label: "Perfil", icon: UserCog },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [foto, setFoto] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string>(NOMBRE_CORTO_DOCTORA);
  const [busqueda, setBusqueda] = useState("");
  const [masAbierto, setMasAbierto] = useState(false);
  const [accionesAbierto, setAccionesAbierto] = useState(false);

  // El rol Asistente no ve Reportes ni Caja (el servidor también lo bloquea).
  const [esAsistente, setEsAsistente] = useState(false);
  useEffect(() => {
    fetch("/api/auth/sesion")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEsAsistente(d?.rol === "asistente"))
      .catch(() => {});
  }, []);
  const visible = (t: { href: string }) => !esAsistente || !SOLO_ADMIN_NAV.includes(t.href);

  useEffect(() => {
    fetch("/api/perfil")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setFoto(data?.foto ?? null);
        setNombre(data?.nombre_bienvenida || NOMBRE_CORTO_DOCTORA);
      })
      .catch(() => {});
  }, [pathname]);

  // Cierra los popovers de la barra inferior (celular) al navegar —
  // el layout no se desmonta entre páginas, así que si no, se quedarían
  // abiertos al cambiar de pestaña.
  useEffect(() => {
    setMasAbierto(false);
    setAccionesAbierto(false);
  }, [pathname]);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busqueda.trim()) return;
    router.push(`/dashboard/pacientes?q=${encodeURIComponent(busqueda.trim())}`);
  }

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
      <aside
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col px-4 py-6 md:flex"
        style={{ background: "linear-gradient(180deg, #4A1420 0%, #5C2235 55%, #3D121C 100%)" }}
      >
        <div className="px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-vina-sonrisas.webp"
            alt="Viña Sonrisas"
            className="h-auto w-44 brightness-0 invert"
          />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {TABS.filter(visible).map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                esActivo(t.href) ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/dashboard/perfil"
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
            esActivo("/dashboard/perfil") ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90"
          }`}
        >
          <Settings size={16} /> Configuración
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Barra superior — solo escritorio */}
        <div className="sticky top-0 z-10 hidden items-center justify-between border-b border-[#EFE9DC] bg-[#F5F1EA]/90 px-8 py-4 backdrop-blur md:flex">
          <form onSubmit={buscar} className="w-full max-w-md">
            <div className="flex items-center gap-2 rounded-full border border-[#EFE9DC] bg-white px-4 py-2.5">
              <Search size={15} className="shrink-0 text-[#a49c8a]" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar pacientes, citas, tratamientos…"
                className="w-full bg-transparent text-sm text-[#2b2118] outline-none placeholder:text-[#a49c8a]"
              />
              <kbd className="hidden shrink-0 rounded-lg bg-[#F5F1EA] px-2 py-0.5 text-[11px] font-semibold text-[#8a8272] lg:block">⌘ K</kbd>
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/dashboard/citas"
              aria-label="Agenda"
              title="Agenda"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#EFE9DC] bg-white text-[#8a8272] hover:text-[#2b2118]"
            >
              <Bell size={16} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#E5484D]" />
            </Link>
            <Link href="/dashboard/perfil" className="flex items-center gap-2.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                {foto ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserCog size={20} className="text-[#2b2118]" />
                )}
              </div>
              <span className="text-[15px] font-semibold text-[#2b2118]">{nombre}</span>
              <ChevronDown size={14} className="text-[#8a8272]" />
            </Link>
          </div>
        </div>

        {/* Encabezado — solo celular */}
        <div className="mx-auto max-w-md md:hidden">
          <div className="flex items-center justify-between px-5 pb-4 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vina-sonrisas.webp" alt="Viña Sonrisas" className="h-auto w-48" />
            <Link
              href="/dashboard/perfil"
              aria-label="Perfil"
              title="Perfil"
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto || "/icon.png"} alt="" className="h-full w-full object-cover" />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-md pb-28 md:mx-0 md:max-w-none md:px-8 md:py-8 md:pb-8">{children}</div>
      </div>

      {/* Barra inferior — solo celular */}
      <div className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        {accionesAbierto && (
          <div className="mx-auto flex max-w-md justify-center px-5 pb-3">
            <div className="flex gap-2 rounded-2xl border border-[#EFE9DC] bg-white p-2 shadow-lg">
              <Link
                href="/dashboard/citas?nuevo=1"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#5C2235] px-3.5 py-2.5 text-[13px] font-semibold text-white"
              >
                <Calendar size={14} /> Nueva cita
              </Link>
              <Link
                href="/dashboard/pacientes?nuevo=1"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#EFE9DC] px-3.5 py-2.5 text-[13px] font-semibold text-[#2b2118]"
              >
                <UserPlus size={14} /> Nuevo paciente
              </Link>
            </div>
          </div>
        )}

        {masAbierto && (
          <div className="mx-auto max-w-md px-5 pb-3">
            <div className="rounded-2xl border border-[#EFE9DC] bg-white p-2 shadow-lg">
              {NAV_MAS.filter(visible).map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium ${
                    esActivo(t.href) ? "bg-[#F7E5E0] text-[#803449]" : "text-[#2b2118]"
                  }`}
                >
                  <t.icon size={16} /> {t.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* El fondo blanco cubre también la zona segura del iPhone (la
            barrita de inicio) — si no, el contenido se asoma por debajo. */}
        <div className="border-t border-[#EFE9DC] bg-white" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-md items-center justify-between px-6 pt-1.5">
          {NAV_INFERIOR_IZQ.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex w-14 flex-col items-center gap-0.5 py-1"
            >
              <t.icon size={20} strokeWidth={esActivo(t.href) ? 2.4 : 1.8} className={esActivo(t.href) ? "text-[#803449]" : "text-[#a49c8a]"} />
              <span className={`text-[10px] font-medium ${esActivo(t.href) ? "text-[#803449]" : "text-[#a49c8a]"}`}>{t.label}</span>
              {esActivo(t.href) && <span className="h-1 w-1 rounded-full bg-[#803449]" />}
            </Link>
          ))}

          <button
            onClick={() => {
              setAccionesAbierto((v) => !v);
              setMasAbierto(false);
            }}
            aria-label="Acciones rápidas"
            className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#5C2235] text-white shadow-lg"
          >
            {accionesAbierto ? <X size={22} /> : <Plus size={22} />}
          </button>

          {NAV_INFERIOR_DER.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex w-14 flex-col items-center gap-0.5 py-1"
            >
              <t.icon size={20} strokeWidth={esActivo(t.href) ? 2.4 : 1.8} className={esActivo(t.href) ? "text-[#803449]" : "text-[#a49c8a]"} />
              <span className={`text-[10px] font-medium ${esActivo(t.href) ? "text-[#803449]" : "text-[#a49c8a]"}`}>{t.label}</span>
              {esActivo(t.href) && <span className="h-1 w-1 rounded-full bg-[#803449]" />}
            </Link>
          ))}

          <button
            onClick={() => {
              setMasAbierto((v) => !v);
              setAccionesAbierto(false);
            }}
            className="flex w-14 flex-col items-center gap-0.5 py-1"
          >
            <MoreHorizontal
              size={20}
              strokeWidth={masAbierto || NAV_MAS.some((t) => esActivo(t.href)) ? 2.4 : 1.8}
              className={masAbierto || NAV_MAS.some((t) => esActivo(t.href)) ? "text-[#803449]" : "text-[#a49c8a]"}
            />
            <span className={`text-[10px] font-medium ${masAbierto || NAV_MAS.some((t) => esActivo(t.href)) ? "text-[#803449]" : "text-[#a49c8a]"}`}>
              Más
            </span>
            {(masAbierto || NAV_MAS.some((t) => esActivo(t.href))) && <span className="h-1 w-1 rounded-full bg-[#803449]" />}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
