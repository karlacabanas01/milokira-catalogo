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
import { Modal, EmptyState, Button } from "../../components/ui";

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pedidos Pendientes (${orders.length})`}
      tall
    >
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-stone-500">Cargando...</div>
        ) : orders.length === 0 ? (
          <EmptyState>¡Todo limpio!</EmptyState>
        ) : (
            orders.map((order) => (
              <div
                key={order.idFirebase}
                className="bg-milokira-crema rounded-xl border border-stone-200 overflow-hidden"
              >
                {/* Cabecera del Pedido */}
                <div
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-white transition-colors"
                  onClick={() =>
                    setExpandedId(
                      expandedId === order.idFirebase ? null : order.idFirebase,
                    )
                  }
                >
                  <div>
                    <p className="text-stone-800 font-bold text-lg">
                      {order.customer_name}
                    </p>
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Clock size={12} />{" "}
                      {new Date(order.created_at).toLocaleDateString("es-CL")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-600 font-mono font-bold block">
                      ${order.total_amount.toLocaleString("es-CL")}
                    </span>
                    <div className="flex items-center justify-end gap-1 text-stone-500 text-xs mt-1">
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
                  <div className="bg-white/50 p-3 border-t border-stone-200 animate-in slide-in-from-top-2">
                    <ul className="space-y-2 mb-4">
                      {order.items?.map((item, idx) => (
                        <li
                          key={`${order.idFirebase}-${item.product_id || item.nombre || idx}`}
                          className="flex justify-between text-sm text-stone-700"
                        >
                          <span>
                            • {item.nombre || "Planta"}{" "}
                            <span className="text-stone-500 text-xs">
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
                  <Button
                    variant="exito"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteOrder(order);
                    }}
                  >
                    <CheckCircle size={16} /> Completar Venta
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
