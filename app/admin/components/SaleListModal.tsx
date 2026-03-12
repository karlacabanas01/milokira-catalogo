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

import { X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

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

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onChange: () => void;
};

export default function SaleListModal({ isOpen, onClose, onChange }: Props) {
  const [sales, setSales] = useState<UnifiedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const salesByDay: DayGroup[] = useMemo(() => {
    const dayGroups: Record<
      string,
      { dateLabel: string; total: number; items: UnifiedSale[] }
    > = {};

    sales.forEach((item) => {
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
  }, [sales]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-800 shadow-2xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-emerald-400">
            Historial de Ventas
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
          {loading ? (
            <div className="text-center text-zinc-500 py-10">Cargando...</div>
          ) : salesByDay.length === 0 ? (
            <div className="text-center text-zinc-500 py-10 border border-dashed border-zinc-800 rounded-xl">
              Sin ventas registradas.
            </div>
          ) : (
            salesByDay.map((dayGroup) => (
              <div
                key={dayGroup.date}
                className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden"
              >
                {/* Header del día */}
                <button
                  onClick={() => toggleDay(dayGroup.date)}
                  className="w-full p-4 flex justify-between items-center hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-white font-medium capitalize">
                      {dayGroup.dateLabel}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {dayGroup.items.length} registro
                      {dayGroup.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-lg">
                      ${dayGroup.total.toLocaleString("es-CL")}
                    </span>
                    {expandedDays.has(dayGroup.date) ? (
                      <ChevronUp size={20} className="text-zinc-500" />
                    ) : (
                      <ChevronDown size={20} className="text-zinc-500" />
                    )}
                  </div>
                </button>

                {/* Desglose de ventas del día */}
                {expandedDays.has(dayGroup.date) && (
                  <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                    {dayGroup.items.map((item) => (
                      <div
                        key={item.idFirebase}
                        className="px-4 py-3 flex justify-between items-center bg-zinc-900/30 group"
                      >
                        <div className="flex-1 pr-4">
                          <p className="text-zinc-300 text-sm leading-snug">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {/* Etiqueta visual para distinguir Pedidos Completados de Ventas Rápidas */}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                              {item.tipo === "pedido"
                                ? "Pedido"
                                : "Venta Directa"}
                            </span>
                            <span className="text-xs text-zinc-600">
                              {new Date(item.date).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-emerald-400 font-medium text-sm">
                            +${item.amount.toLocaleString("es-CL")}
                          </span>
                          <button
                            onClick={() => handleDelete(item)}
                            className="mt-1 flex items-center gap-1 text-[11px] text-zinc-600 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={12} />
                            Anular
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
