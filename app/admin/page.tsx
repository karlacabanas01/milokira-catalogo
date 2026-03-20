"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

import {
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Plus,
  ArrowLeft,
} from "lucide-react";

import StatsOverview from "./components/StatsOverview";
import ExpenseModal from "./components/ExpenseModal";
import SaleModal from "./components/SaleModal";
import SaleListModal from "./components/SaleListModal";
import ExpenseListModal from "./components/ExpenseListModal";
import OrderModal from "./components/OrderModal";
import ProductListModal from "./components/ProductListModal";

export type OrderType = {
  idFirebase: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_type?: "delivery" | "retiro";
  delivery_fee?: number;
  items: {
    product_id?: string;
    nombre?: string;
    quantity: number;
    unit_price: number;
  }[];
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({
    income: 0,
    expenses: 0,
    profit: 0,
  });

  // Modales
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProductListOpen, setIsProductListOpen] = useState(false);

  const [isSaleListOpen, setIsSaleListOpen] = useState(false);
  const [isExpenseListOpen, setIsExpenseListOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [orders, setOrders] = useState<OrderType[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderType | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setLoading(true);

      try {
        const [txSnap, gastosSnap] = await Promise.all([
          getDocs(collection(db, "Transacciones")),
          getDocs(collection(db, "Gastos")),
        ]);

        if (isCancelled) return;

        let totalIncome = 0;
        let totalExpenses = 0;
        const pendingOrders: OrderType[] = [];

        txSnap.forEach((documento) => {
          const data = documento.data();
          const monto = Number(data.total_amount) || 0;
          const estado = data.status ? data.status.toLowerCase() : "completado";

          if (estado !== "pending") {
            totalIncome += monto;
          } else if (data.tipo === "pedido") {
            pendingOrders.push({
              idFirebase: documento.id,
              ...data,
            } as OrderType);
          }
        });

        gastosSnap.forEach((documento) => {
          totalExpenses += Number(documento.data().amount) || 0;
        });

        pendingOrders.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        setFinancials({
          income: totalIncome,
          expenses: totalExpenses,
          profit: totalIncome - totalExpenses,
        });
        setOrders(pendingOrders);
      } catch (error) {
        console.error("Error cargando datos de Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const refreshData = () => setRefreshKey((k) => k + 1);

  const handleCompleteOrder = async (order: OrderType) => {
    if (
      !confirm(
        `¿Confirmar venta a ${order.customer_name}?\nTotal: $${order.total_amount.toLocaleString()}`,
      )
    )
      return;

    try {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.product_id) {
            const plantaRef = doc(db, "Plantas", item.product_id);
            const plantaSnap = await getDoc(plantaRef);

            if (plantaSnap.exists()) {
              const stockActual = Number(plantaSnap.data().stock) || 0;
              if (stockActual < item.quantity) {
                alert(
                  `Stock insuficiente para "${item.nombre}". Tienes ${stockActual}, necesitas ${item.quantity}.`,
                );
                return;
              }
              await updateDoc(plantaRef, {
                stock: stockActual - item.quantity,
              });
            }
          }
        }
      }

      await updateDoc(doc(db, "Transacciones", order.idFirebase), {
        status: "completado",
      });

      refreshData();
      alert("¡Pedido completado y stock actualizado! ✅");
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al procesar la venta.");
    }
  };

  const handleDeleteOrder = async (order: OrderType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.status === "completado") {
      alert("No puedes eliminar un pedido completado.");
      return;
    }

    if (
      !confirm(
        `¿Estás segura de que quieres cancelar y eliminar el pedido de ${order.customer_name}?`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "Transacciones", order.idFirebase));
      refreshData();
    } catch (error) {
      alert("Error al eliminar el pedido");
    }
  };

  const handleEditOrder = (order: OrderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrder(order);
    setIsOrderModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100 pb-20 sm:pb-32 font-sans selection:bg-emerald-500/30">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="px-3 sm:px-4 py-3 sm:py-4 max-w-md mx-auto relative flex items-center justify-center min-h-[60px] sm:min-h-[64px]">
          <Link href="/" className="absolute left-3 sm:left-4">
            <button className="flex items-center gap-1 sm:gap-1.5 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-medium border border-zinc-800 hover:border-zinc-700">
              <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Volver</span>
            </button>
          </Link>

          <h1 className="text-xl sm:text-2xl font-black bg-linear-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight truncate px-12">
            Milokira<span className="text-white">App</span>
          </h1>
        </div>
      </div>

      <div className="p-3 sm:p-4 max-w-md mx-auto space-y-5 sm:space-y-6 mt-2">
        {loading ? (
          <div className="text-center py-4 text-zinc-500 text-sm">
            Cargando datos...
          </div>
        ) : (
          <StatsOverview
            financials={financials}
            onExpensesClick={() => setIsExpenseListOpen(true)}
            onSalesClick={() => setIsSaleListOpen(true)}
          />
        )}

        {/* Botones de acción principales */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-6 sm:mt-8">
          <button
            onClick={() => setIsSaleModalOpen(true)}
            className="py-4 sm:py-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-300 font-bold hover:bg-zinc-800 hover:border-emerald-500/30 transition-all active:scale-[0.98]"
          >
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
              <TrendingUp size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-xs sm:text-sm">Venta</span>
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="py-4 sm:py-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-300 font-bold hover:bg-zinc-800 hover:border-rose-500/30 transition-all active:scale-[0.98]"
          >
            <div className="p-2 sm:p-2.5 bg-rose-500/10 rounded-xl text-rose-500">
              <TrendingDown size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-xs sm:text-sm">Gasto</span>
          </button>
          <button
            onClick={() => {
              setEditingOrder(null);
              setIsOrderModalOpen(true);
            }}
            className="py-4 sm:py-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-300 font-bold hover:bg-zinc-800 hover:border-amber-500/30 transition-all active:scale-[0.98]"
          >
            <div className="p-2 sm:p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <ClipboardList size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-xs sm:text-sm">Pedido</span>
          </button>
          <button
            onClick={() => setIsProductListOpen(true)}
            className="py-4 sm:py-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-300 font-bold hover:bg-zinc-800 hover:border-indigo-500/30 transition-all active:scale-[0.98]"
          >
            <div className="p-2 sm:p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Package size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-xs sm:text-sm">Inventario</span>
          </button>
        </div>

        {/* Sección de Pedidos Pendientes */}
        {!loading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 border-b border-zinc-800/50 pb-2 sm:pb-3">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-500 border border-amber-500/20 shadow-sm shadow-amber-900/20">
                  <Clock size={14} className="sm:w-4 sm:h-4" />
                </div>
                Pendientes
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black shadow-md transition-colors ${orders.length > 0 ? "bg-emerald-500 text-emerald-950 shadow-emerald-900/30" : "bg-amber-500 text-amber-950 shadow-amber-900/30"}`}
              >
                {orders.length}
              </span>
            </div>

            {orders.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.idFirebase}
                    className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full p-3 sm:p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-800 transition-colors text-left"
                      onClick={() =>
                        setExpandedOrderId(
                          expandedOrderId === order.idFirebase
                            ? null
                            : order.idFirebase,
                        )
                      }
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                          <p className="text-amber-100 font-bold text-sm sm:text-base truncate">
                            {order.customer_name}
                          </p>
                          {order.delivery_type && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                                order.delivery_type === "delivery"
                                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {order.delivery_type === "delivery"
                                ? "Delivery"
                                : "Retiro"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs text-zinc-500 flex items-center gap-1">
                          <Clock size={10} className="sm:w-3 sm:h-3" />{" "}
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-amber-500 font-mono font-bold text-sm sm:text-base block">
                          ${order.total_amount.toLocaleString()}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-zinc-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                          {order.items?.length || 0} items{" "}
                          {expandedOrderId === order.idFirebase ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedOrderId === order.idFirebase && (
                      <div className="bg-black/40 p-3 sm:p-4 border-t border-zinc-800">
                        <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                          {order.items?.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex justify-between text-xs sm:text-sm text-zinc-300"
                            >
                              <span className="truncate pr-2">
                                • {item.nombre || "Planta"}{" "}
                                <span className="text-zinc-500 text-[10px] sm:text-xs">
                                  (x{item.quantity})
                                </span>
                              </span>
                              <span className="shrink-0">
                                $
                                {(
                                  item.unit_price * item.quantity
                                ).toLocaleString()}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {order.delivery_type === "delivery" &&
                          order.delivery_fee != null &&
                          order.delivery_fee > 0 && (
                            <div className="flex justify-between text-xs sm:text-sm text-indigo-400 mb-3 sm:mb-4 pt-1 border-t border-zinc-800/50">
                              <span>Delivery</span>
                              <span>
                                ${order.delivery_fee.toLocaleString()}
                              </span>
                            </div>
                          )}

                        {/* Botones de acción del pedido */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteOrder(order);
                            }}
                            className="flex-1 bg-emerald-600 text-white py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-lg hover:bg-emerald-500 transition-all flex justify-center items-center gap-1.5 sm:gap-2 active:scale-95"
                          >
                            <CheckCircle size={14} className="sm:w-4 sm:h-4" />{" "}
                            Completar
                          </button>
                          <button
                            onClick={(e) => handleEditOrder(order, e)}
                            className="px-3 sm:px-4 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 py-2 sm:py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-600/30 transition-all flex justify-center items-center active:scale-95"
                          >
                            <Edit3
                              size={16}
                              className="sm:w-[18px] sm:h-[18px]"
                            />
                          </button>
                          <button
                            onClick={(e) => handleDeleteOrder(order, e)}
                            className="px-3 sm:px-4 bg-rose-600/20 text-rose-400 border border-rose-500/30 py-2 sm:py-2.5 rounded-lg text-sm font-bold hover:bg-rose-600/30 transition-all flex justify-center items-center active:scale-95"
                          >
                            <Trash2
                              size={16}
                              className="sm:w-[18px] sm:h-[18px]"
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
                <div className="bg-blue-500/10 p-3 sm:p-4 rounded-full mb-3 sm:mb-4">
                  <ClipboardList
                    size={28}
                    className="text-blue-500 sm:w-8 sm:h-8"
                  />
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm mb-4 sm:mb-6 font-medium px-4">
                  No tienes pedidos pendientes.
                </p>
                <button
                  onClick={() => {
                    setEditingOrder(null);
                    setIsOrderModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 transition-all active:scale-95 flex items-center gap-2 group"
                >
                  <Plus
                    size={16}
                    className="group-hover:rotate-90 transition-transform duration-300 sm:w-[18px] sm:h-[18px]"
                  />{" "}
                  Nuevo Pedido
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Renderizado condicional de Modales */}
      {isOrderModalOpen && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setEditingOrder(null);
          }}
          onSuccess={refreshData}
          editingOrder={editingOrder}
        />
      )}

      {isSaleModalOpen && (
        <SaleModal
          isOpen={isSaleModalOpen}
          onClose={() => setIsSaleModalOpen(false)}
          onSave={async (data) => {
            setIsSaving(true);
            try {
              await setDoc(doc(collection(db, "Transacciones")), {
                ...data,
                tipo: "venta_directa",
                status: "completado",
                created_at: new Date().toISOString(),
              });
              setIsSaleModalOpen(false);
              refreshData();
            } catch (error) {
              console.error(error);
            } finally {
              setIsSaving(false);
            }
          }}
          isSaving={isSaving}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={async (data) => {
            setIsSaving(true);
            try {
              await setDoc(doc(collection(db, "Gastos")), {
                ...data,
                created_at: new Date().toISOString(),
              });
              setIsExpenseModalOpen(false);
              refreshData();
            } catch (error) {
              console.error(error);
            } finally {
              setIsSaving(false);
            }
          }}
          isSaving={isSaving}
        />
      )}

      {isSaleListOpen && (
        <SaleListModal
          isOpen={isSaleListOpen}
          onClose={() => setIsSaleListOpen(false)}
          onChange={refreshData}
        />
      )}
      {isExpenseListOpen && (
        <ExpenseListModal
          isOpen={isExpenseListOpen}
          onClose={() => setIsExpenseListOpen(false)}
          onChange={refreshData}
        />
      )}
      {isProductListOpen && (
        <ProductListModal
          isOpen={isProductListOpen}
          onClose={() => setIsProductListOpen(false)}
        />
      )}
    </main>
  );
}
