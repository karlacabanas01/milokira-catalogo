"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

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

export default function ImprimirPedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-stone-500">
          Cargando…
        </div>
      }
    >
      <ImprimirContent />
    </Suspense>
  );
}

function ImprimirContent() {
  const params = useSearchParams();
  const filter = (params.get("filter") as Filter) || "todos";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
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
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const filtered = applyFilter(list, filter);
      setOrders(filtered);
      setLoading(false);
    };
    fetch();
  }, [filter]);

  useEffect(() => {
    if (!loading && orders.length > 0) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading, orders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-stone-500">
        Cargando pedidos…
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-stone-600 gap-3 p-6 text-center">
        <p className="font-bold text-lg">No hay pedidos para imprimir</p>
        <p className="text-sm">Filtro actual: {filter}</p>
        <button
          onClick={() => window.close()}
          className="mt-4 px-5 py-2 rounded-lg bg-stone-800 text-white text-sm font-bold hover:bg-stone-700"
        >
          Cerrar
        </button>
      </div>
    );
  }

  // Pad para que cada hoja tenga 6 etiquetas
  const padded = [...orders];
  while (padded.length % 6 !== 0) {
    padded.push(null as unknown as Order);
  }

  // Agrupar de a 6 (una hoja)
  const sheets: (Order | null)[][] = [];
  for (let i = 0; i < padded.length; i += 6) {
    sheets.push(padded.slice(i, i + 6));
  }

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .sheet {
          width: 210mm;
          height: 281mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: repeat(3, 1fr);
          gap: 0;
          page-break-after: always;
        }
        .sheet:last-child { page-break-after: auto; }
        .label {
          border: 1px dashed #94a3b8;
          padding: 8mm;
          display: flex;
          flex-direction: column;
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #1f2937;
          overflow: hidden;
          break-inside: avoid;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center justify-between sticky top-0 z-10 border-b border-stone-300">
        <div>
          <p className="font-bold text-stone-800">Vista previa de impresión</p>
          <p className="text-xs text-stone-500">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} · filtro: {filter}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            🖨 Imprimir
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="bg-stone-200 p-4 print:p-0 print:bg-white">
        {sheets.map((sheet, sheetIdx) => (
          <div
            key={`sheet-${sheetIdx}`}
            className="sheet bg-white shadow-lg mx-auto mb-4 print:shadow-none print:mb-0"
          >
            {sheet.map((order, idx) =>
              order ? (
                <Label key={order.idFirebase} order={order} />
              ) : (
                <div key={`empty-${sheetIdx}-${idx}`} className="label opacity-30" />
              ),
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function applyFilter(orders: Order[], filter: Filter): Order[] {
  if (filter === "todos") return orders;
  if (filter === "retiro") return orders.filter((o) => o.delivery_type === "retiro");
  return orders.filter((o) => o.delivery_day === filter);
}

const DAY_BADGE: Record<string, string> = {
  martes: "bg-indigo-100 text-indigo-800 border-indigo-300",
  viernes: "bg-purple-100 text-purple-800 border-purple-300",
};

function Label({ order }: { readonly order: Order }) {
  const isDelivery = order.delivery_type === "delivery";
  const dayBadgeColor =
    DAY_BADGE[order.delivery_day || ""] ||
    "bg-stone-100 text-stone-700 border-stone-300";

  return (
    <div className="label">
      {/* Header: cliente */}
      <div className="border-b border-stone-300 pb-2 mb-2">
        <div className="flex flex-wrap gap-1 mb-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[8pt] font-bold uppercase tracking-wide border ${
              isDelivery
                ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                : "bg-emerald-100 text-emerald-800 border-emerald-300"
            }`}
          >
            {isDelivery ? "🚚 Delivery" : "🏪 Retiro"}
          </span>
          {order.delivery_day && (
            <span
              className={`px-1.5 py-0.5 rounded text-[8pt] font-bold uppercase tracking-wide border ${dayBadgeColor}`}
            >
              {order.delivery_day}
            </span>
          )}
        </div>
        <h2 className="font-black text-[14pt] leading-tight text-stone-900 truncate">
          {order.customer_name}
        </h2>
      </div>

      {/* Dirección y teléfono */}
      <div className="space-y-1 mb-2 text-[9pt]">
        {order.address && (
          <p className="leading-snug">
            <span className="font-bold">📍</span>{" "}
            <span className="text-stone-700">{order.address}</span>
          </p>
        )}
        {order.phone && (
          <p>
            <span className="font-bold">📞</span>{" "}
            <span className="text-stone-700 font-mono">{order.phone}</span>
          </p>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 border-t border-stone-200 pt-2 mb-2 overflow-hidden">
        <p className="text-[7pt] font-bold uppercase tracking-wider text-stone-500 mb-1">
          Plantas
        </p>
        <ul className="space-y-0.5 text-[9pt]">
          {order.items?.slice(0, 6).map((item, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">
                {item.quantity > 1 && (
                  <span className="font-bold">{item.quantity}× </span>
                )}
                {item.nombre || "Planta"}
              </span>
              {item.unit_price > 0 && (
                <span className="font-mono text-stone-600 shrink-0">
                  ${(item.unit_price * item.quantity).toLocaleString("es-CL")}
                </span>
              )}
            </li>
          ))}
          {order.items && order.items.length > 6 && (
            <li className="text-[8pt] text-stone-500 italic">
              + {order.items.length - 6} más…
            </li>
          )}
        </ul>
      </div>

      {/* Notas */}
      {order.notes && (
        <div className="border-t border-stone-200 pt-1.5 mb-2">
          <p className="text-[8pt] text-stone-700 italic leading-snug line-clamp-2">
            <span className="font-bold not-italic">Nota:</span> {order.notes}
          </p>
        </div>
      )}

      {/* Total */}
      <div className="border-t-2 border-stone-800 pt-1.5 flex justify-between items-baseline">
        <span className="text-[8pt] font-bold uppercase tracking-wider text-stone-600">
          Total
        </span>
        <span className="text-[14pt] font-black text-emerald-700">
          ${order.total_amount.toLocaleString("es-CL")}
        </span>
      </div>
    </div>
  );
}
