"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { repartirPedido } from "../robinHelpers";
import OrderModal from "../components/OrderModal";
import type { TicketOrder } from "./ticketImg";

const TICKET_STORAGE_KEY = "milokira-tickets-print";

function openTicketPage(orders: TicketOrder[]) {
  if (orders.length === 0) return;
  sessionStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(orders));
  window.open("/admin/pedidos/ticket", "_blank");
}
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
  Trash2,
  Pencil,
  Save,
  X,
  Edit3,
  FileText,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

type DeliveryDay = string;

const ORDEN_DIAS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

type OrderItem = {
  product_id?: string;
  nombre?: string;
  quantity: number;
  unit_price: number;
  /** El monto lo cobra el compañero de ventas; no es ingreso del vivero. */
  es_de_companero?: boolean;
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
  admin_notes?: string;
  delivery_day?: DeliveryDay;
  sector?: string;
  lat?: number;
  lng?: number;
  items: OrderItem[];
};

type Filter = string; // "todos" | "retiro" | "atrasados" | nombre de día

// Un pedido pendiente con más de dos semanas se considera muy atrasado.
const DIAS_PARA_ATRASO = 14;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Días transcurridos desde que se creó el pedido. */
export const diasDesde = (createdAt: string, ahora = Date.now()): number => {
  const creado = new Date(createdAt).getTime();
  if (!creado || Number.isNaN(creado)) return 0;
  return Math.floor((ahora - creado) / MS_POR_DIA);
};

/** true si el pedido lleva más de dos semanas esperando. */
export const estaMuyAtrasado = (order: { created_at: string }, ahora = Date.now()): boolean =>
  diasDesde(order.created_at, ahora) >= DIAS_PARA_ATRASO;

// Punto base (Bicentenario, Talca)
const HOME_LAT = -35.4364;
const HOME_LNG = -71.6105;



const ORDER_STORAGE_KEY = "milokira-pedidos-order";

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todos");
  const [vista, setVista] = useState<"cards" | "tabla">("cards");



  const buildRouteUrl = (orders: Order[]) => {
    const stops = orders
      .filter((o) => o.delivery_type === "delivery")
      .map((o) => {
        if (o.lat != null && o.lng != null) return `${o.lat},${o.lng}`;
        if (o.address) return encodeURIComponent(`${o.address}, Talca, Chile`);
        return null;
      })
      .filter((s): s is string => Boolean(s));
    if (stops.length === 0) return null;
    const origin = `${HOME_LAT},${HOME_LNG}`;
    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(0, -1).join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ""
    }&travelmode=driving`;
  };
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
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
      // Debe verse igual que la lista en pantalla: si no se aplica el mismo
      // empuje de atrasados, los índices no calzan y la flecha mueve otro.
      const visible =
        filter === "atrasados"
          ? applyFilter(prev, filter)
          : empujarAtrasadosAlFinal(applyFilter(prev, filter));
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

  const handleDelete = async (order: Order) => {
    if (
      !confirm(
        `¿Borrar el pedido de ${order.customer_name}? Esta acción no se puede deshacer.`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "Transacciones", order.idFirebase));
      setOrders((prev) => prev.filter((o) => o.idFirebase !== order.idFirebase));
    } catch (err) {
      console.error(err);
      alert("Error al borrar el pedido.");
    }
  };

  const handleSaveAdminNotes = async (order: Order, value: string) => {
    try {
      await updateDoc(doc(db, "Transacciones", order.idFirebase), {
        admin_notes: value,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.idFirebase === order.idFirebase ? { ...o, admin_notes: value } : o,
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Error al guardar la nota.");
    }
  };

  const filteredOrders = applyFilter(orders, filter);
  // El orden es el que define el usuario con las flechas de cada pedido.
  let visibleOrders = filteredOrders;
  // Los muy atrasados van siempre al final, sin importar cómo se ordenó antes:
  // así no se cuelan en medio de la ruta del día. Entre ellos, el más viejo
  // primero. Se omite en el filtro "atrasados", donde son la lista completa.
  if (filter !== "atrasados") {
    visibleOrders = empujarAtrasadosAlFinal(visibleOrders);
  }

  const counts = {
    todos: orders.length,
    retiro: orders.filter((o) => o.delivery_type === "retiro").length,
    atrasados: orders.filter((o) => estaMuyAtrasado(o)).length,
  };

  // Días con al menos un pedido, ordenados de lunes a domingo
  const diasConPedidos = ORDEN_DIAS.filter((dia) =>
    orders.some((o) => (o.delivery_day || "").toLowerCase() === dia),
  );
  const countsPorDia = Object.fromEntries(
    diasConPedidos.map((dia) => [
      dia,
      orders.filter((o) => (o.delivery_day || "").toLowerCase() === dia).length,
    ]),
  );

  const totalDia = visibleOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);

  return (
    <main className="relative min-h-screen bg-milokira-crema patron-muro text-stone-800 pb-20 sm:pb-32 font-sans overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-125 h-125 bg-milokira-lila/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-125 h-125 bg-milokira-verde/20 rounded-full blur-3xl" />
      </div>

      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-2xl border-b border-milokira-lila/30">
        <div className="px-4 sm:px-8 py-4 w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/admin" className="shrink-0">
            <button className="group flex items-center gap-2 text-stone-500 hover:text-milokira-verde bg-white hover:bg-milokira-verde/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm font-semibold border border-stone-200 hover:border-milokira-verde/40">
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden xs:inline">Admin</span>
            </button>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-linear-to-br from-milokira-verde to-milokira-verde/70 flex items-center justify-center shadow-md shadow-milokira-verde/30 shrink-0">
              <Truck size={18} className="text-white sm:w-5 sm:h-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black tracking-tight truncate text-stone-800">
                Ruta de pedidos
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-500 font-medium hidden sm:block">
                Organiza tus entregas del día
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-stone-200">
            <Calendar size={14} className="text-milokira-verde" />
            <span className="text-xs text-stone-600 font-semibold">
              {visibleOrders.length} {visibleOrders.length === 1 ? "pedido" : "pedidos"}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-5">
        {/* Acciones principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingOrder(null);
              setIsOrderModalOpen(true);
            }}
            className="bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-white py-3.5 sm:py-4 rounded-2xl shadow-md shadow-amber-300/40 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 font-black tracking-wide text-sm sm:text-base"
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
            className="bg-milokira-verde hover:bg-milokira-verde/90 text-white py-3.5 sm:py-4 rounded-2xl shadow-md shadow-milokira-verde/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 font-black tracking-wide text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={18} strokeWidth={3} />
            Imprimir hoja
          </button>
          <button
            type="button"
            disabled={
              visibleOrders.filter((o) => o.delivery_type === "delivery").length === 0
            }
            onClick={() => {
              const url = buildRouteUrl(visibleOrders);
              if (url) window.open(url, "_blank");
            }}
            className="bg-milokira-lila hover:bg-milokira-lila/80 text-stone-800 py-3.5 sm:py-4 rounded-2xl shadow-md shadow-milokira-lila/40 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 font-black tracking-wide text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MapIcon size={18} strokeWidth={3} />
            Ruta en Maps
          </button>
          <button
            type="button"
            disabled={visibleOrders.length === 0}
            onClick={() => openTicketPage(visibleOrders)}
            className="bg-stone-700 hover:bg-stone-600 text-white py-3.5 sm:py-4 rounded-2xl shadow-md shadow-stone-400/40 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 font-black tracking-wide text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText size={18} strokeWidth={3} />
            Tickets de todos
          </button>
        </div>

        {/* Filtros */}
        <div>
          <h2 className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 px-1">
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
              label="Retiro"
              count={counts.retiro}
              active={filter === "retiro"}
              onClick={() => setFilter("retiro")}
              color="emerald"
            />
            {counts.atrasados > 0 && (
              <FilterChip
                label="Muy atrasados"
                count={counts.atrasados}
                active={filter === "atrasados"}
                onClick={() => setFilter("atrasados")}
                color="rose"
              />
            )}
            {diasConPedidos.map((dia) => (
              <FilterChip
                key={dia}
                label={dia.charAt(0).toUpperCase() + dia.slice(1)}
                count={countsPorDia[dia]}
                active={filter === dia}
                onClick={() => setFilter(dia)}
                color="indigo"
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        {!loading && visibleOrders.length > 0 && (
          <div className="grid grid-cols-2 gap-3 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                A entregar
              </p>
              <p className="text-2xl font-black text-amber-600">
                {visibleOrders.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Total a cobrar
              </p>
              <p className="text-2xl font-black text-milokira-verde">
                ${totalDia.toLocaleString("es-CL")}
              </p>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-10 text-stone-500 text-sm">
            Cargando pedidos…
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-amber-300/30 rounded-full blur-2xl" />
              <div className="relative bg-amber-50 p-5 rounded-2xl border border-amber-200">
                <Truck size={32} className="text-amber-600" strokeWidth={2} />
              </div>
            </div>
            <h3 className="text-stone-800 text-base sm:text-lg font-bold mb-1.5">
              Sin pedidos en este filtro
            </h3>
            <p className="text-stone-500 text-xs sm:text-sm font-medium max-w-xs">
              Cambia el filtro o crea un nuevo pedido desde el panel admin.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end">
              <div className="inline-flex bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                <button
                  type="button"
                  onClick={() => setVista("cards")}
                  aria-label="Vista cards"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                    vista === "cards"
                      ? "bg-white text-milokira-verde shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <LayoutGrid size={11} strokeWidth={2.5} />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setVista("tabla")}
                  aria-label="Vista tabla"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                    vista === "tabla"
                      ? "bg-white text-milokira-verde shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <TableIcon size={11} strokeWidth={2.5} />
                  Tabla
                </button>
              </div>
            </div>

            {vista === "cards" ? (
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
                    onDelete={() => handleDelete(order)}
                    onSaveAdminNotes={(notes) => handleSaveAdminNotes(order, notes)}
                    onEdit={() => {
                      setEditingOrder(order);
                      setIsOrderModalOpen(true);
                    }}
                    onPdf={() => openTicketPage([order])}
                  />
                ))}
              </ul>
            ) : (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-milokira-crema/60">
                      <tr className="text-[9px] sm:text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        {(
                          <th className="px-1 py-2 text-center w-10">Orden</th>
                        )}
                        <th className="px-2 sm:px-3 py-2 text-center w-8">#</th>
                        <th className="px-2 sm:px-3 py-2 text-left">Cliente</th>
                        <th className="px-2 py-2 text-left hidden md:table-cell">
                          Sector
                        </th>
                        <th className="px-2 py-2 text-left hidden lg:table-cell">
                          Día
                        </th>
                        <th className="px-2 py-2 text-center hidden md:table-cell">
                          Hora
                        </th>
                        <th className="px-2 py-2 text-center hidden xs:table-cell">
                          Tipo
                        </th>
                        <th className="px-2 py-2 text-right">Total</th>
                        <th className="px-2 py-2 text-right">Acciones</th>
                        <th className="px-1 py-2 w-8" aria-label="Expandir" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {visibleOrders.map((order, idx) => {
                        const isExpanded = expanded === order.idFirebase;
                        const colSpan = 10;
                        return (
                          <Fragment key={order.idFirebase}>
                            <tr className="hover:bg-milokira-crema/30 transition-colors">
                              {(
                                <td className="px-1 py-2">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <button
                                      onClick={() =>
                                        moveOrder(order.idFirebase, -1)
                                      }
                                      disabled={idx === 0}
                                      className="text-stone-400 hover:text-milokira-verde disabled:opacity-25 disabled:cursor-not-allowed p-0.5"
                                      title="Subir"
                                      aria-label="Subir"
                                    >
                                      <ChevronUp size={14} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        moveOrder(order.idFirebase, 1)
                                      }
                                      disabled={idx === visibleOrders.length - 1}
                                      className="text-stone-400 hover:text-milokira-verde disabled:opacity-25 disabled:cursor-not-allowed p-0.5"
                                      title="Bajar"
                                      aria-label="Bajar"
                                    >
                                      <ChevronDown
                                        size={14}
                                        strokeWidth={2.5}
                                      />
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td className="px-2 sm:px-3 py-2 text-center text-stone-500 font-bold">
                                {idx + 1}
                              </td>
                              <td className="px-2 sm:px-3 py-2">
                                <p className="font-bold text-stone-800 truncate max-w-35 sm:max-w-50">
                                  {order.customer_name}
                                </p>
                                {order.phone && (
                                  <p className="text-[10px] text-stone-500 truncate max-w-35 sm:max-w-50">
                                    {order.phone}
                                  </p>
                                )}
                              </td>
                              <td className="px-2 py-2 hidden md:table-cell">
                                <span className="text-stone-700 text-[11px] truncate block max-w-35">
                                  {order.sector || "—"}
                                </span>
                              </td>
                              <td className="px-2 py-2 hidden lg:table-cell">
                                <span className="text-stone-700 text-[11px] capitalize">
                                  {order.delivery_day || "—"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center hidden md:table-cell">
                                <span className="text-stone-700 text-[11px] font-mono">
                                  {new Date(order.created_at).toLocaleTimeString(
                                    "es-CL",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center hidden xs:table-cell">
                                <span
                                  className={`inline-flex px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wide ${
                                    order.delivery_type === "delivery"
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {order.delivery_type === "delivery"
                                    ? "Delivery"
                                    : "Retiro"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right font-mono font-bold text-amber-600 whitespace-nowrap">
                                ${order.total_amount.toLocaleString("es-CL")}
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-end gap-0.5">
                                  <button
                                    onClick={() => openTicketPage([order])}
                                    className="text-stone-500 hover:text-stone-800 p-1.5 rounded hover:bg-stone-100 transition-colors"
                                    title="Imprimir ticket"
                                    aria-label="Imprimir"
                                  >
                                    <Printer size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingOrder(order);
                                      setIsOrderModalOpen(true);
                                    }}
                                    className="text-stone-500 hover:text-indigo-700 p-1.5 rounded hover:bg-indigo-50 transition-colors"
                                    title="Editar"
                                    aria-label="Editar"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleComplete(order)}
                                    className="text-stone-500 hover:text-milokira-verde p-1.5 rounded hover:bg-milokira-verde/10 transition-colors"
                                    title="Completar"
                                    aria-label="Completar"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(order)}
                                    className="text-stone-500 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors"
                                    title="Eliminar"
                                    aria-label="Eliminar"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-1 py-2 text-center">
                                <button
                                  onClick={() =>
                                    setExpanded(
                                      isExpanded ? null : order.idFirebase,
                                    )
                                  }
                                  className="text-stone-500 hover:text-stone-800 p-1.5 rounded hover:bg-stone-100 transition-colors"
                                  title={
                                    isExpanded ? "Cerrar detalle" : "Ver detalle"
                                  }
                                  aria-label="Detalle"
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? (
                                    <ChevronUp size={14} />
                                  ) : (
                                    <ChevronDown size={14} />
                                  )}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-milokira-crema/40">
                                <td
                                  colSpan={colSpan}
                                  className="px-3 sm:px-5 py-4"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
                                        Items ({order.items?.length || 0})
                                      </p>
                                      <ul className="space-y-1">
                                        {order.items?.map((item, i) => (
                                          <li
                                            key={`${order.idFirebase}-${item.product_id || item.nombre || i}`}
                                            className="flex justify-between gap-2 text-stone-700"
                                          >
                                            <span className="truncate">
                                              • {item.nombre || "Planta"}{" "}
                                              <span className="text-stone-500">
                                                (x{item.quantity})
                                              </span>
                                            </span>
                                            <span className="font-mono shrink-0">
                                              $
                                              {(
                                                item.unit_price * item.quantity
                                              ).toLocaleString("es-CL")}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                      {order.delivery_type === "delivery" &&
                                        order.delivery_fee != null &&
                                        order.delivery_fee > 0 && (
                                          <div className="flex justify-between mt-2 pt-2 border-t border-stone-200 text-indigo-700 font-semibold">
                                            <span>Delivery</span>
                                            <span className="font-mono">
                                              $
                                              {order.delivery_fee.toLocaleString(
                                                "es-CL",
                                              )}
                                            </span>
                                          </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                      {order.address && (
                                        <div>
                                          <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                                            Dirección
                                          </p>
                                          <p className="text-stone-700">
                                            {order.address}
                                          </p>
                                        </div>
                                      )}
                                      {order.notes && (
                                        <div>
                                          <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                                            Notas del cliente
                                          </p>
                                          <p className="text-stone-700 whitespace-pre-wrap">
                                            {order.notes}
                                          </p>
                                        </div>
                                      )}
                                      {order.admin_notes && (
                                        <div>
                                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                                            Notas admin
                                          </p>
                                          <p className="text-stone-700 whitespace-pre-wrap">
                                            {order.admin_notes}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isOrderModalOpen && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setEditingOrder(null);
          }}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          editingOrder={editingOrder}
        />
      )}
    </main>
  );
}

/**
 * Mueve los pedidos muy atrasados al final, conservando el orden que traían
 * los demás (el de la ruta, el sector o el manual). Entre los atrasados deja
 * primero al que lleva más tiempo esperando.
 */
export function empujarAtrasadosAlFinal(orders: Order[]): Order[] {
  const alDia: Order[] = [];
  const atrasados: Order[] = [];
  for (const o of orders) {
    (estaMuyAtrasado(o) ? atrasados : alDia).push(o);
  }
  if (atrasados.length === 0) return orders;
  atrasados.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return [...alDia, ...atrasados];
}

function applyFilter(orders: Order[], filter: Filter): Order[] {
  if (filter === "todos") return orders;
  if (filter === "atrasados") return orders.filter((o) => estaMuyAtrasado(o));
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
  readonly color: "amber" | "indigo" | "emerald" | "rose";
}) {
  const colorMap = {
    amber: active
      ? "bg-amber-50 border-amber-400 text-amber-700 shadow-md shadow-amber-200"
      : "bg-white border-stone-200 text-stone-500 hover:border-amber-300 hover:text-amber-600",
    indigo: active
      ? "bg-milokira-lila/20 border-milokira-lila text-stone-700 shadow-md shadow-milokira-lila/40"
      : "bg-white border-stone-200 text-stone-500 hover:border-milokira-lila hover:text-stone-700",
    emerald: active
      ? "bg-milokira-verde/10 border-milokira-verde text-milokira-verde shadow-md shadow-milokira-verde/20"
      : "bg-white border-stone-200 text-stone-500 hover:border-milokira-verde/50 hover:text-milokira-verde",
    rose: active
      ? "bg-rose-50 border-rose-400 text-rose-700 shadow-md shadow-rose-200"
      : "bg-white border-rose-200 text-rose-500 hover:border-rose-400 hover:text-rose-700",
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${colorMap[color]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider opacity-70 truncate">
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
  onDelete,
  onSaveAdminNotes,
  onEdit,
  onPdf,
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
  readonly onDelete: () => void;
  readonly onSaveAdminNotes: (notes: string) => void;
  readonly onEdit: () => void;
  readonly onPdf: () => void;
}) {
  const [editingAdminNote, setEditingAdminNote] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState(order.admin_notes || "");

  const isDelivery = order.delivery_type === "delivery";
  // Mismo reparto que usa la card del panel, sin el filtro de estado/fecha:
  // acá los pedidos son pendientes y también necesitan ver su desglose.
  const totalCompanero =
    repartirPedido(order as Parameters<typeof repartirPedido>[0])?.total ?? 0;

  const diasEsperando = diasDesde(order.created_at);
  const muyAtrasado = estaMuyAtrasado(order);

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
    <li
      className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        muyAtrasado ? "bg-rose-50 border-rose-300" : "bg-white border-stone-200"
      }`}
    >
      <div className="flex">
        {/* Columna de orden */}
        <div
          className={`flex flex-col items-center justify-center px-2 sm:px-3 py-3 border-r shrink-0 gap-1 ${
            muyAtrasado
              ? "border-rose-200 bg-rose-100/50"
              : "border-stone-100 bg-milokira-crema/40"
          }`}
        >
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded text-stone-400 hover:text-milokira-verde hover:bg-milokira-verde/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Subir"
          >
            <ChevronUp size={14} />
          </button>
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 text-xs font-black">
            {position}
          </div>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded text-stone-400 hover:text-milokira-verde hover:bg-milokira-verde/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Bajar"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Contenido */}
        <button
          type="button"
          onClick={onToggleExpand}
          className={`flex-1 p-3 sm:p-4 text-left transition-colors min-w-0 ${
            muyAtrasado
              ? "hover:bg-rose-100/60"
              : "hover:bg-milokira-crema/40"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-stone-800 font-bold text-sm sm:text-base truncate">
                  {order.customer_name}
                </h3>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide shrink-0 ${
                    isDelivery
                      ? "bg-milokira-lila/30 text-stone-700 border border-milokira-lila"
                      : "bg-milokira-verde/15 text-milokira-verde border border-milokira-verde/40"
                  }`}
                >
                  {isDelivery ? "Delivery" : "Retiro"}
                </span>
                {muyAtrasado && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700 border border-rose-300 shrink-0"
                    title={`Pendiente hace ${diasEsperando} días`}
                  >
                    ⏰ {diasEsperando} días
                  </span>
                )}
                {order.delivery_day && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                    {order.delivery_day}
                  </span>
                )}
                {order.sector && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-milokira-verde/10 text-milokira-verde border border-milokira-verde/30 shrink-0">
                    {order.sector}
                  </span>
                )}
              </div>

              {order.address && (
                <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-stone-600 mb-1">
                  <MapPin size={11} className="shrink-0 mt-0.5 text-milokira-lila" />
                  <span className="line-clamp-2">{order.address}</span>
                </div>
              )}
              {order.phone && (
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-600 mb-1">
                  <Phone size={11} className="shrink-0 text-milokira-verde" />
                  <span>{order.phone}</span>
                </div>
              )}
              {order.notes && (
                <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-stone-500 italic">
                  <StickyNote size={11} className="shrink-0 mt-0.5 text-amber-500" />
                  <span className="line-clamp-2">{order.notes}</span>
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-amber-600 font-mono font-bold text-sm sm:text-base block">
                ${order.total_amount.toLocaleString("es-CL")}
              </span>
              <div className="flex items-center justify-end gap-1 text-stone-500 text-[10px] sm:text-xs mt-0.5">
                <Package size={10} />
                {order.items?.length || 0}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Acciones rápidas */}
      <div
        className={`px-3 sm:px-4 py-2 border-t flex flex-wrap gap-2 ${
          muyAtrasado
            ? "border-rose-200 bg-rose-100/40"
            : "border-stone-100 bg-milokira-crema/30"
        }`}
      >
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[88px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-milokira-lila/20 hover:bg-milokira-lila/40 text-stone-700 border border-milokira-lila text-xs font-bold transition-all active:scale-95"
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
            className="flex-1 min-w-[88px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-milokira-verde/15 hover:bg-milokira-verde/25 text-milokira-verde border border-milokira-verde/40 text-xs font-bold transition-all active:scale-95"
          >
            <MessageCircle size={13} />
            WhatsApp
          </a>
        )}
        {telUrl && (
          <a
            href={telUrl}
            className="flex-1 min-w-[88px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold transition-all active:scale-95"
          >
            <PhoneCall size={13} />
            Llamar
          </a>
        )}
        <button
          onClick={onComplete}
          className="flex-1 min-w-[96px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-milokira-verde hover:bg-milokira-verde/90 text-white text-xs font-black transition-all active:scale-95 shadow-md shadow-milokira-verde/30"
        >
          <CheckCircle size={13} strokeWidth={2.5} />
          Entregado
        </button>
        <button
          onClick={onPdf}
          aria-label="Ver ticket"
          title="Ver ticket para imprimir"
          className="shrink-0 px-2.5 py-2 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold transition-all active:scale-95"
        >
          <FileText size={13} />
        </button>
        <button
          onClick={onEdit}
          aria-label="Editar pedido"
          title="Editar pedido"
          className="shrink-0 px-2.5 py-2 rounded-lg bg-milokira-lila/20 hover:bg-milokira-lila/40 text-stone-700 border border-milokira-lila text-xs font-bold transition-all active:scale-95"
        >
          <Edit3 size={13} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Borrar pedido"
          title="Borrar pedido"
          className="shrink-0 px-2.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all active:scale-95"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div
          className={`px-4 py-3 border-t ${
            muyAtrasado
              ? "bg-rose-100/40 border-rose-200"
              : "bg-milokira-crema/50 border-stone-200"
          }`}
        >
          <ul className="space-y-1.5">
            {order.items?.map((item) => (
              <li
                key={item.product_id || item.nombre}
                className="flex justify-between text-xs sm:text-sm text-stone-700"
              >
                <span className="truncate pr-2">
                  • {item.nombre || "Planta"}
                  {item.quantity > 1 && (
                    <span className="text-stone-500 text-[10px]"> (x{item.quantity})</span>
                  )}
                  {item.es_de_companero && (
                    <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0.5 rounded">
                      Compañero
                    </span>
                  )}
                </span>
                {item.unit_price > 0 && (
                  <span
                    className={`shrink-0 font-mono ${item.es_de_companero ? "text-purple-700" : "text-stone-600"}`}
                  >
                    ${(item.unit_price * item.quantity).toLocaleString("es-CL")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {isDelivery && order.delivery_fee != null && order.delivery_fee > 0 && (
            <div className="flex justify-between text-xs sm:text-sm text-purple-700 mt-2 pt-2 border-t border-stone-300/60">
              <span>
                Delivery
                <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0.5 rounded">
                  Compañero
                </span>
              </span>
              <span>${order.delivery_fee.toLocaleString("es-CL")}</span>
            </div>
          )}
          {/* Cuánto de este pedido le toca al compañero. El total no cambia:
              el cliente paga todo junto. */}
          {totalCompanero > 0 && (
            <div className="flex justify-between text-xs sm:text-sm text-purple-700 font-bold mt-2 pt-2 border-t border-stone-300/60">
              <span>Cobra el compañero</span>
              <span>${totalCompanero.toLocaleString("es-CL")}</span>
            </div>
          )}

          {/* Notas internas del admin */}
          <div className="mt-3 pt-3 border-t border-stone-300/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                <StickyNote size={11} />
                Mis notas (internas)
              </span>
              {!editingAdminNote && (
                <button
                  onClick={() => {
                    setAdminNoteDraft(order.admin_notes || "");
                    setEditingAdminNote(true);
                  }}
                  className="text-[10px] text-stone-500 hover:text-amber-600 font-bold uppercase tracking-wide flex items-center gap-1 transition-colors"
                >
                  <Pencil size={10} />
                  {order.admin_notes ? "Editar" : "Agregar"}
                </button>
              )}
            </div>

            {editingAdminNote ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  autoFocus
                  value={adminNoteDraft}
                  onChange={(e) => setAdminNoteDraft(e.target.value)}
                  placeholder="Ej: debe $5.000, llamar antes..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-700 text-xs outline-none focus:border-amber-500 transition-colors resize-none placeholder:text-stone-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onSaveAdminNotes(adminNoteDraft.trim());
                      setEditingAdminNote(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                  >
                    <Save size={11} strokeWidth={3} />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setAdminNoteDraft(order.admin_notes || "");
                      setEditingAdminNote(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                  >
                    <X size={11} />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : order.admin_notes ? (
              <p className="text-xs text-amber-800 italic leading-snug bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {order.admin_notes}
              </p>
            ) : (
              <p className="text-[11px] text-stone-500 italic">Sin notas internas.</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
