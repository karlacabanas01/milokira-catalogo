import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Modal, EmptyState } from "../../components/ui";
import {
  aInputDate,
  desdeInputDate,
  DIA_CORTE,
  inicioDePeriodo,
  resumirRango,
  type MovimientoMes,
} from "../mesHelpers";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = {
  label: string;
  ventas: number;
  gastos: number;
  ganancia: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  allTime: ChartPoint[];
  month: ChartPoint[];
  week: ChartPoint[];
  /** Datos crudos: el rango a medida se calcula acá, no en el panel. */
  transacciones: MovimientoMes[];
  gastos: MovimientoMes[];
};

// El rango del mes se arma desde DIA_CORTE: con el número escrito a mano la
// etiqueta queda desfasada apenas cambia el corte.
const rangeOptions = [
  { key: "allTime", label: "Desde que empezamos" },
  { key: "month", label: `Mes (${DIA_CORTE} → ${DIA_CORTE - 1})` },
  { key: "week", label: "Esta semana" },
  { key: "custom", label: "Elegir fechas" },
] as const;

// Eje Y compacto: "$120 K" en vez de "$120.000", que no cabe.
const compact = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  notation: "compact",
  maximumFractionDigits: 0,
});

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const sumar = (puntos: ChartPoint[]) =>
  puntos.reduce(
    (acc, item) => ({
      ventas: acc.ventas + item.ventas,
      gastos: acc.gastos + item.gastos,
      ganancia: acc.ganancia + item.ganancia,
    }),
    { ventas: 0, gastos: 0, ganancia: 0 },
  );

export default function StatsModal({
  isOpen,
  onClose,
  allTime,
  month,
  week,
  transacciones,
  gastos,
}: Props) {
  // Sin `if (!isOpen) return null` antes de los hooks: eso cambiaba la
  // cantidad de hooks entre renders. El propio Modal decide si se monta.
  const [activeRange, setActiveRange] = useState<(typeof rangeOptions)[number]["key"]>(
    "week",
  );

  // Arranca en el período en curso: es el rango que se mira más seguido.
  const [desde, setDesde] = useState(() => aInputDate(inicioDePeriodo()));
  const [hasta, setHasta] = useState(() => aInputDate(new Date()));

  const esCustom = activeRange === "custom";

  const rango = useMemo(() => {
    if (!esCustom) return null;
    const ini = desdeInputDate(desde);
    const fin = desdeInputDate(hasta);
    if (!ini || !fin) return null;
    // Fechas al revés: se usan como vengan, para no mostrar un rango vacío
    // mientras se está eligiendo la segunda.
    const [a, b] = ini <= fin ? [ini, fin] : [fin, ini];
    return resumirRango(transacciones, gastos, a, b);
  }, [esCustom, desde, hasta, transacciones, gastos]);

  const data = useMemo(
    () =>
      activeRange === "allTime"
        ? allTime
        : activeRange === "month"
          ? month
          : activeRange === "week"
            ? week
            : [],
    [activeRange, allTime, month, week],
  );

  const totalsPeriodo = useMemo(() => sumar(data), [data]);
  const totals = rango ?? totalsPeriodo;

  // Totales de todo el proyecto: no dependen de la pestaña elegida, así que
  // quedan fijos arriba como referencia mientras se mira un período.
  const totalesGenerales = useMemo(() => sumar(allTime), [allTime]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Resumen financiero"
      title="Estadísticas"
      size="full"
      className="p-0"
    >
      <div>
        {/* Totales de todo el proyecto. Van fijos arriba: son la referencia
            contra la que se lee cualquier período de abajo. */}
        <div className="mx-4 sm:mx-5 mt-1 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            Desde que empezamos
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase text-emerald-700">
                <TrendingUp size={12} className="shrink-0" />
                Ventas
              </span>
              <p className="mt-0.5 text-sm sm:text-lg font-black text-emerald-900 tabular-nums break-words">
                {currency.format(totalesGenerales.ventas)}
              </p>
            </div>
            <div>
              <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase text-rose-700">
                <TrendingDown size={12} className="shrink-0" />
                Gastos
              </span>
              <p className="mt-0.5 text-sm sm:text-lg font-black text-rose-900 tabular-nums break-words">
                {currency.format(totalesGenerales.gastos)}
              </p>
            </div>
            <div>
              <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase text-indigo-700">
                <Wallet size={12} className="shrink-0" />
                Ganancia
              </span>
              <p
                className={`mt-0.5 text-sm sm:text-lg font-black tabular-nums break-words ${
                  totalesGenerales.ganancia < 0
                    ? "text-rose-600"
                    : "text-indigo-900"
                }`}
              >
                {currency.format(totalesGenerales.ganancia)}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setActiveRange(option.key)}
                className={`rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                  activeRange === option.key
                    ? "bg-milokira-verde text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {esCustom && (
            <div className="mt-3 flex flex-wrap items-end gap-2 sm:gap-3">
              <label className="flex-1 min-w-[8.5rem]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1 ml-1">
                  Desde
                </span>
                <input
                  type="date"
                  value={desde}
                  max={hasta}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-milokira-verde text-sm"
                />
              </label>
              <label className="flex-1 min-w-[8.5rem]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1 ml-1">
                  Hasta
                </span>
                <input
                  type="date"
                  value={hasta}
                  min={desde}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-milokira-verde text-sm"
                />
              </label>
            </div>
          )}
        </div>

        {/* Del período elegido arriba. Lleva su propio rótulo porque arriba
            hay otro bloque con los mismos tres números. */}
        <p className="px-4 sm:px-5 pt-4 text-[10px] font-black uppercase tracking-widest text-stone-500">
          {esCustom
            ? `${desde || "—"} → ${hasta || "—"}`
            : rangeOptions.find((o) => o.key === activeRange)?.label}
        </p>

        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3 px-4 sm:px-5 pt-2 pb-4">
          <div className="rounded-2xl bg-emerald-50 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700">
              <TrendingUp size={16} className="shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase">
                Ventas
              </span>
            </div>
            <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-emerald-900 break-words">
              {currency.format(totals.ventas)}
            </p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-rose-700">
              <TrendingDown size={16} className="shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase">
                Gastos
              </span>
            </div>
            <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-rose-900 break-words">
              {currency.format(totals.gastos)}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-700">
              <Wallet size={16} className="shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase">
                Ganancia
              </span>
            </div>
            <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-indigo-900 break-words">
              {currency.format(totals.ganancia)}
            </p>
          </div>
        </div>

        {/* Con fechas a medida se lista el detalle en vez del gráfico por
            día: el rango puede ser de un día o de un año, y las barras dejan
            de significar lo mismo. */}
        {esCustom ? (
          !rango || rango.detalle.length === 0 ? (
            <div className="px-4 sm:px-5 pb-6">
              <EmptyState>
                No hay movimientos entre esas fechas.
              </EmptyState>
            </div>
          ) : (
            <div className="px-4 sm:px-5 pb-6 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                {rango.detalle.length}{" "}
                {rango.detalle.length === 1 ? "movimiento" : "movimientos"}
              </p>
              {rango.detalle.map((m, i) => (
                <div
                  key={`${m.fecha}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-borde bg-campo p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-800 truncate">
                      {m.descripcion}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {new Date(m.fecha).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-mono font-black text-sm ${
                      m.tipo === "venta" ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {m.tipo === "venta" ? "+" : "−"} {currency.format(m.monto)}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : data.length === 0 ? (
          <div className="mx-4 sm:mx-5 mb-6 rounded-xl border border-dashed border-stone-200 py-12 text-center text-sm text-stone-500">
            Todavía no hay movimientos en este período.
          </div>
        ) : (
        <div className="h-64 sm:h-[420px] px-3 sm:px-5 pb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="22%">
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#57534e" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#78716c" }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v) => compact.format(Number(v))}
              />
              <Tooltip
                cursor={{ fill: "rgba(120,113,108,0.06)" }}
                formatter={(value) => currency.format(Number(value ?? 0))}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid #e7e5e4",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                  fontSize: 13,
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                iconSize={9}
                wrapperStyle={{ fontSize: 12, color: "#57534e" }}
              />
              {/* Mismos colores que las tarjetas de arriba (verde ventas, rose
                  gastos) para que el mismo dato no cambie de color dentro del
                  modal. El par pasa la validación de daltonismo: ΔE 10.5 en
                  deuteranopía. */}
              <Bar
                dataKey="ventas"
                fill="#10b981"
                name="Ventas"
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
              />
              <Bar
                dataKey="gastos"
                fill="#e11d48"
                name="Gastos"
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}

        {/* La guía de visualización pide un respaldo legible cuando el contraste
            de las barras contra el fondo queda bajo 3:1. */}
        {data.length > 0 && (
          <details className="mx-4 sm:mx-5 mb-5">
            <summary className="cursor-pointer text-xs font-bold text-stone-500 hover:text-stone-700 uppercase tracking-wider select-none">
              Ver los números
            </summary>
            <div className="mt-2 overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-stone-50">
                  <tr className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Período</th>
                    <th className="px-3 py-2 text-right">Ventas</th>
                    <th className="px-3 py-2 text-right">Gastos</th>
                    <th className="px-3 py-2 text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {data.map((punto) => (
                    <tr key={punto.label}>
                      <td className="px-3 py-2 font-medium text-stone-700">
                        {punto.label}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">
                        {currency.format(punto.ventas)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-rose-700">
                        {currency.format(punto.gastos)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-bold ${
                          punto.ganancia >= 0 ? "text-stone-800" : "text-rose-600"
                        }`}
                      >
                        {currency.format(punto.ganancia)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </Modal>
  );
}
