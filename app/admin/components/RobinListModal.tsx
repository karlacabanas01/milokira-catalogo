"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Truck, Package, HandCoins } from "lucide-react";
import { Modal, EmptyState, Badge } from "../../components/ui";
import { calcularAporteRobin } from "../robinHelpers";

type Aporte = {
  idFirebase: string;
  cliente: string;
  fecha: string;
  /** Monto del delivery de este pedido (0 si fue retiro). */
  delivery: number;
  /** Ítems marcados como "cobra el compañero". */
  productos: { nombre: string; cantidad: number; monto: number }[];
  /** Monto cargado a mano en una venta directa. */
  directo: number;
  total: number;
  /** El tope recortó el monto (pedido con total manual). */
  ajustado: boolean;
};

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Desde cuándo cuenta el acuerdo (timestamp). */
  readonly desde: number;
};

const formatCLP = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function RobinListModal({ isOpen, onClose, desde }: Props) {
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const cargar = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "Transacciones"));
        const lista: Aporte[] = [];

        snap.forEach((documento) => {
          const data = documento.data();
          // Mismo helper que alimenta la card del panel.
          const aporte = calcularAporteRobin(data, desde);
          if (!aporte) return;

          lista.push({
            idFirebase: documento.id,
            cliente: data.customer_name || "Sin nombre",
            fecha: data.created_at || "",
            delivery: aporte.delivery,
            productos: aporte.productos,
            directo: aporte.directo,
            total: aporte.total,
            ajustado: aporte.ajustado,
          });
        });

        lista.sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );
        setAportes(lista);
      } catch (error) {
        console.error("Error cargando los aportes de Robin:", error);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [isOpen, desde]);

  const totalGeneral = aportes.reduce((acc, a) => acc + a.total, 0);
  const totalDelivery = aportes.reduce((acc, a) => acc + a.delivery, 0);
  const totalDirecto = aportes.reduce((acc, a) => acc + a.directo, 0);
  const totalProductos = totalGeneral - totalDelivery - totalDirecto;

  const fechaDesde = new Date(desde).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={`Desde el ${fechaDesde}`}
      title="Total Robin"
      size="md"
      tall
    >
      {loading ? (
        <div className="text-center text-stone-500 py-10 text-sm">
          Cargando...
        </div>
      ) : aportes.length === 0 ? (
        <EmptyState>
          Todavía no hay nada para Robin desde el {fechaDesde}.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {/* Resumen */}
          <div className="rounded-xl border border-pink-200 bg-pink-50 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider flex items-center gap-1.5">
                <HandCoins size={13} strokeWidth={2.5} />
                Total acumulado
              </span>
              <span className="text-xl sm:text-2xl font-black text-pink-900 tabular-nums">
                {formatCLP(totalGeneral)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-pink-200 flex flex-wrap gap-x-3 gap-y-1 justify-between text-xs text-pink-700">
              <span className="flex items-center gap-1">
                <Truck size={12} /> Deliverys {formatCLP(totalDelivery)}
              </span>
              <span className="flex items-center gap-1">
                <Package size={12} /> Productos {formatCLP(totalProductos)}
              </span>
              {totalDirecto > 0 && (
                <span className="flex items-center gap-1">
                  <HandCoins size={12} /> Ventas {formatCLP(totalDirecto)}
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
            {aportes.length} {aportes.length === 1 ? "pedido" : "pedidos"}
          </p>

          {aportes.map((a) => (
            <div
              key={a.idFirebase}
              className="bg-campo border border-borde rounded-xl p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 text-sm truncate">
                    {a.cliente}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {a.fecha
                      ? new Date(a.fecha).toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </p>
                </div>
                <span className="font-black text-pink-700 font-mono text-sm shrink-0">
                  {formatCLP(a.total)}
                </span>
              </div>

              <ul className="mt-2 pt-2 border-t border-stone-200 space-y-1">
                {a.delivery > 0 && (
                  <li className="flex justify-between text-xs text-stone-600">
                    <span className="flex items-center gap-1.5">
                      <Truck size={11} className="text-pink-600" />
                      Delivery
                    </span>
                    <span className="font-mono">{formatCLP(a.delivery)}</span>
                  </li>
                )}
                {a.directo > 0 && (
                  <li className="flex justify-between text-xs text-stone-600">
                    <span className="flex items-center gap-1.5">
                      <HandCoins size={11} className="text-pink-600" />
                      Venta de Robin
                    </span>
                    <span className="font-mono">{formatCLP(a.directo)}</span>
                  </li>
                )}
                {a.productos.map((p) => (
                  <li
                    key={`${a.idFirebase}-${p.nombre}`}
                    className="flex justify-between text-xs text-stone-600"
                  >
                    <span className="flex items-center gap-1.5 truncate pr-2">
                      <Package size={11} className="text-pink-600 shrink-0" />
                      {p.nombre}
                      {p.cantidad > 1 && (
                        <span className="text-stone-400">(x{p.cantidad})</span>
                      )}
                    </span>
                    <span className="font-mono shrink-0">
                      {formatCLP(p.monto)}
                    </span>
                  </li>
                ))}
              </ul>

              {a.ajustado && (
                <div className="mt-2">
                  <Badge tone="alerta">Ajustado al total del pedido</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
