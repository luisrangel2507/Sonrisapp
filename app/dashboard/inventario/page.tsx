"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Pencil, Trash2, AlertTriangle, Search } from "lucide-react";
import type { InventarioItem } from "@/lib/types";

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
    const nueva = Math.max(0, item.cantidad + delta);
    setAjustandoId(item.id);
    await fetch(`/api/inventario/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad: nueva }),
    });
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
            className="w-full rounded-full border border-[#EFE9DC] bg-white py-2.5 pl-10 pr-4 text-sm text-[#2b2118] outline-none focus:border-[#C96F3B]"
          />
        </div>

        {!formAbierto && (
          <button
            onClick={() => setFormAbierto(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b2118] py-3 text-[14px] font-semibold text-white md:mt-0 md:w-auto md:shrink-0 md:px-8"
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
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Cantidad inicial"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              placeholder="Unidad (cajas, piezas…)"
              className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
            />
          </div>
          <input
            type="number"
            min="0"
            value={cantidadMinima}
            onChange={(e) => setCantidadMinima(e.target.value)}
            placeholder="Avisar cuando queden menos de… (opcional)"
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
          />
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className="w-full rounded-xl border border-[#EFE9DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={crearItem}
              disabled={!nombre.trim() || guardando}
              className="flex-1 rounded-full bg-[#2b2118] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
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

      {items === null ? (
        <p className="text-sm text-[#8a8272]">Cargando…</p>
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

                {editandoId === item.id && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-[#EFE9DC] bg-white p-3">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editUnidad}
                        onChange={(e) => setEditUnidad(e.target.value)}
                        placeholder="Unidad"
                        className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                      />
                      <input
                        type="number"
                        min="0"
                        value={editCantidadMinima}
                        onChange={(e) => setEditCantidadMinima(e.target.value)}
                        placeholder="Mínimo para avisar"
                        className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                      />
                    </div>
                    <textarea
                      value={editNotas}
                      onChange={(e) => setEditNotas(e.target.value)}
                      placeholder="Notas"
                      rows={2}
                      className="w-full rounded-xl border border-[#EFE9DC] px-3 py-2 text-sm outline-none focus:border-[#C96F3B]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={guardarEdicion}
                        disabled={!editNombre.trim() || guardandoEdicion}
                        className="flex-1 rounded-full bg-[#2b2118] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
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
