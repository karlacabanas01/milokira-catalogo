"use client";

import { useEffect, useState, useMemo } from "react";
// 1. IMPORTACIONES DE FIREBASE
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Ajusta tu ruta

import {
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingUp,
  Receipt,
  ShoppingBag,
  Package,
} from "lucide-react";
import { Modal } from "../../components/ui";

// 2. TIPO UNIFICADO PARA FIREBASE
type SaleItem = {
  product_id?: string;
  nombre?: string;
  quantity: number;
  unit_price: number;
};

type UnifiedSale = {
  idFirebase: string;
  date: string;
  description: string;
  amount: number;
  tipo: string;
  items: SaleItem[];
};

type DayGroup = {
  date: string;
  dateLabel: string;
  total: number;
  items: UnifiedSale[];
};

type Filtro = "todas" | "pedido" | "venta_directa";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onChange: () => void;
};

const currency = (n: number) => `$${n.toLocaleString("es-CL")}`;

export default function SaleListModal({ isOpen, onClose, onChange }: Props) {
  const [sales, setSales] = useState<UnifiedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const salesFiltradas = useMemo(
    () => (filtro === "todas" ? sales : sales.filter((s) => s.tipo === filtro)),
    [sales, filtro],
  );

  // Resumen global de las ventas filtradas
  const resumen = useMemo(() => {
    const total = salesFiltradas.reduce((acc, s) => acc + s.amount, 0);
    const cantidad = salesFiltradas.length;
    const promedio = cantidad > 0 ? Math.round(total / cantidad) : 0;
    return { total, cantidad, promedio };
  }, [salesFiltradas]);

  const salesByDay: DayGroup[] = useMemo(() => {
    const dayGroups: Record<
      string,
      { dateLabel: string; total: number; items: UnifiedSale[] }
    > = {};

    salesFiltradas.forEach((item) => {
      const date = new Date(item.date);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = {
          dateLabel: date.toLocaleDateString("es-CL", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          total: 0,
          items: [],
        };
      }

      dayGroups[dateKey].items.push(item);
      dayGroups[dateKey].total += item.amount;
    });

    return Object.entries(dayGroups)
      .map(([date, group]) => ({
        date,
        dateLabel: group.dateLabel,
        total: group.total,
        items: group.items.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salesFiltradas]);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) newSet.delete(date);
      else newSet.add(date);
      return newSet;
    });
  };

  useEffect(() => {
    if (isOpen) {
      const fetchAllSales = async () => {
        setLoading(true);
        try {
          const q = query(
            collection(db, "Transacciones"),
            where("status", "!=", "pending"),
          );

          const querySnapshot = await getDocs(q);
          const unifiedList: UnifiedSale[] = [];

          querySnapshot.forEach((documento) => {
            const data = documento.data();

            let desc = data.description || "Venta Directa";
            if (data.tipo === "pedido") {
              desc = `Pedido de: ${data.customer_name || "Cliente"}`;
            }

            unifiedList.push({
              idFirebase: documento.id,
              date: data.created_at || new Date().toISOString(),
              description: desc,
              amount: Number(data.total_amount) || 0,
              tipo: data.tipo || "venta_directa",
              items: data.items || [],
            });
          });

          setSales(unifiedList);
        } catch (error) {
          console.error("Error cargando ventas:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchAllSales();
    }
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleDelete = async (item: UnifiedSale) => {
    if (
      !confirm(
        `¿Anular la transacción: "${item.description}"?\nEsto restaurará el stock de las plantas involucradas.`,
      )
    )
      return;

    try {
      if (item.items && item.items.length > 0) {
        for (const planta of item.items) {
          if (planta.product_id) {
            const plantaRef = doc(db, "Plantas", planta.product_id);
            const plantaSnap = await getDoc(plantaRef);

            if (plantaSnap.exists()) {
              const stockActual = Number(plantaSnap.data().stock) || 0;
              await updateDoc(plantaRef, {
                stock: stockActual + planta.quantity,
              });
            }
          }
        }
      }

      // Borramos el documento de la transacción
      await deleteDoc(doc(db, "Transacciones", item.idFirebase));

      // Actualizar UI
      setSales((prev) => prev.filter((s) => s.idFirebase !== item.idFirebase));
      onChange(); // Recalcula el dashboard principal
    } catch (e) {
      alert("Error al anular la venta. Inténtalo de nuevo.");
      console.error(e);
    }
  };

  const filtros: { key: Filtro; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "pedido", label: "Pedidos" },
    { key: "venta_directa", label: "Directas" },
  ];

  return (
    // Header con gradiente propio: por eso hideCloseButton.
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      tall
      hideCloseButton
      className="p-0"
    >
      <div className="flex flex-col h-full -m-4 sm:-m-5">
        {/* Header con gradiente */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 pt-3 pb-6 text-white shrink-0">
          {/* Grabber (arrastrar para cerrar, solo mobile) */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="sm:hidden mx-auto mb-3 block h-1.5 w-10 rounded-full bg-white/40"
          />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm">
                <Receipt size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                  Historial
                </p>
                <h2 className="text-lg font-black leading-tight">Ventas</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          {/* KPIs de resumen */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1 text-white/70">
                <TrendingUp size={12} strokeWidth={2.5} />
                <span className="text-[9px] uppercase tracking-wider font-bold">
                  Total
                </span>
              </div>
              <p className="mt-1 text-sm sm:text-base font-black leading-none break-words">
                {currency(resumen.total)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1 text-white/70">
                <ShoppingBag size={12} strokeWidth={2.5} />
                <span className="text-[9px] uppercase tracking-wider font-bold">
                  Ventas
                </span>
              </div>
              <p className="mt-1 text-sm sm:text-base font-black leading-none">
                {resumen.cantidad}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1 text-white/70">
                <Package size={12} strokeWidth={2.5} />
                <span className="text-[9px] uppercase tracking-wider font-bold">
                  Prom.
                </span>
              </div>
              <p className="mt-1 text-sm sm:text-base font-black leading-none break-words">
                {currency(resumen.promedio)}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros por tipo */}
        <div className="flex gap-1.5 px-4 sm:px-5 py-3 border-b border-stone-100 shrink-0">
          {filtros.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors ${
                filtro === f.key
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto space-y-3 px-4 sm:px-5 py-4 scrollbar-hide">
          {loading ? (
            <div className="text-center text-stone-400 py-16">Cargando…</div>
          ) : salesByDay.length === 0 ? (
            <div className="text-center text-stone-400 py-16 border border-dashed border-stone-200 rounded-2xl">
              <Receipt
                size={28}
                className="mx-auto mb-2 text-stone-300"
                strokeWidth={1.5}
              />
              Sin ventas registradas.
            </div>
          ) : (
            salesByDay.map((dayGroup) => {
              const abierto = expandedDays.has(dayGroup.date);
              return (
                <div
                  key={dayGroup.date}
                  className="rounded-2xl border border-stone-200 overflow-hidden bg-white shadow-sm"
                >
                  {/* Header del día */}
                  <button
                    onClick={() => toggleDay(dayGroup.date)}
                    className={`w-full px-4 py-3 flex justify-between items-center gap-3 transition-colors ${
                      abierto ? "bg-emerald-50/60" : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="text-left min-w-0">
                      <p className="text-stone-800 font-bold capitalize text-sm truncate">
                        {dayGroup.dateLabel}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {dayGroup.items.length} registro
                        {dayGroup.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-emerald-600 font-black text-base sm:text-lg">
                        {currency(dayGroup.total)}
                      </span>
                      <span className="grid place-items-center w-6 h-6 rounded-full bg-stone-100 text-stone-500">
                        {abierto ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </span>
                    </div>
                  </button>

                  {/* Desglose de ventas del día */}
                  {abierto && (
                    <div className="border-t border-stone-100 divide-y divide-stone-100">
                      {dayGroup.items.map((item) => {
                        const esPedido = item.tipo === "pedido";
                        return (
                          <div
                            key={item.idFirebase}
                            className="px-4 py-3 flex justify-between items-start gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-stone-700 text-sm leading-snug break-words">
                                {item.description}
                              </p>
                              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                                    esPedido
                                      ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                                      : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  }`}
                                >
                                  {esPedido ? (
                                    <Package size={9} strokeWidth={3} />
                                  ) : (
                                    <ShoppingBag size={9} strokeWidth={3} />
                                  )}
                                  {esPedido ? "Pedido" : "Directa"}
                                </span>
                                <span className="text-[11px] text-stone-400 font-medium">
                                  {new Date(item.date).toLocaleTimeString(
                                    "es-CL",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                              <span className="text-emerald-600 font-black text-sm">
                                +{currency(item.amount)}
                              </span>
                              <button
                                onClick={() => handleDelete(item)}
                                className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-stone-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={12} />
                                Anular
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
