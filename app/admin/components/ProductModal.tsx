import { useState } from "react";
import type { Product } from "./ProductListModal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: {
      name: string;
      price: number;
      stock: number;
      cost: number;
      margin: number;
      costoOriginalTotal: number;
      unidadesCompradas: number;
      precioCompraUnitaria: number;
      plantasPorMaceta: number;
    },
    idFirebase?: string,
  ) => Promise<void>;
  isSaving: boolean;
  editingProduct?: Product | null | any;
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
  });

  // 1. Cálculos de Costo y Totales
  const unidades = Number(form.unidadesCompradas) || 1;
  const precioUnitarioCompra = Number(form.unitCost) || 0;

  // Multiplicación automática del Total
  const costoCompraTotal = unidades * precioUnitarioCompra;

  // Evitamos dividir por cero
  const divisorPlantas = Number(form.plantsPerPot) || 1;

  // Calculamos el costo de 1 sola planta final
  const totalPlantasExtraidas = unidades * divisorPlantas;
  const costoTotalUnitario =
    totalPlantasExtraidas > 0 ? costoCompraTotal / totalPlantasExtraidas : 0;

  // 2. Cálculos de Rentabilidad
  const precioVenta = Number(form.price) || 0;
  const gananciaNeta = precioVenta - costoTotalUnitario;

  const margenPorcentaje =
    costoTotalUnitario > 0
      ? ((gananciaNeta / costoTotalUnitario) * 100).toFixed(1)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(
      {
        name: form.name,
        price: precioVenta,
        stock: Number(form.stock),
        cost: costoTotalUnitario, // Guardamos el costo unitario final para la rentabilidad principal
        margin: Number(margenPorcentaje),
        costoOriginalTotal: costoCompraTotal,
        unidadesCompradas: unidades,
        precioCompraUnitaria: precioUnitarioCompra,
        plantasPorMaceta: divisorPlantas,
      },
      editingProduct?.idFirebase,
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide">
        <h2 className="text-xl font-bold mb-5 text-white">
          {editingProduct ? "Editar Producto ✏️" : "Nuevo Producto ✨"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider px-1">
              Nombre de la Planta
            </label>
            <input
              autoFocus
              required
              placeholder="Ej: Monstera Deliciosa"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Fila 1: Unidades y Precio Unitario */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider px-1">
                Unid. Compradas
              </label>
              <input
                required
                type="number"
                min="1"
                placeholder="Cant."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors text-center font-bold"
                value={form.unidadesCompradas}
                onChange={(e) =>
                  setForm({ ...form, unidadesCompradas: e.target.value })
                }
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider px-1">
                Precio Compra Unit.
              </label>
              <input
                required
                type="number"
                placeholder="Valor $"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              />
            </div>
          </div>

          {/* Fila 2: Total Compra (Auto) y División */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider px-1">
                Total Compra (Auto)
              </label>
              <input
                disabled
                type="text"
                className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 outline-none font-medium cursor-not-allowed"
                value={`$${costoCompraTotal.toLocaleString("es-CL")}`}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider px-1 truncate">
                Plantas por maceta
              </label>
              <input
                required
                type="number"
                min="1"
                placeholder="Cant."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors text-center font-bold"
                value={form.plantsPerPot}
                onChange={(e) =>
                  setForm({ ...form, plantsPerPot: e.target.value })
                }
              />
            </div>
          </div>

          {/* Fila 3: Precio Venta y Stock Disponible */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider px-1">
                Precio Venta
              </label>
              <input
                required
                type="number"
                placeholder="Público $"
                className="w-full p-3 bg-slate-800 border-emerald-900 rounded-xl text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-colors"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider px-1">
                Stock Disponible
              </label>
              <input
                required
                type="number"
                placeholder="Cant."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors text-center font-bold"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
          </div>

          {/* Tarjeta de Rentabilidad Dinámica (Ancho completo) */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="block text-xs font-bold text-slate-400 uppercase">
                Costo Real Unitario
              </span>
              <span className="text-sm text-slate-300 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                ${Math.round(costoTotalUnitario).toLocaleString("es-CL")}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-700/50 pt-2">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">
                  Ganancia Neta
                </span>
                <span
                  className={`font-black text-lg ${gananciaNeta >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  ${Math.round(gananciaNeta).toLocaleString("es-CL")}
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
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

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving
                ? "Guardando..."
                : editingProduct
                  ? "Actualizar"
                  : "Crear Planta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
