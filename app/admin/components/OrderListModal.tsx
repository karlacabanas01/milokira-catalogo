"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Ajusta según tu estructura
import { CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

// Tipos adaptados a la estructura anidada de Firebase
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
  items: OrderItem[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  // Eliminado businessId
  onChange: () => void;
};

export default function OrderListModal({ isOpen, onClose, onChange }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Query directo: Trae transacciones tipo pedido que estén pendientes
      const q = query(
        collection(db, "Transacciones"),
        where("tipo", "==", "pedido"),
        where("status", "==", "pending"),
      );

      const querySnapshot = await getDocs(q);
      const listaPedidos: Order[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        listaPedidos.push({
          idFirebase: docSnap.id,
          customer_name: data.customer_name || "Sin nombre",
          total_amount: Number(data.total_amount) || 0,
          status: data.status,
          created_at: data.created_at || new Date().toISOString(),
          items: data.items || [], // Los items ya vienen dentro del documento
        });
      });

      // Ordenamos en el cliente para no obligarte a crear un índice compuesto en Firebase
      listaPedidos.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setOrders(listaPedidos);
    } catch (error) {
      console.error("Error al cargar los pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchOrders();
  }, [isOpen]);

  const handleCompleteOrder = async (order: Order) => {
    if (
      !confirm(
        `¿Confirmar venta a ${order.customer_name}? \nTotal: $${order.total_amount.toLocaleString("es-CL")}`,
      )
    )
      return;

    try {
      // 1. Validar Stock de TODOS los items consultando la colección "Plantas"
      for (const item of order.items) {
        if (item.product_id) {
          const plantaRef = doc(db, "Plantas", item.product_id);
          const plantaSnap = await getDoc(plantaRef);

          if (plantaSnap.exists()) {
            const stockActual = Number(plantaSnap.data().stock) || 0;
            if (stockActual < item.quantity) {
              return alert(
                `❌ Stock insuficiente para "${item.nombre || "Planta"}".\nTienes ${stockActual}, necesitas ${item.quantity}.`,
              );
            }
          }
        }
      }

      // 2. Descontar Stock
      for (const item of order.items) {
        if (item.product_id) {
          const plantaRef = doc(db, "Plantas", item.product_id);
          const plantaSnap = await getDoc(plantaRef);
          if (plantaSnap.exists()) {
            const stockActual = Number(plantaSnap.data().stock) || 0;
            await updateDoc(plantaRef, { stock: stockActual - item.quantity });
          }
        }
      }

      // 3. Marcar Pedido como Completado
      await updateDoc(doc(db, "Transacciones", order.idFirebase), {
        status: "completado",
      });

      alert("¡Venta registrada y stock actualizado! 💰✅");
      fetchOrders();
      onChange(); // Actualiza los números del dashboard principal
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al procesar la venta.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-800 shadow-2xl h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-amber-500">
            Pedidos Pendientes ({orders.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-10 text-zinc-500">Cargando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
              ¡Todo limpio!
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.idFirebase}
                className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden"
              >
                {/* Cabecera del Pedido */}
                <div
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() =>
                    setExpandedId(
                      expandedId === order.idFirebase ? null : order.idFirebase,
                    )
                  }
                >
                  <div>
                    <p className="text-amber-100 font-bold text-lg">
                      {order.customer_name}
                    </p>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock size={12} />{" "}
                      {new Date(order.created_at).toLocaleDateString("es-CL")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-500 font-mono font-bold block">
                      ${order.total_amount.toLocaleString("es-CL")}
                    </span>
                    <div className="flex items-center justify-end gap-1 text-zinc-500 text-xs mt-1">
                      {order.items?.length || 0} items{" "}
                      {expandedId === order.idFirebase ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalle Desplegable */}
                {expandedId === order.idFirebase && (
                  <div className="bg-zinc-900/50 p-3 border-t border-zinc-800 animate-in slide-in-from-top-2">
                    <ul className="space-y-2 mb-4">
                      {order.items?.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between text-sm text-zinc-300"
                        >
                          <span>
                            • {item.nombre || "Planta"}{" "}
                            <span className="text-zinc-500 text-xs">
                              (x{item.quantity})
                            </span>
                          </span>
                          <span>
                            $
                            {(item.unit_price * item.quantity).toLocaleString(
                              "es-CL",
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteOrder(order);
                      }}
                      className="w-full bg-emerald-600 text-white py-3 rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all flex justify-center items-center gap-2"
                    >
                      <CheckCircle size={16} /> Completar Venta
                    </button>
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
