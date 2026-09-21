"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  FileDown,
  FileSignature,
  FileText,
  Paperclip,
  Pill,
  Plus,
  Receipt,
  Save,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Consentimiento, Paciente, PacienteNota, Presupuesto, Receta } from "@/lib/types";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { Odontograma } from "@/components/Odontograma";
import { fechaSoloDia, hoyISO } from "@/lib/fechas";
import { formatearDinero } from "@/lib/dinero";
import { TRATAMIENTOS } from "@/lib/panel-data";

function totalPresupuesto(items: { cantidad: number; precio_unitario: number }[]) {
  return items.reduce((suma, it) => suma + it.cantidad * it.precio_unitario, 0);
}

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  const [guardandoNota, setGuardandoNota] = useState(false);
  const [archivoNota, setArchivoNota] = useState<string | null>(null);
  const [archivoNotaNombre, setArchivoNotaNombre] = useState<string | null>(null);
  const [archivoNotaTipo, setArchivoNotaTipo] = useState<string | null>(null);
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [eliminandoNotaId, setEliminandoNotaId] = useState<number | null>(null);

  const [enviandoLink, setEnviandoLink] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [enviandoPortal, setEnviandoPortal] = useState(false);
  const [portalCopiado, setPortalCopiado] = useState(false);

  const [consentimientos, setConsentimientos] = useState<Consentimiento[]>([]);
  const [formConsentAbierto, setFormConsentAbierto] = useState(false);
  const [tituloConsent, setTituloConsent] = useState("");
  const [contenidoConsent, setContenidoConsent] = useState("");
  const [creandoConsent, setCreandoConsent] = useState(false);
  const [tipoConsentAbierto, setTipoConsentAbierto] = useState(false);
  const [generandoConsentExpediente, setGenerandoConsentExpediente] = useState(false);
  const [eliminandoConsentId, setEliminandoConsentId] = useState<number | null>(null);
  const [compartiendoConsentId, setCompartiendoConsentId] = useState<number | null>(null);
  const [linkConsentCopiadoId, setLinkConsentCopiadoId] = useState<number | null>(null);

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [formPresupuestoAbierto, setFormPresupuestoAbierto] = useState(false);
  const [tituloPresupuesto, setTituloPresupuesto] = useState("");
  const [notasPresupuesto, setNotasPresupuesto] = useState("");
  const [itemsPresupuesto, setItemsPresupuesto] = useState([{ concepto: "", cantidad: "1", precio_unitario: "" }]);
  const [creandoPresupuesto, setCreandoPresupuesto] = useState(false);
  const [eliminandoPresupuestoId, setEliminandoPresupuestoId] = useState<number | null>(null);
  const [compartiendoPresupuestoId, setCompartiendoPresupuestoId] = useState<number | null>(null);
  const [linkPresupuestoCopiadoId, setLinkPresupuestoCopiadoId] = useState<number | null>(null);

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [formRecetaAbierto, setFormRecetaAbierto] = useState(false);
  const [diagnosticoReceta, setDiagnosticoReceta] = useState("");
  const [medicamentosReceta, setMedicamentosReceta] = useState("");
  const [indicacionesReceta, setIndicacionesReceta] = useState("");
  const [pesoReceta, setPesoReceta] = useState("");
  const [creandoReceta, setCreandoReceta] = useState(false);
  const [eliminandoRecetaId, setEliminandoRecetaId] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    const [resPaciente, resNotas, resConsent, resPresupuestos, resRecetas] = await Promise.all([
      fetch(`/api/pacientes/${pacienteId}`),
      fetch(`/api/pacientes/${pacienteId}/notas`),
      fetch(`/api/pacientes/${pacienteId}/consentimientos`),
      fetch(`/api/pacientes/${pacienteId}/presupuestos`),
      fetch(`/api/pacientes/${pacienteId}/recetas`),
    ]);
    const dataPaciente = await resPaciente.json();
    const dataNotas = await resNotas.json();
    const dataConsent = await resConsent.json();
    const dataPresupuestos = await resPresupuestos.json();
    const dataRecetas = await resRecetas.json();
    const p: Paciente = dataPaciente.paciente;
    setPaciente(p);
    setNombre(p.nombre);
    setTelefono(p.telefono ?? "");
    setEmail(p.email ?? "");
    setFechaNacimiento(p.fecha_nacimiento ? p.fecha_nacimiento.slice(0, 10) : "");
    setNotas(dataNotas.notas ?? []);
    setConsentimientos(dataConsent.consentimientos ?? []);
    setPresupuestos(dataPresupuestos.presupuestos ?? []);
    setRecetas(dataRecetas.recetas ?? []);
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
    if (!archivoNota || guardandoNota) return;
    setGuardandoNota(true);
    await fetch(`/api/pacientes/${pacienteId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: archivoNotaTipo?.startsWith("image/") ? "Foto" : "Documento",
        archivo: archivoNota,
        archivo_nombre: archivoNotaNombre,
        archivo_tipo: archivoNotaTipo,
      }),
    });
    quitarArchivoNota();
    setGuardandoNota(false);
    const res = await fetch(`/api/pacientes/${pacienteId}/notas`);
    const data = await res.json();
    setNotas(data.notas ?? []);
  }

  async function eliminarNota(notaId: number) {
    if (eliminandoNotaId) return;
    // NOM-024: nada se borra de verdad — "eliminar" anula la entrada con
    // un motivo, pero se sigue viendo (marcada) en el historial.
    const motivo = window.prompt(
      "Motivo de la anulación (la entrada no se borra, queda marcada como anulada en el historial):"
    );
    if (!motivo || !motivo.trim()) return;
    setEliminandoNotaId(notaId);
    await fetch(`/api/pacientes/${pacienteId}/notas/${notaId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    });
    const res = await fetch(`/api/pacientes/${pacienteId}/notas`);
    const data = await res.json();
    setNotas(data.notas ?? []);
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
          await navigator.share({ title: "Historia clínica — Viña Sonrisas", text: texto, url });
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

  async function compartirPortal() {
    if (enviandoPortal || !paciente) return;
    setEnviandoPortal(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/historial-token`);
      const data = await res.json();
      if (!data.token) return;

      const url = `${window.location.origin}/portal/${data.token}`;
      const texto = `Hola ${paciente.nombre.split(" ")[0]}, aquí puedes ver tu historial de actividad: ${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: "Tu portal — Viña Sonrisas", text: texto, url });
        } catch {
          // el usuario canceló el share, no hacer nada
        }
      } else {
        await navigator.clipboard.writeText(texto);
        setPortalCopiado(true);
        setTimeout(() => setPortalCopiado(false), 2500);
      }
    } finally {
      setEnviandoPortal(false);
    }
  }

  async function crearConsentimiento() {
    if (!tituloConsent.trim() || !contenidoConsent.trim() || creandoConsent) return;
    setCreandoConsent(true);
    await fetch(`/api/pacientes/${pacienteId}/consentimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: tituloConsent, contenido: contenidoConsent }),
    });
    setTituloConsent("");
    setContenidoConsent("");
    setFormConsentAbierto(false);
    setCreandoConsent(false);
    const res = await fetch(`/api/pacientes/${pacienteId}/consentimientos`);
    const data = await res.json();
    setConsentimientos(data.consentimientos ?? []);
  }

  async function generarConsentimientoExpediente(tipo: "expediente" | "ortodoncia") {
    if (generandoConsentExpediente) return;
    setGenerandoConsentExpediente(true);
    await fetch(`/api/pacientes/${pacienteId}/consentimientos/expediente-electronico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    });
    const res = await fetch(`/api/pacientes/${pacienteId}/consentimientos`);
    const data = await res.json();
    setConsentimientos(data.consentimientos ?? []);
    setGenerandoConsentExpediente(false);
    setTipoConsentAbierto(false);
  }

  async function eliminarConsentimiento(id: number) {
    if (eliminandoConsentId) return;
    const ok = window.confirm("¿Eliminar este consentimiento?");
    if (!ok) return;
    setEliminandoConsentId(id);
    await fetch(`/api/pacientes/${pacienteId}/consentimientos/${id}`, { method: "DELETE" });
    setConsentimientos((prev) => prev.filter((c) => c.id !== id));
    setEliminandoConsentId(null);
  }

  async function compartirConsentimiento(c: Consentimiento) {
    if (compartiendoConsentId || !paciente) return;
    setCompartiendoConsentId(c.id);
    try {
      const url = `${window.location.origin}/consentimiento/${c.token}`;
      const texto = `Hola ${paciente.nombre.split(" ")[0]}, antes de tu cita firma tu consentimiento "${c.titulo}" aquí: ${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: "Consentimiento — Viña Sonrisas", text: texto, url });
        } catch {
          // el usuario canceló el share, no hacer nada
        }
      } else {
        await navigator.clipboard.writeText(texto);
        setLinkConsentCopiadoId(c.id);
        setTimeout(() => setLinkConsentCopiadoId(null), 2500);
      }
    } finally {
      setCompartiendoConsentId(null);
    }
  }

  function agregarItemPresupuesto() {
    setItemsPresupuesto((prev) => [...prev, { concepto: "", cantidad: "1", precio_unitario: "" }]);
  }

  function quitarItemPresupuesto(index: number) {
    setItemsPresupuesto((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function actualizarItemPresupuesto(index: number, campo: "concepto" | "cantidad" | "precio_unitario", valor: string) {
    setItemsPresupuesto((prev) => prev.map((it, i) => (i === index ? { ...it, [campo]: valor } : it)));
  }

  async function crearPresupuesto() {
    const itemsValidos = itemsPresupuesto.filter((it) => it.concepto.trim() && it.precio_unitario !== "");
    if (!tituloPresupuesto.trim() || itemsValidos.length === 0 || creandoPresupuesto) return;
    setCreandoPresupuesto(true);
    await fetch(`/api/pacientes/${pacienteId}/presupuestos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: tituloPresupuesto,
        notas: notasPresupuesto || null,
        items: itemsValidos.map((it) => ({
          concepto: it.concepto.trim(),
          cantidad: Number(it.cantidad) || 1,
          precio_unitario: Number(it.precio_unitario) || 0,
        })),
      }),
    });
    setTituloPresupuesto("");
    setNotasPresupuesto("");
    setItemsPresupuesto([{ concepto: "", cantidad: "1", precio_unitario: "" }]);
    setFormPresupuestoAbierto(false);
    setCreandoPresupuesto(false);
    const res = await fetch(`/api/pacientes/${pacienteId}/presupuestos`);
    const data = await res.json();
    setPresupuestos(data.presupuestos ?? []);
  }

  async function eliminarPresupuesto(id: number) {
    if (eliminandoPresupuestoId) return;
    const ok = window.confirm("¿Eliminar este presupuesto?");
    if (!ok) return;
    setEliminandoPresupuestoId(id);
    await fetch(`/api/pacientes/${pacienteId}/presupuestos/${id}`, { method: "DELETE" });
    setPresupuestos((prev) => prev.filter((p) => p.id !== id));
    setEliminandoPresupuestoId(null);
  }

  async function compartirPresupuesto(p: Presupuesto) {
    if (compartiendoPresupuestoId || !paciente) return;
    setCompartiendoPresupuestoId(p.id);
    try {
      const url = `${window.location.origin}/presupuesto/${p.token}`;
      const texto = `Hola ${paciente.nombre.split(" ")[0]}, te comparto el presupuesto "${p.titulo}" (${formatearDinero(
        totalPresupuesto(p.items)
      )}) para que lo revises y apruebes aquí: ${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: "Presupuesto — Viña Sonrisas", text: texto, url });
        } catch {
          // el usuario canceló el share, no hacer nada
        }
      } else {
        await navigator.clipboard.writeText(texto);
        setLinkPresupuestoCopiadoId(p.id);
        setTimeout(() => setLinkPresupuestoCopiadoId(null), 2500);
      }
    } finally {
      setCompartiendoPresupuestoId(null);
    }
  }

  async function crearReceta() {
    if (!medicamentosReceta.trim() || creandoReceta) return;
    setCreandoReceta(true);
    await fetch(`/api/pacientes/${pacienteId}/recetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diagnostico: diagnosticoReceta || null,
        medicamentos: medicamentosReceta,
        indicaciones: indicacionesReceta || null,
        peso: pesoReceta || null,
      }),
    });
    setDiagnosticoReceta("");
    setMedicamentosReceta("");
    setIndicacionesReceta("");
    setPesoReceta("");
    setFormRecetaAbierto(false);
    setCreandoReceta(false);
    const res = await fetch(`/api/pacientes/${pacienteId}/recetas`);
    const data = await res.json();
    setRecetas(data.recetas ?? []);
  }

  async function eliminarReceta(recetaId: number) {
    if (eliminandoRecetaId) return;
    // NOM-024: nada se borra de verdad — "eliminar" anula la receta con
    // un motivo, pero se sigue viendo (marcada) en el historial.
    const motivo = window.prompt(
      "Motivo de la anulación (la receta no se borra, queda marcada como anulada en el historial):"
    );
    if (!motivo || !motivo.trim()) return;
    setEliminandoRecetaId(recetaId);
    await fetch(`/api/pacientes/${pacienteId}/recetas/${recetaId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    });
    const res = await fetch(`/api/pacientes/${pacienteId}/recetas`);
    const data = await res.json();
    setRecetas(data.recetas ?? []);
    setEliminandoRecetaId(null);
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
            className="flex items-center gap-1.5 rounded-full border border-[#E3C3C9] bg-[#F5E7E9] px-3 py-1.5 text-[12px] font-medium text-[#803449]"
          >
            <ClipboardList size={13} /> Historia clínica
          </Link>
          <button
            onClick={compartirLink}
            disabled={enviandoLink}
            className="flex items-center gap-1.5 rounded-full border border-[#E8D8A0] bg-[#FCEFD2] px-3 py-1.5 text-[12px] font-medium text-[#B08419] disabled:opacity-50"
          >
            <Share2 size={13} /> {linkCopiado ? "Link copiado ✓" : "Enviar link para llenar historial"}
          </button>
          <a
            href={`/api/pacientes/${paciente.id}/reporte`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-[#BFD8B4] bg-[#E8F0E3] px-3 py-1.5 text-[12px] font-medium text-[#3F6B33]"
          >
            <FileDown size={13} /> Descargar reporte
          </a>
          <button
            onClick={compartirPortal}
            disabled={enviandoPortal}
            className="flex items-center gap-1.5 rounded-full border border-[#DDC2E0] bg-[#EFE3F0] px-3 py-1.5 text-[12px] font-medium text-[#7A4D8A] disabled:opacity-50"
          >
            <ExternalLink size={13} /> {portalCopiado ? "Link copiado ✓" : "Copiar link del portal"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Nombre completo</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Fecha de nacimiento</label>
            <input
              type="date"
              value={fechaNacimiento}
              max={hoyISO()}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#a49c8a]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
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
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            <FileSignature size={13} /> Consentimientos
          </div>
          <span className="text-[11px] text-[#a49c8a]">
            {consentimientos.length} documento{consentimientos.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-3">
          {consentimientos.length === 0 ? (
            <p className="text-sm text-[#8a8272]">Sin consentimientos todavía.</p>
          ) : (
            consentimientos.map((c) => (
              <div key={c.id} className="rounded-2xl border border-[#EFE9DC] bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#2b2118]">{c.titulo}</div>
                    {c.estado === "firmado" ? (
                      <span className="mt-1 inline-block rounded-full bg-[#E3F0DE] px-2 py-0.5 text-[10px] font-semibold text-[#3F6B33]">
                        Firmado
                      </span>
                    ) : (
                      <span className="mt-1 inline-block rounded-full bg-[#F7ECD9] px-2 py-0.5 text-[10px] font-semibold text-[#B0834A]">
                        Pendiente de firma
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarConsentimiento(c.id)}
                    disabled={eliminandoConsentId === c.id}
                    className="shrink-0 text-[#c9a99a] disabled:opacity-50"
                    aria-label="Eliminar consentimiento"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {c.estado === "firmado" ? (
                  <div className="mt-2 flex items-center gap-3">
                    {c.firma && (
                      <img
                        src={c.firma}
                        alt="Firma"
                        className="h-12 w-20 rounded-lg border border-[#EFE9DC] bg-white object-contain p-1"
                      />
                    )}
                    <div className="text-[11px] text-[#a49c8a]">
                      {c.nombre_firma}
                      {c.firmado_en && (
                        <>
                          <br />
                          {new Date(c.firmado_en).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </div>
                    <a
                      href={`/consentimiento/${c.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[12px] font-medium text-[#803449] underline underline-offset-2"
                    >
                      Ver
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => compartirConsentimiento(c)}
                    disabled={compartiendoConsentId === c.id}
                    className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#803449] disabled:opacity-50"
                  >
                    <Share2 size={12} />
                    {linkConsentCopiadoId === c.id ? "Link copiado ✓" : "Compartir link para firmar"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {tipoConsentAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#E3C3C9] bg-[#F5E7E9] p-3">
            <p className="text-[12px] font-medium text-[#803449]">¿Qué tipo de consentimiento quieres generar?</p>
            <div className="flex gap-2">
              <button
                onClick={() => generarConsentimientoExpediente("expediente")}
                disabled={generandoConsentExpediente}
                className="flex-1 rounded-full bg-[#803449] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {generandoConsentExpediente ? "Generando…" : "General (expediente clínico)"}
              </button>
              <button
                onClick={() => generarConsentimientoExpediente("ortodoncia")}
                disabled={generandoConsentExpediente}
                className="flex-1 rounded-full border border-[#803449] py-2 text-[13px] font-semibold text-[#803449] disabled:opacity-50"
              >
                {generandoConsentExpediente ? "Generando…" : "Ortodoncia"}
              </button>
            </div>
            <button
              onClick={() => setTipoConsentAbierto(false)}
              disabled={generandoConsentExpediente}
              className="w-full text-center text-[12px] font-medium text-[#803449]/70 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setTipoConsentAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#F5E7E9] py-2.5 text-[13px] font-semibold text-[#803449]"
          >
            <Sparkles size={14} /> Generar consentimiento
          </button>
        )}

        {formConsentAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
            <input
              value={tituloConsent}
              onChange={(e) => setTituloConsent(e.target.value)}
              placeholder="Título (ej. Consentimiento para endodoncia)"
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <textarea
              value={contenidoConsent}
              onChange={(e) => setContenidoConsent(e.target.value)}
              placeholder="Texto del consentimiento que va a leer y firmar el paciente…"
              rows={5}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <div className="flex gap-2">
              <button
                onClick={crearConsentimiento}
                disabled={!tituloConsent.trim() || !contenidoConsent.trim() || creandoConsent}
                className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {creandoConsent ? "Creando…" : "Crear y generar link"}
              </button>
              <button
                onClick={() => setFormConsentAbierto(false)}
                className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFormConsentAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#E3C3C9] bg-[#F5E7E9] py-2.5 text-[13px] font-semibold text-[#803449]"
          >
            <Plus size={14} /> Nuevo consentimiento
          </button>
        )}
      </div>

      <Odontograma paciente={paciente} />

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            <Receipt size={13} /> Presupuestos
          </div>
          <span className="text-[11px] text-[#a49c8a]">
            {presupuestos.length} presupuesto{presupuestos.length === 1 ? "" : "s"}
          </span>
        </div>

        <p className="mb-3 text-[11px] text-[#a49c8a]">
          Arma el desglose de costos y comparte el link — el paciente ve el total y aprueba o rechaza sin
          necesitar cuenta.
        </p>

        <div className="space-y-3">
          {presupuestos.length === 0 ? (
            <p className="text-sm text-[#8a8272]">Sin presupuestos todavía.</p>
          ) : (
            presupuestos.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[#EFE9DC] bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#2b2118]">{p.titulo}</div>
                    {p.estado === "aprobado" ? (
                      <span className="mt-1 inline-block rounded-full bg-[#E3F0DE] px-2 py-0.5 text-[10px] font-semibold text-[#3F6B33]">
                        Aprobado
                      </span>
                    ) : p.estado === "rechazado" ? (
                      <span className="mt-1 inline-block rounded-full bg-[#F7E5E0] px-2 py-0.5 text-[10px] font-semibold text-[#B0503A]">
                        Rechazado
                      </span>
                    ) : (
                      <span className="mt-1 inline-block rounded-full bg-[#F7ECD9] px-2 py-0.5 text-[10px] font-semibold text-[#B0834A]">
                        Pendiente de respuesta
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-[#2b2118]">
                      {formatearDinero(totalPresupuesto(p.items))}
                    </span>
                    <button
                      onClick={() => eliminarPresupuesto(p.id)}
                      disabled={eliminandoPresupuestoId === p.id}
                      className="text-[#c9a99a] disabled:opacity-50"
                      aria-label="Eliminar presupuesto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  {p.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-[12px] text-[#8a8272]">
                      <span className="truncate">
                        {it.concepto}
                        {it.cantidad !== 1 && ` ×${it.cantidad}`}
                      </span>
                      <span className="shrink-0">{formatearDinero(it.cantidad * it.precio_unitario)}</span>
                    </div>
                  ))}
                </div>

                {p.estado === "pendiente" ? (
                  <button
                    onClick={() => compartirPresupuesto(p)}
                    disabled={compartiendoPresupuestoId === p.id}
                    className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#803449] disabled:opacity-50"
                  >
                    <Share2 size={12} />
                    {linkPresupuestoCopiadoId === p.id ? "Link copiado ✓" : "Compartir para aprobación"}
                  </button>
                ) : (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#a49c8a]">
                    <span>
                      {p.nombre_respuesta}
                      {p.respondido_en &&
                        ` · ${new Date(p.respondido_en).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`}
                    </span>
                    <a
                      href={`/presupuesto/${p.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#803449] underline underline-offset-2"
                    >
                      Ver
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {formPresupuestoAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
            <input
              value={tituloPresupuesto}
              onChange={(e) => setTituloPresupuesto(e.target.value)}
              placeholder="Título (ej. Tratamiento de ortodoncia)"
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />

            <datalist id="conceptos-presupuesto">
              {TRATAMIENTOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>

            <div className="space-y-2">
              {itemsPresupuesto.map((it, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    value={it.concepto}
                    onChange={(e) => actualizarItemPresupuesto(i, "concepto", e.target.value)}
                    placeholder="Concepto"
                    list="conceptos-presupuesto"
                    className="min-w-0 flex-1 rounded-xl border border-[#EFE9DC] px-2.5 py-2 text-[13px] outline-none focus:border-[#803449]"
                  />
                  <input
                    type="number"
                    min="1"
                    value={it.cantidad}
                    onChange={(e) => actualizarItemPresupuesto(i, "cantidad", e.target.value)}
                    placeholder="Cant."
                    className="w-14 rounded-xl border border-[#EFE9DC] px-2 py-2 text-[13px] outline-none focus:border-[#803449]"
                  />
                  <input
                    type="number"
                    min="0"
                    value={it.precio_unitario}
                    onChange={(e) => actualizarItemPresupuesto(i, "precio_unitario", e.target.value)}
                    placeholder="Precio"
                    className="w-20 rounded-xl border border-[#EFE9DC] px-2 py-2 text-[13px] outline-none focus:border-[#803449]"
                  />
                  <button
                    onClick={() => quitarItemPresupuesto(i)}
                    disabled={itemsPresupuesto.length === 1}
                    className="shrink-0 text-[#c9a99a] disabled:opacity-30"
                    aria-label="Quitar concepto"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={agregarItemPresupuesto}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#803449]"
            >
              <Plus size={13} /> Agregar concepto
            </button>

            <textarea
              value={notasPresupuesto}
              onChange={(e) => setNotasPresupuesto(e.target.value)}
              placeholder="Notas para el paciente (opcional)"
              rows={2}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />

            <div className="flex items-center justify-between rounded-xl bg-[#FBF9F5] px-3 py-2">
              <span className="text-[12px] font-medium text-[#8a8272]">Total</span>
              <span className="text-sm font-bold text-[#3F6B33]">
                {formatearDinero(
                  totalPresupuesto(
                    itemsPresupuesto.map((it) => ({
                      cantidad: Number(it.cantidad) || 0,
                      precio_unitario: Number(it.precio_unitario) || 0,
                    }))
                  )
                )}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={crearPresupuesto}
                disabled={
                  !tituloPresupuesto.trim() ||
                  !itemsPresupuesto.some((it) => it.concepto.trim() && it.precio_unitario !== "") ||
                  creandoPresupuesto
                }
                className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {creandoPresupuesto ? "Creando…" : "Crear y generar link"}
              </button>
              <button
                onClick={() => setFormPresupuestoAbierto(false)}
                className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFormPresupuestoAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#E8D8A0] bg-[#FCEFD2] py-2.5 text-[13px] font-semibold text-[#B08419]"
          >
            <Plus size={14} /> Nuevo presupuesto
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            Estudios de laboratorio
          </div>
          <span className="text-[11px] text-[#a49c8a]">
            {(() => {
              const n = notas.filter((x) => x.vigente).length;
              return `${n} entrada${n === 1 ? "" : "s"}`;
            })()}
          </span>
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
                <span
                  className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: n.vigente ? "#803449" : "#c9a99a" }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-sm font-medium ${n.vigente ? "text-[#2b2118]" : "text-[#a49c8a] line-through"}`}>
                      {n.tipo}
                    </span>
                    <span className="ml-2 text-[11px] text-[#a49c8a]">{formatearFecha(n.fecha)}</span>
                  </div>
                  {n.vigente && (
                    <button
                      onClick={() => eliminarNota(n.id)}
                      disabled={eliminandoNotaId === n.id}
                      className="shrink-0 text-[#c9a99a] disabled:opacity-50"
                      aria-label="Eliminar entrada"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                {(n.creado_por_nombre || n.archivo || !n.vigente) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#a49c8a]">
                    {n.creado_por_nombre && <span>Registrado por {n.creado_por_nombre}</span>}
                    {n.archivo && <span>Subido el {formatearFechaHora(n.subido_en)}</span>}
                    {!n.vigente && (
                      <span className="text-[#b23a5a]">
                        Anulado por {n.anulado_por_nombre}: {n.motivo_anulacion}
                      </span>
                    )}
                  </div>
                )}
                {(n.tratamiento || n.duracion) && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {n.tratamiento && (
                      <span className="rounded-full bg-[#F5E7E9] px-2 py-0.5 text-[11px] font-medium text-[#803449]">
                        {n.tratamiento}
                      </span>
                    )}
                    {n.duracion && (
                      <span className="rounded-full bg-[#F5F1EA] px-2 py-0.5 text-[11px] font-medium text-[#8a8272]">
                        {n.duracion}
                      </span>
                    )}
                  </div>
                )}
                {n.nota && (
                  <p className={`mt-0.5 text-[13px] text-[#8a8272] ${n.vigente ? "" : "line-through opacity-70"}`}>
                    {n.nota}
                  </p>
                )}
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

        <div className="mt-4 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
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
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#E3C3C9] bg-[#F5E7E9] py-2.5 text-[12px] font-medium text-[#803449]">
              <Paperclip size={13} />
              {procesandoArchivo ? "Procesando…" : "Adjuntar documentos"}
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

          <button
            onClick={agregarNota}
            disabled={!archivoNota || guardandoNota || procesandoArchivo}
            className="w-full rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {guardandoNota ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">
            <Pill size={13} /> Recetas
          </div>
          <span className="text-[11px] text-[#a49c8a]">
            {recetas.length} receta{recetas.length === 1 ? "" : "s"}
          </span>
        </div>

        <p className="mb-3 text-[11px] text-[#a49c8a]">
          En cuanto se crea, el paciente la puede ver en su portal y le llega un aviso por WhatsApp (si tiene
          teléfono registrado y el WhatsApp Business está configurado).
        </p>

        <div className="space-y-3">
          {recetas.length === 0 ? (
            <p className="text-sm text-[#8a8272]">Sin recetas todavía.</p>
          ) : (
            recetas.map((r) => (
              <div
                key={r.id}
                className={`rounded-2xl border p-3 ${
                  r.vigente ? "border-[#EFE9DC] bg-white" : "border-[#EFE9DC] bg-[#FBF9F5] opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {r.diagnostico && (
                      <div className={`text-sm font-medium ${r.vigente ? "text-[#2b2118]" : "text-[#8a8272] line-through"}`}>
                        {r.diagnostico}
                      </div>
                    )}
                    <div className={`whitespace-pre-line text-[13px] ${r.vigente ? "text-[#2b2118]" : "text-[#a49c8a] line-through"}`}>
                      {r.medicamentos}
                    </div>
                    {r.indicaciones && (
                      <div className={`mt-1 whitespace-pre-line text-[12px] ${r.vigente ? "text-[#8a8272]" : "text-[#a49c8a] line-through"}`}>
                        {r.indicaciones}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`/api/pacientes/${pacienteId}/recetas/${r.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#803449]"
                      aria-label="Descargar receta"
                    >
                      <FileDown size={14} />
                    </a>
                    {r.vigente && (
                      <button
                        onClick={() => eliminarReceta(r.id)}
                        disabled={eliminandoRecetaId === r.id}
                        className="text-[#c9a99a] disabled:opacity-50"
                        aria-label="Anular receta"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 text-[10px] text-[#a49c8a]">
                  {formatearFecha(r.fecha)} {r.creado_por_nombre && `· ${r.creado_por_nombre}`}
                  {!r.vigente && r.motivo_anulacion && (
                    <span className="text-[#B0503A]"> · Anulada por {r.anulado_por_nombre}: {r.motivo_anulacion}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {formRecetaAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
            <input
              value={diagnosticoReceta}
              onChange={(e) => setDiagnosticoReceta(e.target.value)}
              placeholder="Diagnóstico (opcional)"
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <input
              value={pesoReceta}
              onChange={(e) => setPesoReceta(e.target.value)}
              placeholder="Peso (opcional, ej. 70 kg)"
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <textarea
              value={medicamentosReceta}
              onChange={(e) => setMedicamentosReceta(e.target.value)}
              placeholder={"Medicamentos — uno por línea, ej.\nAmoxicilina 500mg — cada 8 horas por 7 días"}
              rows={3}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <textarea
              value={indicacionesReceta}
              onChange={(e) => setIndicacionesReceta(e.target.value)}
              placeholder="Indicaciones generales (opcional)"
              rows={2}
              className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <div className="flex gap-2">
              <button
                onClick={crearReceta}
                disabled={!medicamentosReceta.trim() || creandoReceta}
                className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {creandoReceta ? "Creando…" : "Crear receta"}
              </button>
              <button
                onClick={() => setFormRecetaAbierto(false)}
                className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFormRecetaAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#BFD8B4] bg-[#E8F0E3] py-2.5 text-[13px] font-semibold text-[#3F6B33]"
          >
            <Plus size={14} /> Nueva receta
          </button>
        )}
      </div>

      <LoyaltyCard paciente={paciente} />

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
