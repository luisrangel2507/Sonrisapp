"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  CreditCard,
  ClipboardList,
  FileText,
  Paperclip,
  Plus,
  Save,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { Paciente, PacienteNota } from "@/lib/types";
import { Odontograma } from "@/components/Odontograma";
import { fechaSoloDia, hoyISO } from "@/lib/fechas";

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// Radiografías/fotos se comprimen a un tamaño más grande que la foto de
// perfil (se necesita más detalle para poder leerlas), los PDF se suben
// tal cual con un tope de tamaño ya que no se pueden comprimir.
const ARCHIVO_MAX_DIM = 1600;
const ARCHIVO_CALIDAD = 0.85;
const PDF_MAX_BYTES = 4_000_000;

function comprimirImagenArchivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, ARCHIVO_MAX_DIM / Math.max(img.width, img.height));
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
      resolve(canvas.toDataURL("image/jpeg", ARCHIVO_CALIDAD));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function leerPdfComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export default function PacienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pacienteId = Number(params.id);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [notas, setNotas] = useState<PacienteNota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [alergias, setAlergias] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [antecedentes, setAntecedentes] = useState("");

  const [formNotaAbierto, setFormNotaAbierto] = useState(false);
  const [tipoNota, setTipoNota] = useState("");
  const [textoNota, setTextoNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [archivoNota, setArchivoNota] = useState<string | null>(null);
  const [archivoNotaNombre, setArchivoNotaNombre] = useState<string | null>(null);
  const [archivoNotaTipo, setArchivoNotaTipo] = useState<string | null>(null);
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [eliminandoNotaId, setEliminandoNotaId] = useState<number | null>(null);

  const [enviandoLink, setEnviandoLink] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  async function cargar() {
    setCargando(true);
    const [resPaciente, resNotas] = await Promise.all([
      fetch(`/api/pacientes/${pacienteId}`),
      fetch(`/api/pacientes/${pacienteId}/notas`),
    ]);
    const dataPaciente = await resPaciente.json();
    const dataNotas = await resNotas.json();
    const p: Paciente = dataPaciente.paciente;
    setPaciente(p);
    setNombre(p.nombre);
    setTelefono(p.telefono ?? "");
    setEmail(p.email ?? "");
    setFechaNacimiento(p.fecha_nacimiento ? p.fecha_nacimiento.slice(0, 10) : "");
    setAlergias(p.alergias ?? "");
    setMedicamentos(p.medicamentos ?? "");
    setAntecedentes(p.antecedentes_medicos ?? "");
    setNotas(dataNotas.notas ?? []);
    setCargando(false);
  }

  useEffect(() => {
    if (Number.isInteger(pacienteId)) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function guardarCambios() {
    setGuardando(true);
    setGuardado(false);
    await fetch(`/api/pacientes/${pacienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        telefono: telefono || null,
        email: email || null,
        fecha_nacimiento: fechaNacimiento || null,
        alergias: alergias || null,
        medicamentos: medicamentos || null,
        antecedentes_medicos: antecedentes || null,
      }),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  async function elegirArchivoNota(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorArchivo("");
    setProcesandoArchivo(true);
    try {
      if (file.type === "application/pdf") {
        if (file.size > PDF_MAX_BYTES) {
          setErrorArchivo("El PDF es demasiado grande (máx. 4 MB).");
          return;
        }
        const dataUrl = await leerPdfComoDataUrl(file);
        setArchivoNota(dataUrl);
        setArchivoNotaTipo("application/pdf");
        setArchivoNotaNombre(file.name);
      } else if (file.type.startsWith("image/")) {
        const dataUrl = await comprimirImagenArchivo(file);
        setArchivoNota(dataUrl);
        setArchivoNotaTipo("image/jpeg");
        setArchivoNotaNombre(file.name);
      } else {
        setErrorArchivo("Solo se aceptan imágenes o PDF.");
      }
    } catch {
      setErrorArchivo("No se pudo procesar el archivo.");
    } finally {
      setProcesandoArchivo(false);
    }
  }

  function quitarArchivoNota() {
    setArchivoNota(null);
    setArchivoNotaNombre(null);
    setArchivoNotaTipo(null);
    setErrorArchivo("");
  }

  async function agregarNota() {
    if (!tipoNota.trim() || guardandoNota) return;
    setGuardandoNota(true);
    await fetch(`/api/pacientes/${pacienteId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: tipoNota,
        nota: textoNota || null,
        archivo: archivoNota,
        archivo_nombre: archivoNotaNombre,
        archivo_tipo: archivoNotaTipo,
      }),
    });
    setTipoNota("");
    setTextoNota("");
    quitarArchivoNota();
    setFormNotaAbierto(false);
    setGuardandoNota(false);
    const res = await fetch(`/api/pacientes/${pacienteId}/notas`);
    const data = await res.json();
    setNotas(data.notas ?? []);
  }

  async function eliminarNota(notaId: number) {
    if (eliminandoNotaId) return;
    const ok = window.confirm("¿Eliminar esta entrada del historial?");
    if (!ok) return;
    setEliminandoNotaId(notaId);
    await fetch(`/api/pacientes/${pacienteId}/notas/${notaId}`, { method: "DELETE" });
    setNotas((prev) => prev.filter((n) => n.id !== notaId));
    setEliminandoNotaId(null);
  }

  async function compartirLink() {
    if (enviandoLink || !paciente) return;
    setEnviandoLink(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/historial-token`);
      const data = await res.json();
      if (!data.token) return;

      const url = `${window.location.origin}/formulario/${data.token}`;
      const texto = `Hola ${paciente.nombre.split(" ")[0]}, antes de tu cita completa tu historia clínica aquí: ${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: "Historia clínica — SonrisApp", text: texto, url });
        } catch {
          // el usuario canceló el share, no hacer nada
        }
      } else {
        await navigator.clipboard.writeText(texto);
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2500);
      }
    } finally {
      setEnviandoLink(false);
    }
  }

  async function eliminarPaciente() {
    if (eliminando || !paciente) return;
    const ok = window.confirm(
      `¿Eliminar a ${paciente.nombre}? Esto borra su ficha, citas, pagos, historial clínico y odontograma. No se puede deshacer.`
    );
    if (!ok) return;
    setEliminando(true);
    const res = await fetch(`/api/pacientes/${pacienteId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/pacientes");
    } else {
      setEliminando(false);
    }
  }

  if (cargando || !paciente) {
    return <p className="mx-4 mt-6 text-sm text-[#8a8272]">Cargando…</p>;
  }

  return (
    <div className="mx-4 mt-2 space-y-4 pb-6">
      <Link href="/dashboard/pacientes" className="inline-flex items-center gap-1 text-sm text-[#8a8272]">
        <ChevronLeft size={15} /> Pacientes
      </Link>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div>
          <h2 className="text-lg font-bold text-[#2b2118]" style={{ fontFamily: "Georgia, serif" }}>
            {paciente.nombre}
          </h2>
          <div className="text-xs text-[#a49c8a]">{paciente.folio}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/pacientes/${paciente.id}/historia-clinica`}
            className="flex items-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118]"
          >
            <ClipboardList size={13} /> Historia clínica
          </Link>
          <Link
            href={`/dashboard/lealtad/${paciente.id}`}
            className="flex items-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118]"
          >
            <CreditCard size={13} /> Lealtad
          </Link>
          <button
            onClick={compartirLink}
            disabled={enviandoLink}
            className="flex items-center gap-1.5 rounded-full border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118] disabled:opacity-50"
          >
            <Share2 size={13} /> {linkCopiado ? "Link copiado ✓" : "Enviar link para llenar historial"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Nombre completo</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Fecha de nacimiento</label>
            <input
              type="date"
              value={fechaNacimiento}
              max={hoyISO()}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
          Antecedentes médicos
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Alergias</label>
            <textarea
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
              rows={2}
              placeholder="Ej. penicilina, látex…"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Medicamentos actuales</label>
            <textarea
              value={medicamentos}
              onChange={(e) => setMedicamentos(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Otros antecedentes</label>
            <textarea
              value={antecedentes}
              onChange={(e) => setAntecedentes(e.target.value)}
              rows={2}
              placeholder="Diabetes, hipertensión, embarazo, etc."
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
        </div>

        <button
          onClick={guardarCambios}
          disabled={guardando}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          <Save size={14} /> {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            Historial clínico general
          </div>
          <span className="text-[11px] text-[#a49c8a]">{notas.length} entrada{notas.length === 1 ? "" : "s"}</span>
        </div>

        <div className="relative">
          {notas.length === 0 ? (
            <p className="text-sm text-[#8a8272]">Sin entradas todavía.</p>
          ) : (
            notas.map((n, i) => (
              <div key={n.id} className="relative pb-5 pl-6 last:pb-0">
                {i < notas.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-full w-px bg-[#EFE9DC]" />
                )}
                <span className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-white bg-[#C96F3B] shadow-sm" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium text-[#2b2118]">{n.tipo}</span>
                    <span className="ml-2 text-[11px] text-[#a49c8a]">{formatearFecha(n.fecha)}</span>
                  </div>
                  <button
                    onClick={() => eliminarNota(n.id)}
                    disabled={eliminandoNotaId === n.id}
                    className="shrink-0 text-[#c9a99a] disabled:opacity-50"
                    aria-label="Eliminar entrada"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {n.nota && <p className="mt-0.5 text-[13px] text-[#8a8272]">{n.nota}</p>}
                {n.archivo && n.archivo_tipo?.startsWith("image/") ? (
                  <a href={n.archivo} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                    <img
                      src={n.archivo}
                      alt={n.archivo_nombre ?? "Radiografía"}
                      className="h-24 w-24 rounded-xl border border-[#EFE9DC] object-cover"
                    />
                  </a>
                ) : n.archivo ? (
                  <a
                    href={n.archivo}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex w-fit items-center gap-1.5 rounded-xl border border-[#EFE9DC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2b2118]"
                  >
                    <FileText size={13} /> {n.archivo_nombre ?? "Documento"}
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>

        {formNotaAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
            <input
              value={tipoNota}
              onChange={(e) => setTipoNota(e.target.value)}
              placeholder="Tipo (ej. Consulta, Diagnóstico)"
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <textarea
              value={textoNota}
              onChange={(e) => setTextoNota(e.target.value)}
              placeholder="Nota (opcional)"
              rows={2}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />

            {archivoNota ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#EFE9DC] bg-[#FBF8F2] px-3 py-2">
                {archivoNotaTipo?.startsWith("image/") ? (
                  <img src={archivoNota} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <FileText size={16} className="text-[#8a8272]" />
                )}
                <span className="flex-1 truncate text-[12px] text-[#2b2118]">{archivoNotaNombre}</span>
                <button onClick={quitarArchivoNota} className="text-[#a49c8a]" aria-label="Quitar archivo">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#EFE9DC] bg-[#FBF8F2] py-2.5 text-[12px] font-medium text-[#8a8272]">
                <Paperclip size={13} />
                {procesandoArchivo ? "Procesando…" : "Adjuntar radiografía, foto o PDF"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={elegirArchivoNota}
                  disabled={procesandoArchivo}
                  className="hidden"
                />
              </label>
            )}
            {errorArchivo && <p className="text-[11px] text-[#B0503A]">{errorArchivo}</p>}

            <div className="flex gap-2">
              <button
                onClick={agregarNota}
                disabled={!tipoNota.trim() || guardandoNota || procesandoArchivo}
                className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardandoNota ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setFormNotaAbierto(false);
                  quitarArchivoNota();
                }}
                className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFormNotaAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#EFE9DC] bg-white py-2.5 text-[13px] font-semibold text-[#2b2118]"
          >
            <Plus size={14} /> Agregar entrada al historial
          </button>
        )}
      </div>

      <Odontograma paciente={paciente} />

      <button
        onClick={eliminarPaciente}
        disabled={eliminando}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EABDB0] bg-[#F7E5E0] py-2.5 text-[13px] font-semibold text-[#B0503A] disabled:opacity-50"
      >
        <Trash2 size={14} /> {eliminando ? "Eliminando…" : "Eliminar paciente"}
      </button>
    </div>
  );
}
