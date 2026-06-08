"use client";

import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig";
import { X, ImagePlus } from "lucide-react";
import type { Product } from "./ProductListModal";

const CATEGORIAS_DISPONIBLES = [
  "INTERIOR",
  "EXTERIOR",
  "SUCULENTAS",
  "CACTUS",
  "COLECCION",
  "IMPLEMENTOS",
];

type Dificultad = "facil" | "media" | "dificil";
type AptaMascotas = "apta" | "moderada" | "toxica" | "sin-info";

type SavePayload = {
  name: string;
  price: number;
  stock: number;
  cost: number;
  margin: number;
  costoOriginalTotal: number;
  unidadesCompradas: number;
  precioCompraUnitaria: number;
  plantasPorMaceta: number;
  descripcion: string;
  categorias: string[];
  imagenUrl: string;
  imagenPosition: string;
  precioTipo: string;
  dificultad: Dificultad;
  aptaMascotas: AptaMascotas;
};

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: SavePayload, idFirebase?: string) => Promise<void>;
  readonly isSaving: boolean;
  readonly editingProduct?: Product | null;
};

export default function ProductModal({
  onClose,
  onSave,
  isSaving,
  editingProduct,
}: Props) {
  const [form, setForm] = useState({
    name: editingProduct?.name || "",
    unidadesCompradas: editingProduct?.unidadesCompradas
      ? String(editingProduct.unidadesCompradas)
      : "1",
    unitCost: editingProduct?.precioCompraUnitaria
      ? String(editingProduct.precioCompraUnitaria)
      : "",
    plantsPerPot: editingProduct?.plantasPorMaceta
      ? String(editingProduct.plantasPorMaceta)
      : "1",
    price: editingProduct?.price ? String(editingProduct.price) : "",
    stock: editingProduct?.stock ? String(editingProduct.stock) : "",
    descripcion: editingProduct?.descripcion || "",
    categorias:
      editingProduct?.categorias && editingProduct.categorias.length > 0
        ? editingProduct.categorias
        : (["INTERIOR"] as string[]),
    imagenUrl: editingProduct?.imagenUrl || "",
    imagenPosition: editingProduct?.imagenPosition || "50% 50%",
    precioTipo: editingProduct?.precioTipo || "fijo",
    dificultad: (editingProduct?.dificultad || "media") as Dificultad,
    aptaMascotas: (editingProduct?.aptaMascotas || "sin-info") as AptaMascotas,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const unidades = Number(form.unidadesCompradas) || 1;
  const precioUnitarioCompra = Number(form.unitCost) || 0;
  const costoCompraTotal = unidades * precioUnitarioCompra;
  const divisorPlantas = Number(form.plantsPerPot) || 1;
  const totalPlantasExtraidas = unidades * divisorPlantas;
  const costoTotalUnitario =
    totalPlantasExtraidas > 0 ? costoCompraTotal / totalPlantasExtraidas : 0;

  const precioVenta = Number(form.price) || 0;
  const gananciaNeta = precioVenta - costoTotalUnitario;
  const margenPorcentaje =
    costoTotalUnitario > 0
      ? ((gananciaNeta / costoTotalUnitario) * 100).toFixed(1)
      : 0;

  const toggleCategoria = (cat: string) => {
    setForm((prev) => {
      const yaEsta = prev.categorias.includes(cat);
      const next = yaEsta
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat];
      return { ...prev, categorias: next.length > 0 ? next : [cat] };
    });
  };

  const convertToWebP = (file: File, maxWidth = 800): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear el contexto del canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Error al convertir a WebP"));
          },
          "image/webp",
          0.8,
        );
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = URL.createObjectURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const safeName = form.name
        ? form.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, "-")
        : "planta";
      const fileName = `${safeName}-${Date.now()}.webp`;
      const webpBlob = await convertToWebP(file);
      const storageRef = ref(storage, `plantas/${fileName}`);
      await uploadBytes(storageRef, webpBlob, { contentType: "image/webp" });
      const downloadUrl = await getDownloadURL(storageRef);
      setForm((prev) => ({ ...prev, imagenUrl: downloadUrl, imagenPosition: "50% 50%" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`Error al subir: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const parsePosition = (pos: string) => {
    const parts = pos.split(" ");
    return {
      x: Number.parseFloat(parts[0]) || 50,
      y: Number.parseFloat(parts[1]) || 50,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!frameRef.current) return;
    isDraggingRef.current = true;
    frameRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !frameRef.current || !imgNaturalSize) return;
    const frame = frameRef.current.getBoundingClientRect();
    const frameRatio = frame.width / frame.height;
    const imgRatio = imgNaturalSize.w / imgNaturalSize.h;
    const { x, y } = parsePosition(form.imagenPosition);
    let newX = x;
    let newY = y;
    if (imgRatio > frameRatio) {
      const scaledW = frame.height * imgRatio;
      const overflow = scaledW - frame.width;
      if (overflow > 0) {
        const delta = (e.movementX / overflow) * 100;
        newX = Math.max(0, Math.min(100, x - delta));
      }
    } else if (imgRatio < frameRatio) {
      const scaledH = frame.width / imgRatio;
      const overflow = scaledH - frame.height;
      if (overflow > 0) {
        const delta = (e.movementY / overflow) * 100;
        newY = Math.max(0, Math.min(100, y - delta));
      }
    }
    setForm((prev) => ({ ...prev, imagenPosition: `${newX}% ${newY}%` }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    if (frameRef.current?.hasPointerCapture(e.pointerId)) {
      frameRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (form.categorias.length === 0) {
      alert("Debes elegir al menos una categoría.");
      return;
    }
    await onSave(
      {
        name: form.name,
        price: precioVenta,
        stock: Number(form.stock),
        cost: costoTotalUnitario,
        margin: Number(margenPorcentaje),
        costoOriginalTotal: costoCompraTotal,
        unidadesCompradas: unidades,
        precioCompraUnitaria: precioUnitarioCompra,
        plantasPorMaceta: divisorPlantas,
        descripcion: form.descripcion,
        categorias: form.categorias,
        imagenUrl: form.imagenUrl,
        imagenPosition: form.imagenPosition,
        precioTipo: form.precioTipo,
        dificultad: form.dificultad,
        aptaMascotas: form.aptaMascotas,
      },
      editingProduct?.idFirebase,
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl border border-stone-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 pt-6 pb-3 border-b border-stone-200 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-stone-800">
            {editingProduct ? "Editar Producto ✏️" : "Nuevo Producto ✨"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider px-1">
              Nombre de la Planta
            </label>
            <input
              autoFocus
              required
              placeholder="Ej: Monstera Deliciosa"
              className="w-full p-3 bg-milokira-crema border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-emerald-500 transition-colors"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Bloque principal: negocio/rentabilidad */}
          <div className="bg-linear-to-br from-indigo-950/70 to-indigo-900/30 border border-indigo-500/30 rounded-2xl p-4 space-y-4 shadow-lg shadow-indigo-950/20">
            <div className="flex items-center gap-2 pb-1 border-b border-indigo-500/20">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-indigo-300">
                📊 Datos del negocio
              </span>
            </div>

            {/* Fila: Unidades + Precio Unitario */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-300/80 mb-1 uppercase tracking-wider px-1">
                  Unid. Compradas
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-indigo-500 transition-colors text-center font-bold"
                  value={form.unidadesCompradas}
                  onChange={(e) => setForm({ ...form, unidadesCompradas: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-300/80 mb-1 uppercase tracking-wider px-1">
                  Precio Compra Unit.
                </label>
                <input
                  required
                  type="number"
                  placeholder="$"
                  className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-indigo-500 transition-colors"
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                />
              </div>
            </div>

            {/* Fila: Total Compra (Auto) + Plantas por maceta */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-300/80 mb-1 uppercase tracking-wider px-1">
                  Total Compra (Auto)
                </label>
                <input
                  disabled
                  type="text"
                  className="w-full p-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-500 outline-none font-medium cursor-not-allowed"
                  value={`$${costoCompraTotal.toLocaleString("es-CL")}`}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-300/80 mb-1 uppercase tracking-wider px-1 truncate">
                  Plantas por maceta
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-indigo-500 transition-colors text-center font-bold"
                  value={form.plantsPerPot}
                  onChange={(e) => setForm({ ...form, plantsPerPot: e.target.value })}
                />
              </div>
            </div>

            {/* Fila: Precio Venta + Stock */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-300/80 mb-1 uppercase tracking-wider px-1">
                  Precio Venta
                </label>
                <input
                  required
                  type="number"
                  placeholder="$"
                  className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-bold outline-none focus:border-emerald-500 transition-colors"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-300/80 mb-1 uppercase tracking-wider px-1">
                  Stock Disponible
                </label>
                <input
                  required
                  type="number"
                  placeholder="Cant."
                  className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-indigo-500 transition-colors text-center font-bold"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>

            {/* Rentabilidad */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
              <div className="flex justify-between items-center mb-2">
                <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Costo Real Unitario
                </span>
                <span className="text-sm text-stone-700 font-bold bg-white px-3 py-1 rounded-lg border border-stone-200">
                  ${Math.round(costoTotalUnitario).toLocaleString("es-CL")}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-700/50 pt-2">
                <div>
                  <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Ganancia Neta
                  </span>
                  <span
                    className={`font-black text-lg ${gananciaNeta >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    ${Math.round(gananciaNeta).toLocaleString("es-CL")}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5 tracking-wider">
                    Margen
                  </span>
                  <span
                    className={`text-sm px-2.5 py-1 rounded-md font-bold ${gananciaNeta >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                  >
                    {margenPorcentaje}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Separador visual */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[10px] font-black uppercase tracking-[2px] text-stone-500">
              🌿 Datos del catálogo
            </span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Imagen + preview con drag */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider px-1">
              Imagen (opcional)
            </label>
            <div className="flex gap-3 items-start">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-milokira-crema border border-dashed border-stone-300 rounded-xl text-stone-600 text-xs font-bold cursor-pointer hover:bg-stone-100 hover:border-emerald-500/50 hover:text-emerald-700 transition-colors">
                <ImagePlus size={14} />
                {isUploading ? "Subiendo..." : form.imagenUrl ? "Cambiar" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {form.imagenUrl && (
                <div
                  ref={frameRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="relative w-20 aspect-[4/5] rounded-lg overflow-hidden border border-stone-200 shadow-sm cursor-grab active:cursor-grabbing select-none touch-none bg-stone-100"
                  title="Arrastra para reposicionar"
                >
                  <img
                    src={form.imagenUrl}
                    alt="Preview"
                    draggable={false}
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      setImgNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                    }}
                    style={{ objectPosition: form.imagenPosition }}
                    className="object-cover w-full h-full pointer-events-none"
                  />
                  <button
                    type="button"
                    onPointerDown={(ev) => ev.stopPropagation()}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, imagenUrl: "", imagenPosition: "50% 50%" }))
                    }
                    className="absolute top-0.5 right-0.5 bg-rose-500 text-white p-0.5 rounded-full shadow-md hover:bg-rose-600 transition-colors z-10"
                    title="Quitar"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider px-1">
              Descripción (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Características, medidas, cuidados..."
              className="w-full p-3 bg-milokira-crema border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-emerald-500 transition-colors resize-none"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          {/* Categorías */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider px-1">
              Categorías <span className="text-rose-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_DISPONIBLES.map((cat) => {
                const isSelected = form.categorias.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoria(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-milokira-crema border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {cat === "COLECCION"
                      ? "Colección"
                      : cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de Precio */}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider px-1">
              Tipo de Precio
            </label>
            <select
              className="w-full p-3 bg-milokira-crema border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-emerald-500 transition-colors"
              value={form.precioTipo}
              onChange={(e) => setForm({ ...form, precioTipo: e.target.value })}
            >
              <option value="fijo">Fijo</option>
              <option value="desde">Desde</option>
              <option value="aprox">Aprox</option>
            </select>
          </div>

          {/* Dificultad de cuidado + Apta mascotas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider px-1">
                Dificultad
              </label>
              <select
                className="w-full p-3 bg-milokira-crema border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-emerald-500 transition-colors"
                value={form.dificultad}
                onChange={(e) =>
                  setForm({ ...form, dificultad: e.target.value as Dificultad })
                }
              >
                <option value="facil">💧 Fácil</option>
                <option value="media">💧💧 Media</option>
                <option value="dificil">💧💧💧 Difícil</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider px-1">
                Mascotas
              </label>
              <select
                className="w-full p-3 bg-milokira-crema border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 outline-none focus:border-emerald-500 transition-colors"
                value={form.aptaMascotas}
                onChange={(e) =>
                  setForm({
                    ...form,
                    aptaMascotas: e.target.value as AptaMascotas,
                  })
                }
              >
                <option value="sin-info">Sin info</option>
                <option value="apta">🐾 Apta</option>
                <option value="moderada">🐾 Riesgo moderado</option>
                <option value="toxica">🐾 Tóxica</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : editingProduct ? "Actualizar" : "Crear Planta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
