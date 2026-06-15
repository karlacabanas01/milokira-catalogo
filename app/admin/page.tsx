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
  BookOpen,
  Truck,
} from "lucide-react";

import StatsOverview from "./components/StatsOverview";
import ExpenseModal from "./components/ExpenseModal";
import SaleModal from "./components/SaleModal";
import SaleListModal from "./components/SaleListModal";
import ExpenseListModal from "./components/ExpenseListModal";
import OrderModal from "./components/OrderModal";
import ProductListModal from "./components/ProductListModal";
import KnowledgeListModal from "./components/KnowledgeListModal";

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
    incomeWeek: 0,
    expenses: 0,
    profit: 0,
  });

  // Modales
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProductListOpen, setIsProductListOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

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
        let weekIncome = 0;
        let totalExpenses = 0;
        const pendingOrders: OrderType[] = [];
        // Lunes 00:00 de la semana en curso (calendario, lun→dom)
        const lunes = new Date();
        const diaSemana = lunes.getDay(); // 0=dom, 1=lun, …, 6=sáb
        const offset = (diaSemana + 6) % 7; // días desde el lunes
        lunes.setDate(lunes.getDate() - offset);
        lunes.setHours(0, 0, 0, 0);
        const inicioSemana = lunes.getTime();

        txSnap.forEach((documento) => {
          const data = documento.data();
          const monto = Number(data.total_amount) || 0;
          const estado = data.status ? data.status.toLowerCase() : "completado";

          if (estado !== "pending") {
            totalIncome += monto;
            const createdAt = data.created_at
              ? new Date(data.created_at).getTime()
              : 0;
            if (createdAt >= inicioSemana) {
              weekIncome += monto;
            }
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
          incomeWeek: weekIncome,
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
    <main className="relative min-h-screen bg-milokira-crema text-stone-800 pb-20 sm:pb-32 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Fondo decorativo con gradientes */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-125 h-125 bg-milokira-lila/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-125 h-125 bg-milokira-verde/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-100 h-100 bg-milokira-verde/10 rounded-full blur-3xl" />
      </div>

      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-2xl border-b border-stone-200">
        <div className="relative px-4 sm:px-8 py-4 w-full max-w-7xl mx-auto flex items-center justify-center">
          <Link
            href="/"
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 shrink-0"
          >
            <button className="group flex items-center gap-2 text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm font-semibold border border-stone-200 hover:border-stone-300">
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden xs:inline">Volver</span>
            </button>
          </Link>

          <p className="text-base sm:text-2xl text-milokira-verde font-black uppercase tracking-widest text-center">
            Panel de administración
          </p>
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 mt-2">
        {loading ? (
          <div className="text-center py-4 text-stone-500 text-sm">
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
        <div>
          <h2 className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 sm:mb-4 px-1">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <button
              onClick={() => setIsSaleModalOpen(true)}
              className="group relative overflow-hidden py-5 sm:py-6 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-stone-800 font-bold hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-900/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-linear-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-transparent transition-all" />
              <div className="relative p-2.5 sm:p-3 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/30 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <TrendingUp size={22} strokeWidth={2.5} />
              </div>
              <span className="relative text-xs sm:text-sm tracking-wide">Venta</span>
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="group relative overflow-hidden py-5 sm:py-6 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-stone-800 font-bold hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-900/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-linear-to-br from-rose-500/0 to-rose-500/0 group-hover:from-rose-500/10 group-hover:to-transparent transition-all" />
              <div className="relative p-2.5 sm:p-3 bg-rose-500/10 rounded-xl text-rose-600 border border-rose-500/30 group-hover:scale-110 group-hover:bg-rose-500/20 transition-all">
                <TrendingDown size={22} strokeWidth={2.5} />
              </div>
              <span className="relative text-xs sm:text-sm tracking-wide">Gasto</span>
            </button>
            <Link
              href="/admin/pedidos"
              className="group relative overflow-hidden py-5 sm:py-6 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-stone-800 font-bold hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-900/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-linear-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/10 group-hover:to-transparent transition-all" />
              <div className="relative p-2.5 sm:p-3 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/30 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                <ClipboardList size={22} strokeWidth={2.5} />
              </div>
              <span className="relative text-xs sm:text-sm tracking-wide">Pedido</span>
            </Link>
            <button
              onClick={() => setIsProductListOpen(true)}
              className="group relative overflow-hidden py-5 sm:py-6 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-stone-800 font-bold hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-900/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-linear-to-br from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/10 group-hover:to-transparent transition-all" />
              <div className="relative p-2.5 sm:p-3 bg-indigo-500/10 rounded-xl text-indigo-600 border border-indigo-500/30 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                <Package size={22} strokeWidth={2.5} />
              </div>
              <span className="relative text-xs sm:text-sm tracking-wide">Inventario</span>
            </button>
            <Link
              href="/admin/mercaderia"
              className="group relative overflow-hidden py-5 sm:py-6 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-stone-800 font-bold hover:border-milokira-verde/40 hover:shadow-xl hover:shadow-milokira-verde/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-linear-to-br from-milokira-verde/0 to-milokira-verde/0 group-hover:from-milokira-verde/10 group-hover:to-transparent transition-all" />
              <div className="relative p-2.5 sm:p-3 bg-milokira-verde/10 rounded-xl text-milokira-verde border border-milokira-verde/20 group-hover:scale-110 group-hover:bg-milokira-verde/20 transition-all">
                <Truck size={22} strokeWidth={2.5} />
              </div>
              <span className="relative text-xs sm:text-sm tracking-wide text-center">Mercadería</span>
            </Link>
            <button
              onClick={() => setIsKnowledgeOpen(true)}
              className="group relative overflow-hidden py-5 sm:py-6 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-stone-800 font-bold hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-900/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-linear-to-br from-teal-500/0 to-teal-500/0 group-hover:from-teal-500/10 group-hover:to-transparent transition-all" />
              <div className="relative p-2.5 sm:p-3 bg-teal-500/10 rounded-xl text-teal-600 border border-teal-500/30 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all">
                <BookOpen size={22} strokeWidth={2.5} />
              </div>
              <span className="relative text-xs sm:text-sm tracking-wide">Cerebro Kira</span>
            </button>
          </div>
        </div>

        {/* Sección de Pedidos Pendientes */}
        {!loading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h2 className="text-xs sm:text-sm font-bold text-stone-700 uppercase tracking-widest flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/30 shadow-sm">
                  <Clock size={14} className="sm:w-4 sm:h-4" />
                </div>
                Pedidos pendientes
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black shadow-md transition-colors ${orders.length > 0 ? "bg-linear-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-900/30" : "bg-stone-100 text-stone-500 border border-stone-300"}`}
              >
                {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>

            {orders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {orders.map((order) => (
                  <div
                    key={order.idFirebase}
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-stone-300 transition-all shadow-sm"
                  >
                    <button
                      type="button"
                      className="w-full p-3 sm:p-4 flex justify-between items-center cursor-pointer hover:bg-stone-50 transition-colors text-left"
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
                          <p className="text-stone-800 font-bold text-sm sm:text-base truncate">
                            {order.customer_name}
                          </p>
                          {order.delivery_type && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                                order.delivery_type === "delivery"
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {order.delivery_type === "delivery"
                                ? "Delivery"
                                : "Retiro"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs text-stone-500 flex items-center gap-1">
                          <Clock size={10} className="sm:w-3 sm:h-3" />{" "}
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-amber-600 font-mono font-bold text-sm sm:text-base block">
                          ${order.total_amount.toLocaleString()}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-stone-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
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
                      <div className="bg-milokira-crema/50 p-3 sm:p-4 border-t border-stone-200">
                        <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                          {order.items?.map((item, idx) => (
                            <li
                              key={`${order.idFirebase}-${item.product_id || item.nombre || idx}`}
                              className="flex justify-between text-xs sm:text-sm text-stone-700"
                            >
                              <span className="truncate pr-2">
                                • {item.nombre || "Planta"}{" "}
                                <span className="text-stone-500 text-[10px] sm:text-xs">
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
                            <div className="flex justify-between text-xs sm:text-sm text-indigo-700 font-semibold mb-3 sm:mb-4 pt-1 border-t border-stone-200/60">
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
              <div className="bg-white/60 border border-dashed border-stone-200 rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl" />
                  <div className="relative bg-linear-to-br from-indigo-500/20 to-indigo-600/10 p-5 rounded-2xl border border-indigo-500/20">
                    <ClipboardList size={32} className="text-indigo-400" strokeWidth={2} />
                  </div>
                </div>
                <h3 className="text-stone-800 text-base sm:text-lg font-bold mb-1.5">
                  Todo en orden
                </h3>
                <p className="text-stone-500 text-xs sm:text-sm mb-6 font-medium max-w-xs">
                  No tienes pedidos pendientes por completar. ¡Aprovecha para registrar uno nuevo!
                </p>
                <button
                  onClick={() => {
                    setEditingOrder(null);
                    setIsOrderModalOpen(true);
                  }}
                  className="bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/40 transition-all active:scale-95 flex items-center gap-2 group"
                >
                  <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
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
      {isKnowledgeOpen && (
        <KnowledgeListModal
          isOpen={isKnowledgeOpen}
          onClose={() => setIsKnowledgeOpen(false)}
        />
      )}
    </main>
  );
}
