"use client";

import { useEffect, useState } from "react";
import { Esqueleto } from "@/components/Esqueleto";
import { Plus, Minus, Pencil, Trash2, AlertTriangle, Search, ShoppingCart, History, Share2 } from "lucide-react";
import type { InventarioItem, MovimientoInventario } from "@/lib/types";
import { formatearDinero } from "@/lib/dinero";

function sugerido(i: InventarioItem) {
  const min = i.cantidad_minima ?? 0;
  return Math.max(1, Math.ceil(min * 2 - i.cantidad));
}
const fechaCorta = (f: string) => new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

export default function InventarioPage() {
  const [items, setItems] = useState<InventarioItem[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("");
  const [cantidadMinima, setCantidadMinima] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editUnidad, setEditUnidad] = useState("");
  const [editCantidadMinima, setEditCantidadMinima] = useState("");
  const [editNotas, setEditNotas] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [ajustandoId, setAjustandoId] = useState<number | null>(null);

  const [compraId, setCompraId] = useState<number | null>(null);
  const [compraCantidad, setCompraCantidad] = useState("");
  const [compraCosto, setCompraCosto] = useState("");
  const [compraProveedor, setCompraProveedor] = useState("");
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [historialId, setHistorialId] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [listaCopiada, setListaCopiada] = useState(false);

  function abrirCompra(item: InventarioItem) {
    setCompraId(compraId === item.id ? null : item.id);
    setCompraCantidad(String(sugerido(item)));
    setCompraCosto("");
    setCompraProveedor(item.proveedor ?? "");
  }

  async function registrarCompra(item: InventarioItem) {
    const cant = Number(compraCantidad);
    if (!(cant > 0) || guardandoCompra) return;
    setGuardandoCompra(true);
    await fetch(`/api/inventario/${item.id}/movimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "compra", cantidad: cant, costo: compraCosto || null, proveedor: compraProveedor || null }),
    });
    setGuardandoCompra(false);
    setCompraId(null);
    if (historialId === item.id) await verHistorial(item, true);
    await cargar();
  }

  async function verHistorial(item: InventarioItem, forzar = false) {
    if (historialId === item.id && !forzar) {
      setHistorialId(null);
      return;
    }
    setHistorialId(item.id);
    setMovimientos([]);
    const res = await fetch(`/api/inventario/${item.id}/movimientos`);
    const data = await res.json().catch(() => ({}));
    setMovimientos(data.movimientos ?? []);
  }

  async function compartirLista(lista: InventarioItem[]) {
    const texto =
      "Lista de compras del consultorio:\n" +
      lista.map((i) => `• ${i.nombre}: ${sugerido(i)} ${i.unidad ?? ""}${i.proveedor ? ` (${i.proveedor})` : ""}`.trim()).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ text: texto });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      setListaCopiada(true);
      setTimeout(() => setListaCopiada(false), 2000);
    } catch {}
  }

  async function cargar() {
    try {
      const res = await fetch("/api/inventario");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `error ${res.status}`);
      setItems(data.inventario ?? []);
      setError(null);
    } catch (err) {
      setError(`No se pudo cargar el inventario: ${err instanceof Error ? err.message : "error desconocido"}`);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function resetForm() {
    setNombre("");
    setCantidad("");
    setUnidad("");
    setCantidadMinima("");
    setNotas("");
    setFormAbierto(false);
  }

  async function crearItem() {
    if (!nombre.trim() || guardando) return;
    setGuardando(true);
    await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        cantidad: cantidad || 0,
        unidad: unidad || null,
        cantidad_minima: cantidadMinima || null,
        notas: notas || null,
      }),
    });
    resetForm();
    setGuardando(false);
    await cargar();
  }

  async function ajustarCantidad(item: InventarioItem, delta: number) {
    if (ajustandoId) return;
    setAjustandoId(item.id);
    await fetch(`/api/inventario/${item.id}/movimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta < 0 ? { tipo: "uso", cantidad: -delta } : { tipo: "ajuste", cantidad: delta }),
    });
    if (historialId === item.id) await verHistorial(item, true);
    setAjustandoId(null);
    await cargar();
  }

  function abrirEdicion(item: InventarioItem) {
    setEditandoId(item.id);
    setEditNombre(item.nombre);
    setEditUnidad(item.unidad ?? "");
    setEditCantidadMinima(item.cantidad_minima != null ? String(item.cantidad_minima) : "");
    setEditNotas(item.notas ?? "");
  }

  async function guardarEdicion() {
    if (!editandoId || !editNombre.trim() || guardandoEdicion) return;
    setGuardandoEdicion(true);
    await fetch(`/api/inventario/${editandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editNombre,
        unidad: editUnidad || null,
        cantidad_minima: editCantidadMinima || null,
        notas: editNotas || null,
      }),
    });
    setEditandoId(null);
    setGuardandoEdicion(false);
    await cargar();
  }

  async function eliminarItem(item: InventarioItem) {
    const ok = window.confirm(`¿Eliminar "${item.nombre}" del inventario? Esto no se puede recuperar.`);
    if (!ok) return;
    await fetch(`/api/inventario/${item.id}`, { method: "DELETE" });
    await cargar();
  }

  const filtrados = (items ?? []).filter((i) => i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  return (
    <div className="mx-4 mt-2 space-y-3 pb-6">
      {error && (
        <div className="rounded-2xl border border-[#EABDB0] bg-[#F7E5E0] px-4 py-3 text-[13px] text-[#B0503A]">
          {error}
        </div>
      )}

      <div className="md:flex md:items-center md:gap-3">
        <div className="relative md:flex-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a49c8a]" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar insumo…"
            className="w-full rounded-full border border-[#EFE9DC] bg-white py-2.5 pl-10 pr-4 text-sm text-[#2b2118] outline-none focus:border-[#803449]"
          />
        </div>

        {!formAbierto && (
          <button
            onClick={() => setFormAbierto(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full btn-vino py-3 text-[14px] font-semibold text-white md:mt-0 md:w-auto md:shrink-0 md:px-8"
          >
            <Plus size={15} /> Nuevo insumo
          </button>
        )}
      </div>

      {formAbierto && (
        <div className="space-y-2 rounded-3xl border border-[#EFE9DC] bg-white/70 p-4 shadow-sm md:max-w-md">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del insumo *"
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Cantidad inicial"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              placeholder="Unidad (cajas, piezas…)"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
            />
          </div>
          <input
            type="number"
            min="0"
            value={cantidadMinima}
            onChange={(e) => setCantidadMinima(e.target.value)}
            placeholder="Avisar cuando queden menos de… (opcional)"
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
          />
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={crearItem}
              disabled={!nombre.trim() || guardando}
              className="flex-1 rounded-full btn-vino py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Agregar"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-full border border-[#EFE9DC] px-4 py-2.5 text-[13px] font-medium text-[#8a8272]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(() => {
        const lista = (items ?? []).filter((i) => i.cantidad_minima != null && i.cantidad <= i.cantidad_minima);
        if (lista.length === 0) return null;
        return (
          <div className="rounded-3xl border border-[#EABDB0] bg-[#FBEAE8] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8f3b28]">
                <ShoppingCart size={13} /> Lista de compras · {lista.length}
              </div>
              <button
                onClick={() => compartirLista(lista)}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#8f3b28]"
              >
                <Share2 size={12} /> {listaCopiada ? "Copiada ✓" : "Compartir"}
              </button>
            </div>
            <div className="space-y-1">
              {lista.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 text-[13px] text-[#8f3b28]">
                  <span className="min-w-0 truncate">
                    {i.nombre}
                    {i.proveedor && <span className="text-[11px] opacity-75"> · {i.proveedor}</span>}
                  </span>
                  <span className="shrink-0 font-semibold">
                    pedir {sugerido(i)} {i.unidad ?? ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {items === null ? (
        <Esqueleto />
      ) : filtrados.length === 0 ? (
        <p className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-5 text-sm text-[#8a8272]">
          {busqueda ? "Sin resultados." : "Aún no hay insumos registrados."}
        </p>
      ) : (
        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {filtrados.map((item) => {
            const bajoStock = item.cantidad_minima != null && item.cantidad <= item.cantidad_minima;
            return (
              <div key={item.id} className="rounded-2xl border border-[#EFE9DC] bg-white/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#2b2118]">{item.nombre}</div>
                    {item.notas && <div className="text-xs text-[#a49c8a]">{item.notas}</div>}
                    {item.ultima_compra && (
                      <div className="text-[11px] text-[#a49c8a]">
                        Última compra {fechaCorta(item.ultima_compra.fecha)} · {item.ultima_compra.cantidad} {item.unidad ?? ""}
                        {item.ultima_compra.costo != null ? ` · ${formatearDinero(item.ultima_compra.costo)}` : ""}
                        {item.ultima_compra.proveedor ? ` · ${item.ultima_compra.proveedor}` : ""}
                      </div>
                    )}
                  </div>
                  {bajoStock && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#F7E5E0] px-2.5 py-1 text-[11px] font-semibold text-[#B0503A]">
                      <AlertTriangle size={11} /> Bajo stock
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => ajustarCantidad(item, -1)}
                      disabled={ajustandoId === item.id || item.cantidad <= 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EFE9DC] bg-white text-[#2b2118] disabled:opacity-40"
                      aria-label="Restar"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[64px] text-center text-sm font-semibold text-[#2b2118]">
                      {item.cantidad} {item.unidad || ""}
                    </span>
                    <button
                      onClick={() => ajustarCantidad(item, 1)}
                      disabled={ajustandoId === item.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EFE9DC] bg-white text-[#2b2118] disabled:opacity-40"
                      aria-label="Sumar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirCompra(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EFE9DC] bg-white text-[#3F6B33]"
                      aria-label="Registrar compra"
                    >
                      <ShoppingCart size={13} />
                    </button>
                    <button
                      onClick={() => verHistorial(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EFE9DC] bg-white text-[#2b2118]"
                      aria-label="Historial"
                    >
                      <History size={13} />
                    </button>
                    <button
                      onClick={() => (editandoId === item.id ? setEditandoId(null) : abrirEdicion(item))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EFE9DC] bg-white text-[#2b2118]"
                      aria-label="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => eliminarItem(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EFE9DC] bg-white text-[#B0503A]"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {compraId === item.id && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-[#BFD8B4] bg-[#F3F8F0] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#3F6B33]">Registrar compra</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min="0" value={compraCantidad} onChange={(e) => setCompraCantidad(e.target.value)}
                        placeholder={`Cantidad (${item.unidad || "piezas"})`}
                        className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]" />
                      <input type="number" min="0" value={compraCosto} onChange={(e) => setCompraCosto(e.target.value)}
                        placeholder="Costo total $"
                        className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]" />
                    </div>
                    <input value={compraProveedor} onChange={(e) => setCompraProveedor(e.target.value)} placeholder="Proveedor (opcional)"
                      className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#803449]" />
                    <div className="flex gap-2">
                      <button onClick={() => registrarCompra(item)} disabled={!(Number(compraCantidad) > 0) || guardandoCompra}
                        className="flex-1 rounded-full btn-vino py-2 text-[13px] font-semibold text-white disabled:opacity-50">
                        {guardandoCompra ? "Guardando…" : "Sumar al inventario"}
                      </button>
                      <button onClick={() => setCompraId(null)} className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {historialId === item.id && (
                  <div className="mt-3 rounded-2xl border border-[#EFE9DC] bg-white p-3">
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#8a8272]">Movimientos</div>
                    {movimientos.length === 0 ? (
                      <p className="text-xs text-[#a49c8a]">Sin movimientos registrados.</p>
                    ) : (
                      movimientos.map((m) => (
                        <div key={m.id} className="flex justify-between gap-2 border-t border-[#F1ECE0] py-1.5 text-[12px] first:border-t-0">
                          <span className="min-w-0 truncate text-[#2b2118]">
                            {fechaCorta(m.creado_en)} · {m.tipo === "compra" ? "Compra" : m.tipo === "uso" ? "Uso" : "Ajuste"}
                            {m.proveedor ? ` · ${m.proveedor}` : ""}
                            {m.creado_por_nombre ? <span className="text-[#a49c8a]"> · {m.creado_por_nombre}</span> : null}
                          </span>
                          <span className={`shrink-0 font-semibold ${m.tipo === "uso" ? "text-[#B0503A]" : "text-[#3F6B33]"}`}>
                            {m.tipo === "uso" ? "−" : "+"}
                            {Math.abs(m.cantidad)}
                            {m.costo != null ? ` · ${formatearDinero(m.costo)}` : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {editandoId === item.id && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editUnidad}
                        onChange={(e) => setEditUnidad(e.target.value)}
                        placeholder="Unidad"
                        className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
                      />
                      <input
                        type="number"
                        min="0"
                        value={editCantidadMinima}
                        onChange={(e) => setEditCantidadMinima(e.target.value)}
                        placeholder="Mínimo para avisar"
                        className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
                      />
                    </div>
                    <textarea
                      value={editNotas}
                      onChange={(e) => setEditNotas(e.target.value)}
                      placeholder="Notas"
                      rows={2}
                      className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#803449]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={guardarEdicion}
                        disabled={!editNombre.trim() || guardandoEdicion}
                        className="flex-1 rounded-full btn-vino py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                      >
                        {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="rounded-full border border-[#EFE9DC] px-4 py-2 text-[13px] font-medium text-[#8a8272]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
