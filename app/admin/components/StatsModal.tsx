import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Modal } from "../../components/ui";
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
};

const rangeOptions = [
  { key: "allTime", label: "Desde que empezamos" },
  { key: "month", label: "Este mes" },
  { key: "week", label: "Esta semana" },
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

export default function StatsModal({
  isOpen,
  onClose,
  allTime,
  month,
  week,
}: Props) {
  // Sin `if (!isOpen) return null` antes de los hooks: eso cambiaba la
  // cantidad de hooks entre renders. El propio Modal decide si se monta.
  const [activeRange, setActiveRange] = useState<(typeof rangeOptions)[number]["key"]>(
    "week",
  );

  const data =
    activeRange === "allTime"
      ? allTime
      : activeRange === "month"
        ? month
        : week;

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, item) => ({
          ventas: acc.ventas + item.ventas,
          gastos: acc.gastos + item.gastos,
          ganancia: acc.ganancia + item.ganancia,
        }),
        { ventas: 0, gastos: 0, ganancia: 0 },
      ),
    [data],
  );

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
        <div className="pt-1">
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
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3 px-4 sm:px-5 py-4">
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

        {data.length === 0 ? (
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
