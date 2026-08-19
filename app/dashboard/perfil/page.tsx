"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, LogOut, Camera, UserCog, UserPlus, Trash2 } from "lucide-react";
import { TRATAMIENTOS, DOCTORA } from "@/lib/panel-data";
import type { Usuario } from "@/lib/types";

const FOTO_MAX_DIM = 480;
const FOTO_CALIDAD = 0.85;

function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, FOTO_MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", FOTO_CALIDAD));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

export default function PerfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const [foto, setFoto] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState("");

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState("");
  const [borrandoId, setBorrandoId] = useState<number | null>(null);

  function cargarUsuarios() {
    fetch("/api/usuarios")
      .then((res) => res.json())
      .then((data) => setUsuarios(data.usuarios ?? []))
      .finally(() => setCargandoUsuarios(false));
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (creandoUsuario) return;
    setErrorUsuario("");
    setCreandoUsuario(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre, usuario: nuevoUsuario, contrasena: nuevaContrasena }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "no se pudo crear el usuario");
      setNuevoNombre("");
      setNuevoUsuario("");
      setNuevaContrasena("");
      cargarUsuarios();
    } catch (err) {
      setErrorUsuario(err instanceof Error ? err.message : "no se pudo crear el usuario");
    } finally {
      setCreandoUsuario(false);
    }
  }

  async function borrarUsuario(id: number) {
    if (borrandoId) return;
    if (!confirm("¿Quitar el acceso de este usuario?")) return;
    setBorrandoId(id);
    try {
      await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setBorrandoId(null);
    }
  }

  async function cerrarSesion() {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/precios-servicios")
      .then((res) => res.json())
      .then((data) => {
        const mapa: Record<string, string> = {};
        for (const p of data.precios ?? []) {
          mapa[p.servicio] = p.precio != null ? String(p.precio) : "";
        }
        setPrecios(mapa);
        setCargando(false);
      });

    fetch("/api/perfil")
      .then((res) => res.json())
      .then((data) => setFoto(data.foto ?? null));

    cargarUsuarios();
  }, []);

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/precios-servicios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precios }),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || subiendoFoto) return;

    if (!file.type.startsWith("image/")) {
      setErrorFoto("Elige un archivo de imagen.");
      return;
    }

    setErrorFoto("");
    setSubiendoFoto(true);
    const anterior = foto;
    try {
      const dataUrl = await comprimirImagen(file);
      setFoto(dataUrl);
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto: dataUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "error al guardar");
    } catch (err) {
      setFoto(anterior);
      setErrorFoto(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  return (
    <div className="mx-4 mt-2 space-y-4 pb-10">
      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={elegirFoto}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendoFoto}
          className="group relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#EFE9DC] bg-[#F5F1EA] disabled:opacity-70"
          aria-label="Cambiar foto de perfil"
        >
          {foto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={foto} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <UserCog size={34} className="text-[#a49c8a]" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={20} className="text-white" />
          </span>
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#2b2118]">
            <Camera size={12} className="text-white" />
          </span>
        </button>
        {subiendoFoto && <p className="mt-2 text-[11px] text-[#a49c8a]">Subiendo foto…</p>}
        {errorFoto && <p className="mt-2 text-[11px] text-[#B0503A]">{errorFoto}</p>}

        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
          Perfil del dentista
        </div>
        <div className="mt-1 text-sm font-medium text-[#2b2118]">{DOCTORA.nombre}</div>
        <div className="text-xs text-[#a49c8a]">Cédula profesional: {DOCTORA.cedula}</div>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#C96F3B]">
          Precios por servicio
        </div>
        <p className="mb-4 text-[12px] text-[#a49c8a]">
          Se usan para sugerir el monto al agendar una cita. Déjalo vacío si el precio varía caso por caso.
        </p>

        {cargando ? (
          <p className="text-sm text-[#8a8272]">Cargando…</p>
        ) : (
          <div className="space-y-3">
            {TRATAMIENTOS.map((servicio) => (
              <div key={servicio} className="flex items-center justify-between gap-3">
                <label className="text-sm text-[#2b2118]">{servicio}</label>
                <div className="relative w-32">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a49c8a]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={precios[servicio] ?? ""}
                    onChange={(e) => setPrecios((prev) => ({ ...prev, [servicio]: e.target.value }))}
                    placeholder="—"
                    className="w-full rounded-xl border border-[#EFE9DC] bg-white py-2 pl-6 pr-3 text-right text-sm outline-none focus:border-[#C96F3B]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={guardar}
          disabled={cargando || guardando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          <Save size={15} /> {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar precios"}
        </button>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#C96F3B]">Usuarios</div>
        <p className="mb-4 text-[12px] text-[#a49c8a]">
          Quién más puede entrar al panel. Cada quien usa su propio usuario y contraseña.
        </p>

        {cargandoUsuarios ? (
          <p className="text-sm text-[#8a8272]">Cargando…</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-[#a49c8a]">Todavía no hay usuarios adicionales.</p>
        ) : (
          <div className="mb-4 space-y-2">
            {usuarios.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#EFE9DC] bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[#2b2118]">{u.nombre}</div>
                  <div className="truncate text-xs text-[#a49c8a]">@{u.usuario}</div>
                </div>
                <button
                  onClick={() => borrarUsuario(u.id)}
                  disabled={borrandoId === u.id}
                  aria-label="Quitar usuario"
                  className="shrink-0 rounded-full p-2 text-[#B0503A] disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={crearUsuario} className="space-y-3">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre completo"
            required
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#C96F3B]"
          />
          <input
            value={nuevoUsuario}
            onChange={(e) => setNuevoUsuario(e.target.value)}
            placeholder="Usuario (para iniciar sesión)"
            required
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#C96F3B]"
          />
          <input
            value={nuevaContrasena}
            onChange={(e) => setNuevaContrasena(e.target.value)}
            placeholder="Contraseña (mínimo 6 caracteres)"
            type="text"
            required
            minLength={6}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm text-[#2b2118] outline-none focus:border-[#C96F3B]"
          />
          {errorUsuario && <p className="text-[12px] text-[#B0503A]">{errorUsuario}</p>}
          <button
            type="submit"
            disabled={creandoUsuario}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            <UserPlus size={15} /> {creandoUsuario ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      </div>

      <button
        onClick={cerrarSesion}
        disabled={cerrandoSesion}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white/70 py-3 text-[14px] font-semibold text-[#B0503A] disabled:opacity-50"
      >
        <LogOut size={15} /> {cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
