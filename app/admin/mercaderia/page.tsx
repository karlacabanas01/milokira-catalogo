"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  slugify,
  redondearComercial,
  parsePastedList as parsePastedListPure,
} from "./helpers";
import {
  ArrowLeft,
  Plus,
  Truck,
  Eye,
  X,
  Trash2,
  CheckCircle,
  PackageCheck,
  PackagePlus,
  ClipboardPaste,
} from "lucide-react";

const IVA_DEFAULT = 19;
const MARGEN_DEFAULT = 100;

type CompraItem = {
  id: string;
  nombre: string;
  unidades: number;
  precioUnitNeto: number;
  plantasPorMaceta: number;
  ingresada: boolean;
  precioSugeridoOverride?: number;
};

type Compra = {
  idFirebase: string;
  proveedor: string;
  fecha: string;
  status: "pending" | "ingresada";
  ivaPorcentaje: number;
  despachoTotal: number;
  margenSugerido: number;
  items: CompraItem[];
  subtotalNeto: number;
  totalIva: number;
  totalConIva: number;
  totalConDespacho: number;
  gastoId?: string;
};

const newId = () => `i-${Math.random().toString(36).slice(2, 10)}`;

const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);

export default function MercaderiaPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [detalleCompra, setDetalleCompra] = useState<Compra | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchCompras = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "Compras"),
          orderBy("fecha", "desc"),
        );
        const snap = await getDocs(q);
        const lista: Compra[] = snap.docs.map((d) => ({
          idFirebase: d.id,
          ...(d.data() as Omit<Compra, "idFirebase">),
        }));
        setCompras(lista);
      } catch (err) {
        console.error("Error cargando compras:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompras();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleBorrarCompra = async (c: Compra, e: React.MouseEvent) => {
    e.stopPropagation();
    const algunaIngresada = c.items?.some((i) => i.ingresada);
    const msg = algunaIngresada
      ? `Esta compra ya tiene plantas ingresadas al inventario.\n¿Borrar igual el registro de "${c.proveedor || "compra sin proveedor"}"?\n\nLas plantas en inventario NO se eliminarán.`
      : `¿Borrar la compra de "${c.proveedor || "sin proveedor"}" del ${new Date(c.fecha).toLocaleDateString("es-CL")}?\n\nEsta acción no se puede deshacer.`;
    if (!window.confirm(msg)) return;
    try {
      await deleteDoc(doc(db, "Compras", c.idFirebase));
      refresh();
    } catch (err) {
      console.error(err);
      window.alert("Error al borrar la compra.");
    }
  };

  return (
    <main className="relative min-h-screen bg-milokira-crema patron-muro text-stone-800 pb-20 sm:pb-32 font-sans overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-125 h-125 bg-milokira-lila/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-125 h-125 bg-milokira-verde/20 rounded-full blur-3xl" />
      </div>

      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-2xl border-b border-milokira-lila/30">
        <div className="px-4 sm:px-8 py-4 w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/admin" className="shrink-0">
            <button className="group flex items-center gap-2 text-stone-500 hover:text-milokira-verde bg-white hover:bg-milokira-verde/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm font-semibold border border-stone-200 hover:border-milokira-verde/40">
              <ArrowLeft size={16} />
              <span className="hidden xs:inline">Admin</span>
            </button>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-linear-to-br from-milokira-verde to-milokira-verde/70 flex items-center justify-center shadow-md shadow-milokira-verde/30 shrink-0">
              <Truck size={18} className="text-white sm:w-5 sm:h-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black tracking-tight truncate text-stone-800">
                Ingreso de mercadería
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-500 font-medium hidden sm:block">
                Compras a proveedor con cálculo de IVA y despacho
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-stone-200">
            <PackagePlus size={14} className="text-milokira-verde" />
            <span className="text-xs text-stone-600 font-semibold">
              {compras.length} {compras.length === 1 ? "compra" : "compras"}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-5">
        {/* Botón nueva */}
        <button
          type="button"
          onClick={() => setIsNewOpen(true)}
          className="w-full bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-white py-3.5 sm:py-4 rounded-2xl shadow-md shadow-amber-300/40 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 font-black tracking-wide text-sm sm:text-base"
        >
          <Plus size={18} strokeWidth={3} />
          Nueva compra
        </button>

        {/* Tabla histórica */}
        <div>
          <h2 className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 px-1">
            Historial
          </h2>

          {loading ? (
            <div className="text-center py-10 text-stone-500 text-sm">
              Cargando compras…
            </div>
          ) : compras.length === 0 ? (
            <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-amber-300/30 rounded-full blur-2xl" />
                <div className="relative bg-amber-50 p-5 rounded-2xl border border-amber-200">
                  <Truck size={32} className="text-amber-600" strokeWidth={2} />
                </div>
              </div>
              <h3 className="text-stone-800 text-base sm:text-lg font-bold mb-1.5">
                Sin compras todavía
              </h3>
              <p className="text-stone-500 text-xs sm:text-sm font-medium max-w-xs">
                Registra tu primera compra al proveedor para que el sistema te
                calcule IVA, despacho y costo real por planta.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              {/* Desktop table */}
              <table className="w-full text-sm hidden sm:table">
                <thead className="bg-milokira-crema/50">
                  <tr className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Proveedor</th>
                    <th className="text-center px-4 py-3">Items</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {compras.map((c) => (
                    <tr key={c.idFirebase} className="hover:bg-milokira-crema/30 transition-colors">
                      <td className="px-4 py-3 text-stone-700 text-xs">
                        {new Date(c.fecha).toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-4 py-3 font-bold text-stone-800">
                        {c.proveedor || "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-stone-700">
                        {c.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-stone-800">
                        {formatCLP(c.totalConDespacho)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <StatusBadge status={c.status} />
                          {c.gastoId && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[9px] font-black uppercase tracking-wide"
                              title="Gasto registrado"
                            >
                              $ Gasto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setDetalleCompra(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-milokira-lila/20 hover:bg-milokira-lila/40 text-stone-700 border border-milokira-lila text-xs font-bold transition-all active:scale-95"
                          >
                            <Eye size={12} />
                            Ver
                          </button>
                          <button
                            onClick={(e) => handleBorrarCompra(c, e)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all active:scale-95"
                            aria-label="Borrar compra"
                          >
                            <Trash2 size={12} />
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <ul className="sm:hidden divide-y divide-stone-100">
                {compras.map((c) => (
                  <li key={c.idFirebase} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-stone-500">
                          {new Date(c.fecha).toLocaleDateString("es-CL")}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="font-bold text-stone-800 text-sm truncate">
                        {c.proveedor || "Sin proveedor"}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {c.items?.length || 0} items · {formatCLP(c.totalConDespacho)}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col gap-1.5">
                      <button
                        onClick={() => setDetalleCompra(c)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-milokira-lila/20 hover:bg-milokira-lila/40 text-stone-700 border border-milokira-lila text-[11px] font-bold"
                      >
                        <Eye size={11} />
                        Ver
                      </button>
                      <button
                        onClick={(e) => handleBorrarCompra(c, e)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-bold"
                        aria-label="Borrar compra"
                      >
                        <Trash2 size={11} />
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {isNewOpen && (
        <NuevaCompraModal
          onClose={() => setIsNewOpen(false)}
          onSaved={() => {
            setIsNewOpen(false);
            refresh();
          }}
        />
      )}

      {detalleCompra && (
        <DetalleCompraModal
          compra={detalleCompra}
          onClose={() => setDetalleCompra(null)}
          onChange={() => {
            refresh();
            setDetalleCompra(null);
          }}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }: { readonly status: "pending" | "ingresada" }) {
  if (status === "ingresada") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-milokira-verde/15 text-milokira-verde border border-milokira-verde/40 text-[10px] font-black uppercase tracking-wide">
        <CheckCircle size={10} />
        Ingresada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-black uppercase tracking-wide">
      Pendiente
    </span>
  );
}

// =========================================================================
// MODAL: NUEVA COMPRA
// =========================================================================
function NuevaCompraModal({
  onClose,
  onSaved,
}: {
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const [proveedor, setProveedor] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [iva, setIva] = useState(IVA_DEFAULT);
  const [despachoTotal, setDespachoTotal] = useState("");
  const [margenSugerido, setMargenSugerido] = useState(MARGEN_DEFAULT);

  const [items, setItems] = useState<CompraItem[]>([
    {
      id: newId(),
      nombre: "",
      unidades: 1,
      precioUnitNeto: 0,
      plantasPorMaceta: 1,
      ingresada: false,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteParsed, setPasteParsed] = useState<CompraItem[]>([]);
  const [pasteError, setPasteError] = useState("");

  const parsePastedList = (text: string): CompraItem[] =>
    parsePastedListPure(text).map((p) => ({
      id: newId(),
      nombre: p.nombre,
      unidades: p.unidades,
      precioUnitNeto: p.precioUnitNeto,
      plantasPorMaceta: p.plantasPorMaceta,
      ingresada: false,
    }));

  const openPaste = () => {
    setPasteText("");
    setPasteParsed([]);
    setPasteError("");
    setIsPasteOpen(true);
  };

  const handleParsePaste = () => {
    setPasteError("");
    const parsed = parsePastedList(pasteText);
    if (parsed.length === 0) {
      setPasteError(
        "No se detectó ninguna línea válida. Formato esperado: '4x NOMBRE - $1,650/unid'",
      );
      setPasteParsed([]);
      return;
    }
    setPasteParsed(parsed);
  };

  const tieneItemsReales = () =>
    items.some((i) => i.nombre.trim() !== "" || i.precioUnitNeto > 0);

  const handleConfirmPaste = (modo: "agregar" | "reemplazar") => {
    if (pasteParsed.length === 0) return;
    if (modo === "reemplazar" || !tieneItemsReales()) {
      setItems(pasteParsed);
    } else {
      setItems((prev) => [...prev, ...pasteParsed]);
    }
    setIsPasteOpen(false);
    setPasteText("");
    setPasteParsed([]);
  };

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        nombre: "",
        unidades: 1,
        precioUnitNeto: 0,
        plantasPorMaceta: 1,
        ingresada: false,
      },
    ]);

  const removeItem = (id: string) =>
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((i) => i.id !== id),
    );

  const updateItem = <K extends keyof CompraItem>(
    id: string,
    key: K,
    value: CompraItem[K],
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)),
    );
  };

  // Cálculos
  const calc = useMemo(() => {
    const ivaFactor = 1 + iva / 100;
    const despacho = Number(despachoTotal) || 0;

    const itemsConTotales = items.map((i) => {
      const subtotalNeto = i.precioUnitNeto * i.unidades;
      return { ...i, subtotalNeto };
    });

    const subtotalNeto = itemsConTotales.reduce(
      (a, b) => a + b.subtotalNeto,
      0,
    );
    const totalIva = subtotalNeto * (iva / 100);
    const totalConIva = subtotalNeto + totalIva;
    const totalConDespacho = totalConIva + despacho;

    const unidadesTotales = items.reduce((a, b) => a + b.unidades, 0);
    const despachoPorUnidad =
      unidadesTotales > 0 ? despacho / unidadesTotales : 0;

    // Costo real por planta para cada item
    const itemsConCostoReal = items.map((i) => {
      const costoBrutoUnit = i.precioUnitNeto * ivaFactor + despachoPorUnidad;
      const plantasExtraidas = Math.max(1, i.plantasPorMaceta);
      const costoRealPorPlanta = costoBrutoUnit / plantasExtraidas;
      const precioSugerido =
        costoRealPorPlanta * (1 + margenSugerido / 100);
      return { ...i, costoRealPorPlanta, precioSugerido };
    });

    return {
      subtotalNeto,
      totalIva,
      totalConIva,
      totalConDespacho,
      despachoPorUnidad,
      itemsConCostoReal,
    };
  }, [items, iva, despachoTotal, margenSugerido]);

  const handleSave = async () => {
    const itemsValidos = items.filter((i) => i.nombre.trim() && i.unidades > 0);
    if (itemsValidos.length === 0) {
      setError("Agrega al menos una planta con nombre y cantidad.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "Compras"), {
        proveedor: proveedor.trim(),
        fecha: new Date(fecha).toISOString(),
        status: "pending",
        ivaPorcentaje: iva,
        despachoTotal: Number(despachoTotal) || 0,
        margenSugerido,
        items: itemsValidos.map((i) => ({
          ...i,
          nombre: i.nombre.trim(),
          ingresada: false,
        })),
        subtotalNeto: calc.subtotalNeto,
        totalIva: calc.totalIva,
        totalConIva: calc.totalConIva,
        totalConDespacho: calc.totalConDespacho,
      });
      onSaved();
    } catch (err) {
      console.error(err);
      setError("Error al guardar la compra.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-end sm:items-center justify-center sm:p-6 backdrop-blur-sm">
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-stone-200 shadow-2xl flex flex-col max-h-dvh sm:max-h-[90vh] h-dvh sm:h-auto overflow-hidden">
        <header className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-stone-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-300/40 shrink-0">
              <PackagePlus size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-stone-800 tracking-tight truncate">
                Nueva compra
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                {items.length} {items.length === 1 ? "planta" : "plantas"} · {formatCLP(calc.totalConDespacho)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4">
          {/* Datos generales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
                Proveedor (vivero)
              </label>
              <input
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Vivero Las Mariposas"
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-amber-400 transition-colors text-base placeholder:text-stone-400"
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-amber-400 transition-colors text-base"
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
                IVA %
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={iva}
                onChange={(e) =>
                  setIva(Number(e.target.value.replace(/\D/g, "")) || 0)
                }
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-amber-400 transition-colors text-base"
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
                Despacho total $
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={despachoTotal}
                onChange={(e) =>
                  setDespachoTotal(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Ej 8000"
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-amber-400 transition-colors text-base placeholder:text-stone-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
                Margen sugerido %
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={margenSugerido}
                onChange={(e) =>
                  setMargenSugerido(
                    Number(e.target.value.replace(/\D/g, "")) || 0,
                  )
                }
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-amber-400 transition-colors text-base"
              />
              <p className="text-[10px] text-stone-400 mt-1 ml-1">
                Solo orientativo, te muestra el precio sugerido por planta.
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs sm:text-sm text-amber-700 font-black uppercase tracking-widest">
                Plantas compradas
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openPaste}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-milokira-lila/40 hover:bg-milokira-lila/60 text-stone-700 border border-milokira-lila text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  <ClipboardPaste size={11} strokeWidth={2.5} />
                  Pegar lista
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  <Plus size={11} strokeWidth={3} />
                  Agregar
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1.5">
              {items.map((it, idx) => {
                const calcItem = calc.itemsConCostoReal[idx];
                return (
                  <div
                    key={it.id}
                    className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden"
                  >
                    {/* Fila 1: número + nombre + borrar */}
                    <div className="flex items-center gap-2 px-2.5 py-2 bg-stone-50/80 border-b border-stone-100">
                      <span className="grid place-items-center h-5 min-w-5 px-1 rounded-md bg-amber-500 text-white text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        value={it.nombre}
                        onChange={(e) =>
                          updateItem(it.id, "nombre", e.target.value)
                        }
                        placeholder="Nombre de la planta"
                        className="flex-1 min-w-0 bg-transparent text-stone-800 font-bold outline-none text-sm placeholder:text-stone-400 placeholder:font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        disabled={items.length <= 1}
                        className="shrink-0 p-1.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Fila 2: campos compactos en línea */}
                    <div className="flex items-stretch divide-x divide-stone-100">
                      <label className="flex-1 flex flex-col px-2 py-1.5">
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                          Unid.
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={it.unidades || ""}
                          onChange={(e) =>
                            updateItem(
                              it.id,
                              "unidades",
                              Math.max(
                                1,
                                Number(e.target.value.replace(/\D/g, "")) || 0,
                              ),
                            )
                          }
                          className="w-full bg-transparent text-stone-800 font-bold outline-none text-sm"
                        />
                      </label>
                      <label className="flex-[1.4] flex flex-col px-2 py-1.5">
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                          Precio neto
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={it.precioUnitNeto || ""}
                          onChange={(e) =>
                            updateItem(
                              it.id,
                              "precioUnitNeto",
                              Number(e.target.value.replace(/\D/g, "")) || 0,
                            )
                          }
                          placeholder="$0"
                          className="w-full bg-transparent text-stone-800 font-bold outline-none text-sm placeholder:text-stone-300 placeholder:font-normal"
                        />
                      </label>
                      <label className="flex-1 flex flex-col px-2 py-1.5">
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                          Pl/mac
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={it.plantasPorMaceta || ""}
                          onChange={(e) =>
                            updateItem(
                              it.id,
                              "plantasPorMaceta",
                              Math.max(
                                1,
                                Number(e.target.value.replace(/\D/g, "")) || 0,
                              ),
                            )
                          }
                          className="w-full bg-transparent text-stone-800 font-bold outline-none text-sm"
                        />
                      </label>
                    </div>

                    {/* Fila 3: resultados en una sola línea */}
                    {calcItem && it.precioUnitNeto > 0 && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-stone-50/60 border-t border-stone-100 text-[11px]">
                        <span className="flex items-center gap-1 text-blue-700">
                          <span className="font-bold text-blue-500/80">
                            Costo:
                          </span>
                          <span className="font-mono font-black">
                            {formatCLP(
                              Math.round(calcItem.costoRealPorPlanta),
                            )}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-milokira-verde">
                          <span className="font-bold opacity-80">Sug:</span>
                          <span className="font-mono font-black">
                            {formatCLP(Math.round(calcItem.precioSugerido))}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        {/* Footer con totales */}
        <div
          className="relative z-10 shrink-0 border-t border-stone-100 bg-white/90 backdrop-blur-xl px-5 sm:px-7 py-4 space-y-3"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal neto</span>
              <span className="font-mono text-stone-700">
                {formatCLP(calc.subtotalNeto)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">IVA ({iva}%)</span>
              <span className="font-mono text-stone-700">
                {formatCLP(calc.totalIva)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Despacho</span>
              <span className="font-mono text-stone-700">
                {formatCLP(Number(despachoTotal) || 0)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1.5 border-t border-stone-200">
              <span className="text-stone-500 font-bold uppercase tracking-wide text-sm">
                Total
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600">
                {formatCLP(calc.totalConDespacho)}
              </span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 bg-milokira-verde hover:bg-milokira-verde/90 text-white font-black rounded-xl text-sm tracking-wide shadow-md shadow-milokira-verde/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isSaving ? "Guardando…" : "Guardar como pendiente"}
          </button>
        </div>
      </div>

      {isPasteOpen && (
        <div className="fixed inset-0 bg-stone-900/50 z-60 flex items-end sm:items-center justify-center sm:p-6 backdrop-blur-sm">
          <div className="relative bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-stone-200 shadow-2xl flex flex-col max-h-dvh sm:max-h-[90vh] h-dvh sm:h-auto overflow-hidden">
            <header className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-stone-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-milokira-lila to-purple-300 flex items-center justify-center shadow-md shrink-0">
                  <ClipboardPaste size={18} className="text-stone-700" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-stone-800 tracking-tight truncate">
                    Pegar lista de compra
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                    Formato: <span className="font-mono">4x NOMBRE - $1,650/unid</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasteOpen(false)}
                className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Pega aquí tu lista, una planta por línea. Ejemplo:\n\n4x ARR. HYPOESTE B20 (Cód: PHYPOESTE20) - $1,650/unid\n1x AMYDRIUM SILVER M12 - $6,500/unid`}
                rows={10}
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-milokira-verde transition-colors text-sm font-mono placeholder:text-stone-400 resize-none"
              />

              <button
                type="button"
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="w-full py-2.5 bg-milokira-lila/40 hover:bg-milokira-lila/60 text-stone-700 border border-milokira-lila font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Detectar items
              </button>

              {pasteError && (
                <p className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-3 py-2 rounded-lg">
                  {pasteError}
                </p>
              )}

              {pasteParsed.length > 0 && (
                <div className="bg-milokira-verde/5 border border-milokira-verde/30 rounded-2xl p-3">
                  <p className="text-[11px] font-black text-milokira-verde uppercase tracking-widest mb-2 px-1">
                    {pasteParsed.length}{" "}
                    {pasteParsed.length === 1 ? "planta detectada" : "plantas detectadas"}
                  </p>
                  <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {pasteParsed.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 bg-white border border-stone-100 rounded-lg px-3 py-1.5 text-xs"
                      >
                        <span className="font-bold text-stone-700 truncate">
                          <span className="text-stone-400 mr-1.5">{p.unidades}×</span>
                          {p.nombre}
                        </span>
                        <span className="font-mono text-stone-500 shrink-0">
                          {formatCLP(p.precioUnitNeto)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div
              className="shrink-0 border-t border-stone-100 bg-white/90 backdrop-blur-xl px-5 sm:px-7 py-4 space-y-2"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {tieneItemsReales() && pasteParsed.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConfirmPaste("agregar")}
                    className="w-full py-3 bg-milokira-verde hover:bg-milokira-verde/90 text-white font-black rounded-xl text-sm tracking-wide shadow-md shadow-milokira-verde/30 transition-all active:scale-[0.98]"
                  >
                    Agregar al final ({pasteParsed.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPaste("reemplazar")}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
                  >
                    Reemplazar lista actual
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmPaste("reemplazar")}
                  disabled={pasteParsed.length === 0}
                  className="w-full py-3 bg-milokira-verde hover:bg-milokira-verde/90 text-white font-black rounded-xl text-sm tracking-wide shadow-md shadow-milokira-verde/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {pasteParsed.length > 0
                    ? `Usar lista (${pasteParsed.length})`
                    : "Pega y detecta primero"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// MODAL: DETALLE COMPRA — confirmar plantas que pasan al inventario
// =========================================================================
type CompraItemEdit = CompraItem;

function DetalleCompraModal({
  compra,
  onClose,
  onChange,
}: {
  readonly compra: Compra;
  readonly onClose: () => void;
  readonly onChange: () => void;
}) {
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [itemsEdit, setItemsEdit] = useState<CompraItemEdit[]>(() =>
    compra.items.map((i) => ({ ...i })),
  );
  const [proveedorEdit, setProveedorEdit] = useState(compra.proveedor);
  const [ivaEdit, setIvaEdit] = useState(compra.ivaPorcentaje);
  const [despachoEdit, setDespachoEdit] = useState(compra.despachoTotal);
  const [margenEdit, setMargenEdit] = useState(compra.margenSugerido);
  const [dirty, setDirty] = useState(false);

  const updateItem = <K extends keyof CompraItemEdit>(
    id: string,
    key: K,
    value: CompraItemEdit[K],
  ) => {
    setItemsEdit((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)),
    );
    setDirty(true);
  };

  // Cálculos derivados — recalculan cuando cambian itemsEdit o config
  const calc = useMemo(() => {
    const ivaFactor = 1 + ivaEdit / 100;
    const unidadesTotales = itemsEdit.reduce((a, b) => a + b.unidades, 0);
    const despachoPorUnidad =
      unidadesTotales > 0 ? despachoEdit / unidadesTotales : 0;

    return itemsEdit.map((i) => {
      const costoBrutoUnit = i.precioUnitNeto * ivaFactor + despachoPorUnidad;
      const plantasExtraidas = Math.max(1, i.plantasPorMaceta);
      const costoRealPorPlanta = costoBrutoUnit / plantasExtraidas;
      const precioSugeridoBase =
        costoRealPorPlanta * (1 + margenEdit / 100);
      const precioSugerido =
        i.precioSugeridoOverride && i.precioSugeridoOverride > 0
          ? i.precioSugeridoOverride
          : precioSugeridoBase;
      const plantasTotales = i.unidades * plantasExtraidas;
      return {
        ...i,
        costoRealPorPlanta,
        precioSugerido,
        plantasTotales,
      };
    });
  }, [itemsEdit, ivaEdit, despachoEdit, margenEdit]);

  const totales = useMemo(() => {
    const seleccionadas = calc.filter((i) => seleccion[i.id]);
    const inversion = seleccionadas.reduce(
      (a, b) => a + b.costoRealPorPlanta * b.plantasTotales,
      0,
    );
    const ingreso = seleccionadas.reduce(
      (a, b) => a + b.precioSugerido * b.plantasTotales,
      0,
    );
    const ganancia = ingreso - inversion;
    const plantasTot = seleccionadas.reduce((a, b) => a + b.plantasTotales, 0);
    const itemsCount = seleccionadas.length;
    const margenReal = inversion > 0 ? (ganancia / inversion) * 100 : 0;
    return { inversion, ingreso, ganancia, plantasTot, itemsCount, margenReal };
  }, [calc, seleccion]);

  const persistirCambios = async () => {
    const itemsParaGuardar: CompraItem[] = itemsEdit.map((i) => {
      const base: CompraItem = {
        id: i.id,
        nombre: i.nombre.trim(),
        unidades: i.unidades,
        precioUnitNeto: i.precioUnitNeto,
        plantasPorMaceta: i.plantasPorMaceta,
        ingresada: i.ingresada,
      };
      if (i.precioSugeridoOverride && i.precioSugeridoOverride > 0) {
        base.precioSugeridoOverride = i.precioSugeridoOverride;
      }
      return base;
    });
    const subtotalNeto = itemsParaGuardar.reduce(
      (a, b) => a + b.precioUnitNeto * b.unidades,
      0,
    );
    const totalIva = subtotalNeto * (ivaEdit / 100);
    const totalConIva = subtotalNeto + totalIva;
    const totalConDespacho = totalConIva + despachoEdit;

    await updateDoc(doc(db, "Compras", compra.idFirebase), {
      proveedor: proveedorEdit.trim(),
      items: itemsParaGuardar,
      ivaPorcentaje: ivaEdit,
      despachoTotal: despachoEdit,
      margenSugerido: margenEdit,
      subtotalNeto,
      totalIva,
      totalConIva,
      totalConDespacho,
    });
  };

  const handleGuardarCambios = async () => {
    setIsSaving(true);
    setError("");
    try {
      await persistirCambios();
      setDirty(false);
      onChange();
    } catch (err) {
      console.error(err);
      setError("Error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmar = async () => {
    const idsSeleccionados = calc
      .filter((i) => seleccion[i.id] && !i.ingresada)
      .map((i) => i.id);

    if (idsSeleccionados.length === 0) {
      setError("Selecciona al menos una planta para pasar al inventario.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      // Si hay cambios pendientes, persiste primero
      if (dirty) {
        await persistirCambios();
      }

      // 1) Pre-fetch: ver cuáles ya existen en inventario y con qué stock.
      const itemsAProcesar = idsSeleccionados
        .map((id) => calc.find((c) => c.id === id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      const existentes: { item: typeof itemsAProcesar[number]; stockActual: number }[] = [];
      const snaps = new Map<string, DocumentSnapshot>();
      for (const item of itemsAProcesar) {
        const slug = slugify(item.nombre);
        const plantaRef = doc(db, "Plantas", slug);
        const plantaSnap = await getDoc(plantaRef);
        snaps.set(slug, plantaSnap);
        if (plantaSnap.exists()) {
          const stockActual = Number(plantaSnap.data().stock) || 0;
          existentes.push({ item, stockActual });
        }
      }

      // 2) Si hay existentes, preguntar Sumar / Reemplazar.
      // OK → Sumar (recomendado para entradas reales). Cancelar → Reemplazar.
      let modoStock: "sumar" | "reemplazar" = "sumar";
      if (existentes.length > 0) {
        const detalle = existentes
          .map(
            ({ item, stockActual }) =>
              `• ${item.nombre}: ${stockActual} actual + ${item.plantasTotales} ingresan`,
          )
          .join("\n");
        const sumarTotal = existentes.reduce(
          (a, b) => a + b.stockActual + b.item.plantasTotales,
          0,
        );
        const msg =
          `Hay ${existentes.length} planta(s) que ya existen en inventario:\n\n` +
          `${detalle}\n\n` +
          `Aceptar → SUMAR al stock actual (total quedaría en ${sumarTotal} entre ellas).\n` +
          `Cancelar → REEMPLAZAR el stock por el de esta compra.\n\n` +
          `¿Sumar al stock actual?`;
        modoStock = window.confirm(msg) ? "sumar" : "reemplazar";
      }

      for (const id of idsSeleccionados) {
        const item = calc.find((c) => c.id === id);
        if (!item) continue;
        const slug = slugify(item.nombre);

        const costoCompraTotal = item.precioUnitNeto * item.unidades;
        const stockEntrante = item.plantasTotales;
        const precioVenta = redondearComercial(item.precioSugerido);
        const costoUnitario = Math.round(item.costoRealPorPlanta);
        const margen =
          costoUnitario > 0
            ? Number(
                (((precioVenta - costoUnitario) / costoUnitario) * 100).toFixed(
                  1,
                ),
              )
            : 0;

        const plantaRef = doc(db, "Plantas", slug);
        const plantaSnap = snaps.get(slug) ?? (await getDoc(plantaRef));

        if (plantaSnap.exists()) {
          // Planta ya existe: solo actualizamos lo que viene de esta compra.
          // No tocamos descripcion, categorias, imagenUrl, imagenPosition,
          // dificultad, aptaMascotas, ni el flag `precio.disponible`.
          const stockActual = Number(plantaSnap.data().stock) || 0;
          const stockFinal =
            modoStock === "sumar" ? stockActual + stockEntrante : stockEntrante;
          await updateDoc(plantaRef, {
            nombre: item.nombre,
            stock: stockFinal,
            costo: costoUnitario,
            margen,
            costoOriginalTotal: costoCompraTotal,
            unidadesCompradas: item.unidades,
            precioCompraUnitaria: item.precioUnitNeto,
            plantasPorMaceta: item.plantasPorMaceta,
            "precio.valor": precioVenta,
            "precio.tipo": "fijo",
          });
        } else {
          // Planta nueva: la creamos con los defaults.
          await setDoc(plantaRef, {
            nombre: item.nombre,
            stock: stockEntrante,
            costo: costoUnitario,
            margen,
            costoOriginalTotal: costoCompraTotal,
            unidadesCompradas: item.unidades,
            precioCompraUnitaria: item.precioUnitNeto,
            plantasPorMaceta: item.plantasPorMaceta,
            descripcion: "",
            categorias: ["INTERIOR"],
            imagenUrl: "",
            imagenPosition: "50% 50%",
            dificultad: "media",
            aptaMascotas: "sin-info",
            precio: {
              valor: precioVenta,
              tipo: "fijo",
              disponible: true,
            },
          });
        }
      }

      const itemsActualizados: CompraItem[] = itemsEdit.map((i) => {
        const base: CompraItem = {
          id: i.id,
          nombre: i.nombre.trim(),
          unidades: i.unidades,
          precioUnitNeto: i.precioUnitNeto,
          plantasPorMaceta: i.plantasPorMaceta,
          ingresada: idsSeleccionados.includes(i.id) ? true : i.ingresada,
        };
        if (i.precioSugeridoOverride && i.precioSugeridoOverride > 0) {
          base.precioSugeridoOverride = i.precioSugeridoOverride;
        }
        return base;
      });
      const todasIngresadas = itemsActualizados.every((i) => i.ingresada);
      await updateDoc(doc(db, "Compras", compra.idFirebase), {
        items: itemsActualizados,
        status: todasIngresadas ? "ingresada" : "pending",
      });

      setDirty(false);
      onChange();
    } catch (err) {
      console.error(err);
      setError("Error al pasar al inventario.");
    } finally {
      setIsSaving(false);
    }
  };

  const allSelected =
    calc.some((i) => !i.ingresada) &&
    calc.filter((i) => !i.ingresada).every((i) => seleccion[i.id]);

  const toggleAll = () => {
    if (allSelected) {
      setSeleccion({});
    } else {
      const next: Record<string, boolean> = {};
      calc.filter((i) => !i.ingresada).forEach((i) => (next[i.id] = true));
      setSeleccion(next);
    }
  };

  const handleAgregarItem = () => {
    setItemsEdit((prev) => [
      ...prev,
      {
        id: newId(),
        nombre: "",
        unidades: 1,
        precioUnitNeto: 0,
        plantasPorMaceta: 1,
        ingresada: false,
      },
    ]);
    setDirty(true);
  };

  const idsEliminables = itemsEdit.filter(
    (i) => seleccion[i.id] && !i.ingresada,
  );

  const handleEliminarSeleccionadas = () => {
    if (idsEliminables.length === 0) return;
    const msg =
      idsEliminables.length === 1
        ? `¿Eliminar "${idsEliminables[0].nombre || "esta planta"}" de la compra?`
        : `¿Eliminar ${idsEliminables.length} plantas seleccionadas de la compra?`;
    if (!window.confirm(msg)) return;

    const idsBorrar = new Set(idsEliminables.map((i) => i.id));
    setItemsEdit((prev) => prev.filter((i) => !idsBorrar.has(i.id)));
    setSeleccion((prev) => {
      const next = { ...prev };
      idsBorrar.forEach((id) => delete next[id]);
      return next;
    });
    setDirty(true);
  };

  const idsReingresables = itemsEdit.filter(
    (i) => seleccion[i.id] && i.ingresada,
  );

  const handleCorregirCostos = async () => {
    const ingresadas = calc.filter((i) => i.ingresada);
    if (ingresadas.length === 0) {
      window.alert("No hay plantas ingresadas al inventario en esta compra.");
      return;
    }
    const msg = `Corregir costo + margen en inventario para ${ingresadas.length} plantas ya ingresadas?\n\nUsará el cálculo actual (IVA ${ivaEdit}% + despacho + margen ${margenEdit}%). No toca stock, descripción, imágenes ni categorías.`;
    if (!window.confirm(msg)) return;

    setIsSaving(true);
    setError("");
    let okCount = 0;
    let skipCount = 0;
    try {
      for (const item of ingresadas) {
        const slug = slugify(item.nombre);
        const plantaRef = doc(db, "Plantas", slug);
        const snap = await getDoc(plantaRef);
        if (!snap.exists()) {
          skipCount++;
          continue;
        }
        const precioVenta = redondearComercial(item.precioSugerido);
        const costoUnitario = Math.round(item.costoRealPorPlanta);
        const costoCompraTotal = item.precioUnitNeto * item.unidades;
        const margen =
          costoUnitario > 0
            ? Number(
                (((precioVenta - costoUnitario) / costoUnitario) * 100).toFixed(
                  1,
                ),
              )
            : 0;
        await updateDoc(plantaRef, {
          costo: costoUnitario,
          margen,
          costoOriginalTotal: costoCompraTotal,
          unidadesCompradas: item.unidades,
          precioCompraUnitaria: item.precioUnitNeto,
          plantasPorMaceta: item.plantasPorMaceta,
          "precio.valor": precioVenta,
        });
        okCount++;
      }
      window.alert(
        `Listo. ${okCount} plantas actualizadas` +
          (skipCount > 0
            ? `. ${skipCount} no encontradas en inventario (no se modificaron).`
            : "."),
      );
    } catch (err) {
      console.error(err);
      setError("Error al corregir costos en inventario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReabrirSeleccionadas = () => {
    if (idsReingresables.length === 0) return;
    const msg =
      idsReingresables.length === 1
        ? `Reabrir "${idsReingresables[0].nombre}" para volver a pasarla al inventario con el costo correcto?`
        : `Reabrir ${idsReingresables.length} plantas para volver a pasarlas al inventario con el costo correcto?`;
    if (!window.confirm(msg)) return;

    const idsReabrir = new Set(idsReingresables.map((i) => i.id));
    setItemsEdit((prev) =>
      prev.map((i) => (idsReabrir.has(i.id) ? { ...i, ingresada: false } : i)),
    );
    setDirty(true);
  };

  const handleRegistrarComoGasto = async () => {
    if (compra.gastoId) return;
    const monto = Math.round(compra.totalConDespacho);
    const proveedorTxt = compra.proveedor.trim() || "compra sin proveedor";
    const msg = `¿Registrar esta compra como gasto?\n\nProveedor: ${proveedorTxt}\nMonto: ${formatCLP(monto)}\nFecha del gasto: ${new Date(compra.fecha).toLocaleDateString("es-CL")}\n\nAparecerá en la card "Gastos" y descontará de la ganancia.`;
    if (!window.confirm(msg)) return;

    setIsSaving(true);
    setError("");
    try {
      const gastoRef = await addDoc(collection(db, "Gastos"), {
        description: `Mercadería - ${proveedorTxt}`,
        amount: monto,
        created_at: new Date(compra.fecha).toISOString(),
        compraId: compra.idFirebase,
      });
      await updateDoc(doc(db, "Compras", compra.idFirebase), {
        gastoId: gastoRef.id,
      });
      onChange();
    } catch (err) {
      console.error(err);
      setError("Error al registrar el gasto.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDesvincularGasto = async () => {
    if (!compra.gastoId) return;
    const msg = `¿Eliminar el gasto vinculado a esta compra?\n\nSe borrará el registro de gasto. El inventario y la compra no se modifican.`;
    if (!window.confirm(msg)) return;

    setIsSaving(true);
    setError("");
    try {
      await deleteDoc(doc(db, "Gastos", compra.gastoId));
      await updateDoc(doc(db, "Compras", compra.idFirebase), {
        gastoId: deleteField(),
      });
      onChange();
    } catch (err) {
      console.error(err);
      setError("Error al desvincular el gasto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-end sm:items-center justify-center sm:p-6 backdrop-blur-sm">
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-stone-200 shadow-2xl flex flex-col max-h-dvh sm:max-h-[90vh] h-dvh sm:h-auto overflow-hidden">
        <header className="flex items-center gap-3 px-4 sm:px-7 py-4 sm:py-5 border-b border-stone-100">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-linear-to-br from-milokira-verde to-milokira-verde/70 flex items-center justify-center shadow-md shadow-milokira-verde/30 shrink-0">
            <PackageCheck size={16} className="text-white sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={proveedorEdit}
              onChange={(e) => {
                setProveedorEdit(e.target.value);
                setDirty(true);
              }}
              placeholder="Compra sin proveedor"
              className="w-full bg-transparent text-base sm:text-lg font-black text-stone-800 tracking-tight outline-none focus:bg-stone-50 focus:px-2 focus:rounded-lg transition-all placeholder:text-stone-400 placeholder:italic placeholder:font-bold"
            />
            <p className="text-[11px] sm:text-xs text-stone-500 font-medium truncate">
              {new Date(compra.fecha).toLocaleDateString("es-CL")} · {formatCLP(compra.totalConDespacho)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-500 border border-stone-200 transition-all"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-3">
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider ml-1 block mb-0.5">
                IVA %
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={ivaEdit}
                onChange={(e) => {
                  setIvaEdit(Number(e.target.value.replace(/\D/g, "")) || 0);
                  setDirty(true);
                }}
                className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 text-center font-bold outline-none focus:border-milokira-verde text-sm"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider ml-1 block mb-0.5">
                Despacho $
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={despachoEdit || ""}
                onChange={(e) => {
                  setDespachoEdit(Number(e.target.value.replace(/\D/g, "")) || 0);
                  setDirty(true);
                }}
                placeholder="$"
                className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 outline-none focus:border-milokira-verde text-sm placeholder:text-stone-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider ml-1 block mb-0.5">
                Margen %
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={margenEdit}
                onChange={(e) => {
                  setMargenEdit(Number(e.target.value.replace(/\D/g, "")) || 0);
                  setDirty(true);
                }}
                className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 text-center font-bold outline-none focus:border-milokira-verde text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAgregarItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
            >
              <Plus size={12} strokeWidth={3} />
              Agregar planta
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              {idsReingresables.length > 0 && (
                <button
                  type="button"
                  onClick={handleReabrirSeleccionadas}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                  title="Marcar como no ingresada para volver a pasarla al inventario con el costo correcto"
                >
                  <PackageCheck size={12} strokeWidth={2.5} />
                  Reabrir ({idsReingresables.length})
                </button>
              )}
              {idsEliminables.length > 0 && (
                <button
                  type="button"
                  onClick={handleEliminarSeleccionadas}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  <Trash2 size={12} strokeWidth={2.5} />
                  Eliminar ({idsEliminables.length})
                </button>
              )}
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-milokira-verde/10 hover:bg-milokira-verde/20 text-milokira-verde border border-milokira-verde/40 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
              >
                <CheckCircle size={12} strokeWidth={2.5} />
                {allSelected ? "Deseleccionar" : "Seleccionar todas"}
              </button>
            </div>
          </div>


          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
              {/* Tabla — solo en sm+ */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50">
                    <tr className="text-[9px] font-black text-stone-500 uppercase tracking-wider">
                      <th className="px-2 py-2 text-center w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="Seleccionar todas"
                          className="h-4 w-4 accent-milokira-verde cursor-pointer"
                        />
                      </th>
                      <th className="px-2 py-2 text-left">Nombre</th>
                      <th className="px-1 py-2 text-center">Unid.</th>
                      <th className="px-1 py-2 text-right">Neto</th>
                      <th className="px-1 py-2 text-center">P/M</th>
                      <th className="px-1 py-2 text-right text-blue-600">Costo real</th>
                      <th className="px-1 py-2 text-right text-milokira-verde">Sugerido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {calc.map((it) => {
                      const isChecked = seleccion[it.id] === true;
                      const rowBg = it.ingresada
                        ? "bg-milokira-verde/5"
                        : isChecked
                          ? "bg-milokira-verde/15"
                          : "";
                      const inputCls =
                        "w-full px-1.5 py-1 bg-white border border-stone-200 rounded text-stone-700 outline-none focus:border-milokira-verde text-xs disabled:bg-stone-50 disabled:opacity-70";
                      return (
                        <tr key={it.id} className={rowBg}>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={it.ingresada || isChecked}
                              disabled={it.ingresada}
                              onChange={(e) =>
                                setSeleccion((prev) => ({
                                  ...prev,
                                  [it.id]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 accent-milokira-verde"
                            />
                          </td>
                          <td className="px-2 py-1.5 min-w-35">
                            <input
                              value={it.nombre}
                              disabled={it.ingresada}
                              onChange={(e) =>
                                updateItem(it.id, "nombre", e.target.value)
                              }
                              className={`${inputCls} font-bold`}
                            />
                          </td>
                          <td className="px-1 py-1.5 w-14">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={it.ingresada}
                              value={it.unidades || ""}
                              onChange={(e) =>
                                updateItem(
                                  it.id,
                                  "unidades",
                                  Math.max(
                                    1,
                                    Number(e.target.value.replace(/\D/g, "")) || 0,
                                  ),
                                )
                              }
                              className={`${inputCls} text-center font-bold`}
                            />
                          </td>
                          <td className="px-1 py-1.5 w-20">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={it.ingresada}
                              value={it.precioUnitNeto || ""}
                              onChange={(e) =>
                                updateItem(
                                  it.id,
                                  "precioUnitNeto",
                                  Number(e.target.value.replace(/\D/g, "")) || 0,
                                )
                              }
                              className={`${inputCls} text-right font-mono`}
                            />
                          </td>
                          <td className="px-1 py-1.5 w-12">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={it.ingresada}
                              value={it.plantasPorMaceta || ""}
                              onChange={(e) =>
                                updateItem(
                                  it.id,
                                  "plantasPorMaceta",
                                  Math.max(
                                    1,
                                    Number(e.target.value.replace(/\D/g, "")) || 0,
                                  ),
                                )
                              }
                              className={`${inputCls} text-center font-bold`}
                            />
                          </td>
                          <td className="px-1 py-1.5 text-right font-mono font-black text-blue-700 w-24">
                            {formatCLP(Math.round(it.costoRealPorPlanta))}
                          </td>
                          <td className="px-1 py-1.5 w-28">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={it.ingresada}
                              value={
                                it.precioSugerido > 0
                                  ? formatCLP(
                                      it.precioSugeridoOverride &&
                                        it.precioSugeridoOverride > 0
                                        ? Math.round(it.precioSugerido)
                                        : redondearComercial(it.precioSugerido),
                                    )
                                  : ""
                              }
                              onChange={(e) => {
                                const limpio = e.target.value.replace(/\D/g, "");
                                const n = Number(limpio);
                                updateItem(
                                  it.id,
                                  "precioSugeridoOverride",
                                  limpio === "" || n <= 0 ? undefined : n,
                                );
                              }}
                              className={`${inputCls} text-right font-mono font-black text-milokira-verde`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-stone-50 border-t-2 border-stone-200">
                    <tr className="text-[10px] font-black uppercase tracking-wider">
                      <td colSpan={5} className="px-2 py-2 text-right text-stone-500">
                        Seleccionadas ({totales.itemsCount} · {totales.plantasTot} plantas)
                      </td>
                      <td className="px-1 py-2 text-right text-blue-700 font-mono">
                        {formatCLP(Math.round(totales.inversion))}
                      </td>
                      <td className="px-1 py-2 text-right text-milokira-verde font-mono">
                        {formatCLP(Math.round(totales.ingreso))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cards — solo en mobile */}
              <ul className="sm:hidden space-y-3 p-3">
                {calc.map((it, idx) => {
                  const isChecked = seleccion[it.id] === true;
                  const numInput =
                    "w-full bg-transparent text-stone-800 font-bold outline-none text-sm disabled:opacity-60";
                  const headerBg = it.ingresada
                    ? "bg-milokira-verde/15"
                    : isChecked
                      ? "bg-milokira-verde/10"
                      : "bg-stone-50/80";
                  const borderCls = isChecked
                    ? "border-milokira-verde/60 ring-1 ring-milokira-verde/30"
                    : "border-stone-200";
                  return (
                    <li
                      key={it.id}
                      className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-colors ${borderCls} ${
                        it.ingresada ? "opacity-95" : ""
                      }`}
                    >
                      {/* Fila 1: check + número + nombre + estado */}
                      <div
                        className={`flex items-center gap-2 px-2.5 py-2 border-b border-stone-100 ${headerBg}`}
                      >
                        <input
                          type="checkbox"
                          checked={it.ingresada || isChecked}
                          disabled={it.ingresada}
                          onChange={(e) =>
                            setSeleccion((prev) => ({
                              ...prev,
                              [it.id]: e.target.checked,
                            }))
                          }
                          className="h-5 w-5 shrink-0 accent-milokira-verde"
                        />
                        <span className="grid place-items-center h-5 min-w-5 px-1 rounded-md bg-stone-300 text-white text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          value={it.nombre}
                          disabled={it.ingresada}
                          onChange={(e) =>
                            updateItem(it.id, "nombre", e.target.value)
                          }
                          placeholder="Nombre"
                          className="flex-1 min-w-0 bg-transparent text-stone-800 font-bold outline-none text-sm placeholder:text-stone-400 placeholder:font-normal disabled:opacity-60"
                        />
                        {it.ingresada && (
                          <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-milokira-verde bg-white/70 border border-milokira-verde/40 rounded-full px-2 py-0.5">
                            ✓ Ingresada
                          </span>
                        )}
                      </div>

                      {/* Fila 2: campos compactos en línea */}
                      <div className="flex items-stretch divide-x divide-stone-100">
                        <label className="flex-1 flex flex-col px-2 py-1.5">
                          <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                            Unid.
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={it.ingresada}
                            value={it.unidades || ""}
                            onChange={(e) =>
                              updateItem(
                                it.id,
                                "unidades",
                                Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 0),
                              )
                            }
                            className={numInput}
                          />
                        </label>
                        <label className="flex-[1.4] flex flex-col px-2 py-1.5">
                          <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                            Precio neto
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={it.ingresada}
                            value={it.precioUnitNeto || ""}
                            onChange={(e) =>
                              updateItem(
                                it.id,
                                "precioUnitNeto",
                                Number(e.target.value.replace(/\D/g, "")) || 0,
                              )
                            }
                            placeholder="$0"
                            className={`${numInput} font-mono placeholder:text-stone-300 placeholder:font-normal`}
                          />
                        </label>
                        <label className="flex-1 flex flex-col px-2 py-1.5">
                          <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                            Pl/mac
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={it.ingresada}
                            value={it.plantasPorMaceta || ""}
                            onChange={(e) =>
                              updateItem(
                                it.id,
                                "plantasPorMaceta",
                                Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 0),
                              )
                            }
                            className={numInput}
                          />
                        </label>
                      </div>

                      {/* Fila 3: costo real + precio sugerido editable */}
                      {it.precioUnitNeto > 0 && (
                        <div className="flex items-stretch divide-x divide-stone-100 border-t border-stone-100 bg-stone-50/60">
                          <div className="flex-1 flex flex-col px-2.5 py-1.5">
                            <span className="text-[8px] font-bold text-blue-500/80 uppercase tracking-wider mb-0.5">
                              Costo real
                            </span>
                            <span className="font-mono font-black text-blue-700 text-sm">
                              {formatCLP(Math.round(it.costoRealPorPlanta))}
                            </span>
                          </div>
                          <label className="flex-1 flex flex-col px-2.5 py-1.5">
                            <span className="text-[8px] font-bold text-milokira-verde uppercase tracking-wider mb-0.5">
                              Sugerido
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={it.ingresada}
                              value={
                                it.precioSugerido > 0
                                  ? formatCLP(
                                      it.precioSugeridoOverride && it.precioSugeridoOverride > 0
                                        ? Math.round(it.precioSugerido)
                                        : redondearComercial(it.precioSugerido),
                                    )
                                  : ""
                              }
                              onChange={(e) => {
                                const limpio = e.target.value.replace(/\D/g, "");
                                const n = Number(limpio);
                                updateItem(
                                  it.id,
                                  "precioSugeridoOverride",
                                  limpio === "" || n <= 0 ? undefined : n,
                                );
                              }}
                              className="w-full bg-transparent font-mono font-black text-milokira-verde text-sm outline-none disabled:opacity-60"
                            />
                          </label>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {totales.itemsCount > 0 ? (
                <div className="bg-linear-to-r from-milokira-verde/10 to-milokira-lila/20 border-t-2 border-milokira-verde/40 px-3 py-3 space-y-2">
                  <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                    Resumen de las seleccionadas ({totales.itemsCount}{" "}
                    {totales.itemsCount === 1 ? "planta" : "plantas"})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                        Inversión
                      </p>
                      <p className="font-mono font-black text-blue-700 text-sm sm:text-base">
                        {formatCLP(Math.round(totales.inversion))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                        Ingreso esperado
                      </p>
                      <p className="font-mono font-black text-milokira-verde text-sm sm:text-base">
                        {formatCLP(Math.round(totales.ingreso))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                        Ganancia ({totales.margenReal.toFixed(0)}%)
                      </p>
                      <p className="font-mono font-black text-amber-600 text-sm sm:text-base">
                        {formatCLP(Math.round(totales.ganancia))}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-stone-50 border-t border-stone-200 px-3 py-3 text-center">
                  <p className="text-[11px] text-stone-500 font-medium">
                    Selecciona plantas para ver inversión y ganancia esperada
                  </p>
                </div>
              )}
            </div>

          {error && (
            <p className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        <div
          className="relative z-10 shrink-0 border-t border-stone-100 bg-white/90 backdrop-blur-xl px-5 sm:px-7 py-4 space-y-2"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {dirty && (
            <button
              onClick={handleGuardarCambios}
              disabled={isSaving}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
          {calc.some((i) => i.ingresada) && (
            <button
              onClick={handleCorregirCostos}
              disabled={isSaving}
              className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              title="Reescribe costo y margen en inventario para las plantas ya ingresadas. No toca stock ni otros campos."
            >
              {isSaving
                ? "Corrigiendo…"
                : `Corregir costo en inventario (${calc.filter((i) => i.ingresada).length})`}
            </button>
          )}
          {compra.gastoId ? (
            <button
              onClick={handleDesvincularGasto}
              disabled={isSaving}
              className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              title="Borra el gasto vinculado. La compra y el inventario no se tocan."
            >
              ✓ Gasto registrado · borrar
            </button>
          ) : (
            <button
              onClick={handleRegistrarComoGasto}
              disabled={isSaving}
              className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              title="Crea un gasto por el total con IVA y despacho. Suma a la card 'Gastos' del dashboard."
            >
              Registrar como gasto ({formatCLP(Math.round(compra.totalConDespacho))})
            </button>
          )}
          <button
            onClick={handleConfirmar}
            disabled={isSaving}
            className="w-full py-3.5 bg-milokira-verde hover:bg-milokira-verde/90 text-white font-black rounded-xl text-sm tracking-wide shadow-md shadow-milokira-verde/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <PackageCheck size={16} strokeWidth={2.5} />
            {isSaving ? "Pasando…" : "Pasar seleccionadas al inventario"}
          </button>
        </div>
      </div>
    </div>
  );
}
