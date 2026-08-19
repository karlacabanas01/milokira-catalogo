import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Modal } from "../../components/ui";
import {
  Area,
  AreaChart,
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

        <div className="h-64 sm:h-[420px] px-3 sm:px-5 pb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gastosFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gananciaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(value) => {
                  const numericValue =
                    typeof value === "number"
                      ? value
                      : Number(value ?? 0);
                  return currency.format(numericValue);
                }}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid #e7e5e4",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="ventas"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#ventasFill)"
                name="Ventas"
              />
              <Area
                type="monotone"
                dataKey="gastos"
                stroke="#f97316"
                strokeWidth={3}
                fill="url(#gastosFill)"
                name="Gastos"
              />
              <Area
                type="monotone"
                dataKey="ganancia"
                stroke="#4f46e5"
                strokeWidth={3}
                fill="url(#gananciaFill)"
                name="Ganancia"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Modal>
  );
}
