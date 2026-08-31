"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Truck, Package, HandCoins, Trash2, Check } from "lucide-react";
import { Modal, EmptyState, Badge, Button } from "../../components/ui";
import { calcularAporteRobin, calcularSaldoRobin, montoPago } from "../robinHelpers";

type Aporte = {
  idFirebase: string;
  cliente: string;
  fecha: string;
  /** Monto del delivery de este pedido (0 si fue retiro). */
  delivery: number;
  /** Ítems marcados como "cobra el compañero". */
  productos: { nombre: string; cantidad: number; monto: number; rubro: string }[];
  /** Monto cargado a mano en una venta directa. */
  directo: number;
  total: number;
  /** El tope recortó el monto (pedido con total manual). */
  ajustado: boolean;
};

/** Un abono ya entregado a Robin.
 *  `created_at` mantiene el nombre que usan Firestore y `calcularSaldoRobin`:
 *  con otro nombre el helper no encuentra la fecha y el saldo no resta nada. */
type Pago = {
  idFirebase: string;
  description: string;
  amount: number;
  created_at: string;
};

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Desde cuándo cuenta el acuerdo (timestamp). */
  readonly desde: number;
  /** Abre el modal para registrar un pago nuevo. */
  readonly onPagar: (saldoPendiente: number) => void;
  /** Cambia cuando se guarda un pago, para recargar la lista. */
  readonly recargar?: number;
  /** Avisa al panel que el saldo cambió (al borrar un pago). */
  readonly onCambio: () => void;
};

const formatCLP = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function RobinListModal({
  isOpen,
  onClose,
  desde,
  onPagar,
  recargar,
  onCambio,
}: Props) {
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrando, setBorrando] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const cargar = async () => {
      setLoading(true);
      try {
        const [snap, snapPagos] = await Promise.all([
          getDocs(collection(db, "Transacciones")),
          getDocs(collection(db, "PagosRobin")),
        ]);
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

        const listaPagos: Pago[] = [];
        snapPagos.forEach((documento) => {
          const data = documento.data();
          // El helper decide si el abono cuenta (fecha y monto válidos).
          if (montoPago(data, desde) <= 0) return;

          listaPagos.push({
            idFirebase: documento.id,
            description: data.description || "Pago a Robin",
            amount: Number(data.amount) || 0,
            created_at: String(data.created_at),
          });
        });
        listaPagos.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setPagos(listaPagos);
      } catch (error) {
        console.error("Error cargando la cuenta de Robin:", error);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [isOpen, desde, recargar]);

  const borrarPago = async (idFirebase: string) => {
    setBorrando(idFirebase);
    try {
      await deleteDoc(doc(db, "PagosRobin", idFirebase));
      setPagos((prev) => prev.filter((p) => p.idFirebase !== idFirebase));
      // El saldo de la card del panel también cambió.
      onCambio();
    } catch (error) {
      console.error("Error borrando el pago:", error);
    } finally {
      setBorrando(null);
    }
  };

  const totalGeneral = aportes.reduce((acc, a) => acc + a.total, 0);
  const totalDelivery = aportes.reduce((acc, a) => acc + a.delivery, 0);
  // Todo lo que no es delivery: macetas, otros ítems suyos y ventas directas.
  const totalVentas = totalGeneral - totalDelivery;

  // Mismo cálculo que la card del panel: lo que le tocó menos lo ya pagado.
  const { pagado, saldo, aFavor } = calcularSaldoRobin(
    totalGeneral,
    pagos,
    desde,
  );

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
      ) : aportes.length === 0 && pagos.length === 0 ? (
        <EmptyState>
          Todavía no hay nada para Robin desde el {fechaDesde}.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {/* Resumen */}
          <div className="rounded-xl border border-pink-200 bg-pink-50 p-3 sm:p-4">
            {/* Dos partes: lo que hizo repartiendo y lo que hizo vendiendo. */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/70 border border-pink-200 p-2.5 text-center">
                <span className="text-[10px] font-black text-pink-700 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Truck size={12} strokeWidth={2.5} />
                  Deliverys
                </span>
                <p className="mt-1 text-lg font-black text-pink-900 tabular-nums">
                  {formatCLP(totalDelivery)}
                </p>
              </div>

              <div className="rounded-lg bg-white/70 border border-pink-200 p-2.5 text-center">
                <span className="text-[10px] font-black text-pink-700 uppercase tracking-wider flex items-center justify-center gap-1">
                  <HandCoins size={12} strokeWidth={2.5} />
                  Ventas
                </span>
                <p className="mt-1 text-lg font-black text-pink-900 tabular-nums">
                  {formatCLP(totalVentas)}
                </p>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-pink-200 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider flex items-center gap-1.5">
                <HandCoins size={13} strokeWidth={2.5} />
                Le corresponde
              </span>
              <span className="text-base font-bold text-pink-900 tabular-nums">
                {formatCLP(totalGeneral)}
              </span>
            </div>

            {pagado > 0 && (
              <div className="mt-2 pt-2 border-t border-pink-200 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-pink-700">
                  <Check size={12} strokeWidth={3} />
                  Ya le pagué
                </span>
                <span className="font-mono font-bold text-pink-700">
                  − {formatCLP(pagado)}
                </span>
              </div>
            )}

            {/* El saldo es el número que importa: lo que queda por pagar. */}
            <div className="mt-2 pt-2 border-t-2 border-pink-300 flex items-center justify-between gap-2">
              <span className="text-[11px] font-black text-pink-800 uppercase tracking-wider">
                {aFavor ? "Robin me debe" : "Le debo"}
              </span>
              <span
                className={`text-xl sm:text-2xl font-black tabular-nums ${
                  aFavor ? "text-emerald-700" : "text-pink-900"
                }`}
              >
                {formatCLP(Math.abs(saldo))}
              </span>
            </div>

            <div className="mt-3">
              <Button
                variant="primaria"
                size="sm"
                fullWidth
                onClick={() => onPagar(Math.max(0, saldo))}
              >
                <HandCoins size={14} strokeWidth={2.5} />
                Registrar pago a Robin
              </Button>
            </div>
          </div>

          {/* Pagos ya hechos */}
          {pagos.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1 pt-1">
                {pagos.length} {pagos.length === 1 ? "pago" : "pagos"} hechos
              </p>

              {pagos.map((p) => (
                <div
                  key={p.idFirebase}
                  className="bg-campo border border-borde rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-stone-800 text-sm truncate flex items-center gap-1.5">
                      <Check
                        size={13}
                        strokeWidth={3}
                        className="text-emerald-600 shrink-0"
                      />
                      {p.description}
                    </p>
                    <p className="text-[11px] text-stone-500 pl-5">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-emerald-700 font-mono text-sm">
                      − {formatCLP(p.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        borrarPago(p.idFirebase);
                      }}
                      disabled={borrando === p.idFirebase}
                      aria-label={`Borrar pago ${p.description}`}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {aportes.length > 0 && (
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1 pt-1">
              {aportes.length} {aportes.length === 1 ? "pedido" : "pedidos"}
            </p>
          )}

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
                      {p.rubro === "maceta" && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-pink-600 bg-pink-100 rounded px-1 py-0.5 shrink-0">
                          Maceta
                        </span>
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
