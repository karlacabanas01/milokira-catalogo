"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import OrderModal from "../components/OrderModal";
import {
  ArrowLeft,
  MapPin,
  Phone,
  StickyNote,
  Truck,
  CheckCircle,
  Plus,
  Printer,
  Map as MapIcon,
  MessageCircle,
  PhoneCall,
  ChevronUp,
  ChevronDown,
  Package,
  Calendar,
} from "lucide-react";

type DeliveryDay = "martes" | "viernes" | "otro" | "";

type OrderItem = {
  product_id?: string;
  nombre?: string;
  quantity: number;
  unit_price: number;
};

type Order = {
  idFirebase: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_type?: "delivery" | "retiro";
  delivery_fee?: number;
  address?: string;
  phone?: string;
  notes?: string;
  delivery_day?: DeliveryDay;
  items: OrderItem[];
};

type Filter = "todos" | "martes" | "viernes" | "retiro";

const ORDER_STORAGE_KEY = "milokira-pedidos-order";

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "Transacciones"));
        const list: Order[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const estado = data.status ? data.status.toLowerCase() : "completado";
          if (estado === "pending" && data.tipo === "pedido") {
            list.push({ idFirebase: d.id, ...data } as Order);
          }
        });

        const savedOrder = JSON.parse(
          localStorage.getItem(ORDER_STORAGE_KEY) || "[]",
        ) as string[];

        list.sort((a, b) => {
          const ai = savedOrder.indexOf(a.idFirebase);
          const bi = savedOrder.indexOf(b.idFirebase);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        setOrders(list);
      } catch (err) {
        console.error("Error cargando pedidos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [refreshKey]);

  const persistOrder = (next: Order[]) => {
    const ids = next.map((o) => o.idFirebase);
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(ids));
  };

  const moveOrder = (idFirebase: string, direction: -1 | 1) => {
    setOrders((prev) => {
      const visible = applyFilter(prev, filter);
      const idx = visible.findIndex((o) => o.idFirebase === idFirebase);
      if (idx === -1) return prev;
      const swapWith = idx + direction;
      if (swapWith < 0 || swapWith >= visible.length) return prev;

      const fromGlobal = prev.findIndex((o) => o.idFirebase === visible[idx].idFirebase);
      const toGlobal = prev.findIndex((o) => o.idFirebase === visible[swapWith].idFirebase);

      const next = [...prev];
      [next[fromGlobal], next[toGlobal]] = [next[toGlobal], next[fromGlobal]];
      persistOrder(next);
      return next;
    });
  };

  const handleComplete = async (order: Order) => {
    if (
      !confirm(
        `¿Marcar como entregado el pedido de ${order.customer_name}?\nTotal: $${order.total_amount.toLocaleString("es-CL")}`,
      )
    )
      return;

    try {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.product_id) {
            const ref = doc(db, "Plantas", item.product_id);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const stock = Number(snap.data().stock) || 0;
              if (stock < item.quantity) {
                alert(
                  `Stock insuficiente para "${item.nombre}". Tienes ${stock}, necesitas ${item.quantity}.`,
                );
                return;
              }
              await updateDoc(ref, { stock: stock - item.quantity });
            }
          }
        }
      }

      await updateDoc(doc(db, "Transacciones", order.idFirebase), {
        status: "completado",
      });

      setOrders((prev) => prev.filter((o) => o.idFirebase !== order.idFirebase));
    } catch (err) {
      console.error(err);
      alert("Error al completar el pedido.");
    }
  };

  const visibleOrders = applyFilter(orders, filter);

  const counts = {
    todos: orders.length,
    martes: orders.filter((o) => o.delivery_day === "martes").length,
    viernes: orders.filter((o) => o.delivery_day === "viernes").length,
    retiro: orders.filter((o) => o.delivery_type === "retiro").length,
  };

  const totalDia = visibleOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);

  return (
    <main className="relative min-h-screen bg-zinc-950 text-zinc-100 pb-20 sm:pb-32 font-sans overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-125 h-125 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-125 h-125 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="sticky top-0 z-20 bg-zinc-950/70 backdrop-blur-2xl border-b border-zinc-800/60">
        <div className="px-4 sm:px-8 py-4 w-full max-w-400 mx-auto flex items-center justify-between gap-4">
          <Link href="/admin" className="shrink-0">
            <button className="group flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm font-semibold border border-zinc-800 hover:border-zinc-700">
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden xs:inline">Admin</span>
            </button>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 shrink-0">
              <Truck size={18} className="text-white sm:w-5 sm:h-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black tracking-tight truncate">
                Ruta de pedidos
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-medium hidden sm:block">
                Organiza tus entregas del día
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <Calendar size={14} className="text-amber-400" />
            <span className="text-xs text-zinc-400 font-medium">
              {visibleOrders.length} {visibleOrders.length === 1 ? "pedido" : "pedidos"}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-8 w-full max-w-400 mx-auto space-y-5">
        {/* Acciones principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-linear-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-white py-3.5 sm:py-4 rounded-2xl shadow-lg shadow-amber-900/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 font-black tracking-wide text-sm sm:text-base"
          >
            <Plus size={18} strokeWidth={3} />
            Nuevo pedido
          </button>
          <button
            type="button"
            disabled={visibleOrders.length === 0}
            onClick={() => {
              window.open(`/admin/pedidos/imprimir?filter=${filter}`, "_blank");
            }}
            className="bg-linear-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white py-3.5 sm:py-4 rounded-2xl shadow-lg shadow-emerald-900/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 font-black tracking-wide text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={18} strokeWidth={3} />
            Imprimir hoja
          </button>
        </div>

        {/* Filtros */}
        <div>
          <h2 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">
            Filtrar por
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <FilterChip
              label="Todos"
              count={counts.todos}
              active={filter === "todos"}
              onClick={() => setFilter("todos")}
              color="amber"
            />
            <FilterChip
              label="Martes"
              count={counts.martes}
              active={filter === "martes"}
              onClick={() => setFilter("martes")}
              color="indigo"
            />
            <FilterChip
              label="Viernes"
              count={counts.viernes}
              active={filter === "viernes"}
              onClick={() => setFilter("viernes")}
              color="indigo"
            />
            <FilterChip
              label="Retiro"
              count={counts.retiro}
              active={filter === "retiro"}
              onClick={() => setFilter("retiro")}
              color="emerald"
            />
          </div>
        </div>

        {/* Stats */}
        {!loading && visibleOrders.length > 0 && (
          <div className="grid grid-cols-2 gap-3 bg-linear-to-br from-zinc-900 to-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                A entregar
              </p>
              <p className="text-2xl font-black text-amber-400">
                {visibleOrders.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Total a cobrar
              </p>
              <p className="text-2xl font-black bg-linear-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                ${totalDia.toLocaleString("es-CL")}
              </p>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-10 text-zinc-500 text-sm">
            Cargando pedidos…
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-linear-to-br from-zinc-900/60 to-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl" />
              <div className="relative bg-linear-to-br from-amber-500/20 to-amber-600/10 p-5 rounded-2xl border border-amber-500/20">
                <Truck size={32} className="text-amber-400" strokeWidth={2} />
              </div>
            </div>
            <h3 className="text-zinc-200 text-base sm:text-lg font-bold mb-1.5">
              Sin pedidos en este filtro
            </h3>
            <p className="text-zinc-500 text-xs sm:text-sm font-medium max-w-xs">
              Cambia el filtro o crea un nuevo pedido desde el panel admin.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleOrders.map((order, idx) => (
              <OrderCard
                key={order.idFirebase}
                order={order}
                position={idx + 1}
                isFirst={idx === 0}
                isLast={idx === visibleOrders.length - 1}
                expanded={expanded === order.idFirebase}
                onToggleExpand={() =>
                  setExpanded(expanded === order.idFirebase ? null : order.idFirebase)
                }
                onMoveUp={() => moveOrder(order.idFirebase, -1)}
                onMoveDown={() => moveOrder(order.idFirebase, 1)}
                onComplete={() => handleComplete(order)}
              />
            ))}
          </ul>
        )}
      </div>

      {isOrderModalOpen && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </main>
  );
}

function applyFilter(orders: Order[], filter: Filter): Order[] {
  if (filter === "todos") return orders;
  if (filter === "retiro") return orders.filter((o) => o.delivery_type === "retiro");
  return orders.filter((o) => o.delivery_day === filter);
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  color,
}: {
  readonly label: string;
  readonly count: number;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly color: "amber" | "indigo" | "emerald";
}) {
  const colorMap = {
    amber: active
      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-900/30"
      : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-amber-500/30 hover:text-amber-400",
    indigo: active
      ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-900/30"
      : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-indigo-500/30 hover:text-indigo-400",
    emerald: active
      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-900/30"
      : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400",
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${colorMap[color]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-black mt-0.5">{count}</p>
    </button>
  );
}

function OrderCard({
  order,
  position,
  isFirst,
  isLast,
  expanded,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onComplete,
}: {
  readonly order: Order;
  readonly position: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onComplete: () => void;
}) {
  const isDelivery = order.delivery_type === "delivery";

  const mapsUrl = order.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`
    : null;

  const cleanPhone = (order.phone || "").replace(/[^\d+]/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.replace(/^\+/, "")}?text=${encodeURIComponent(
        `Hola ${order.customer_name}! Soy de Milokira 🌿 Voy en camino con tu pedido.`,
      )}`
    : null;
  const telUrl = cleanPhone ? `tel:${cleanPhone}` : null;

  return (
    <li className="bg-linear-to-br from-zinc-900 to-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      <div className="flex">
        {/* Columna de orden */}
        <div className="flex flex-col items-center justify-center px-2 sm:px-3 py-3 border-r border-zinc-800/60 bg-zinc-950/40 shrink-0 gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Subir"
          >
            <ChevronUp size={14} />
          </button>
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black">
            {position}
          </div>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Bajar"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Contenido */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 p-3 sm:p-4 text-left hover:bg-zinc-800/40 transition-colors min-w-0"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-amber-100 font-bold text-sm sm:text-base truncate">
                  {order.customer_name}
                </h3>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide shrink-0 ${
                    isDelivery
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {isDelivery ? "Delivery" : "Retiro"}
                </span>
                {order.delivery_day && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                    {order.delivery_day}
                  </span>
                )}
              </div>

              {order.address && (
                <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-zinc-400 mb-1">
                  <MapPin size={11} className="shrink-0 mt-0.5 text-indigo-400" />
                  <span className="line-clamp-2">{order.address}</span>
                </div>
              )}
              {order.phone && (
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400 mb-1">
                  <Phone size={11} className="shrink-0 text-emerald-400" />
                  <span>{order.phone}</span>
                </div>
              )}
              {order.notes && (
                <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-zinc-500 italic">
                  <StickyNote size={11} className="shrink-0 mt-0.5 text-amber-400" />
                  <span className="line-clamp-2">{order.notes}</span>
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-amber-400 font-mono font-bold text-sm sm:text-base block">
                ${order.total_amount.toLocaleString("es-CL")}
              </span>
              <div className="flex items-center justify-end gap-1 text-zinc-500 text-[10px] sm:text-xs mt-0.5">
                <Package size={10} />
                {order.items?.length || 0}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Acciones rápidas */}
      <div className="px-3 sm:px-4 py-2 border-t border-zinc-800/60 bg-zinc-950/40 flex flex-wrap gap-2">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all active:scale-95"
          >
            <MapIcon size={13} />
            Maps
          </a>
        )}
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
          >
            <MessageCircle size={13} />
            WhatsApp
          </a>
        )}
        {telUrl && (
          <a
            href={telUrl}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition-all active:scale-95"
          >
            <PhoneCall size={13} />
            Llamar
          </a>
        )}
        <button
          onClick={onComplete}
          className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all active:scale-95 shadow-md shadow-emerald-900/30"
        >
          <CheckCircle size={13} strokeWidth={2.5} />
          Entregado
        </button>
      </div>

      {expanded && (
        <div className="bg-black/40 px-4 py-3 border-t border-zinc-800/60">
          <ul className="space-y-1.5">
            {order.items?.map((item) => (
              <li
                key={item.product_id || item.nombre}
                className="flex justify-between text-xs sm:text-sm text-zinc-300"
              >
                <span className="truncate pr-2">
                  • {item.nombre || "Planta"}{" "}
                  <span className="text-zinc-500 text-[10px]">(x{item.quantity})</span>
                </span>
                <span className="shrink-0 font-mono">
                  ${(item.unit_price * item.quantity).toLocaleString("es-CL")}
                </span>
              </li>
            ))}
          </ul>
          {isDelivery && order.delivery_fee != null && order.delivery_fee > 0 && (
            <div className="flex justify-between text-xs sm:text-sm text-indigo-400 mt-2 pt-2 border-t border-zinc-800/50">
              <span>Delivery</span>
              <span>${order.delivery_fee.toLocaleString("es-CL")}</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
