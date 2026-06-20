import { useMemo, useState } from "react";
import { X, TrendingUp, TrendingDown, Wallet } from "lucide-react";
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
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-semibold">
              Resumen financiero
            </p>
            <h3 className="text-lg font-black text-stone-900">Estadísticas</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setActiveRange(option.key)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
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

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase">Ventas</span>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-900">
              {currency.format(totals.ventas)}
            </p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-rose-700">
              <TrendingDown size={16} />
              <span className="text-xs font-bold uppercase">Gastos</span>
            </div>
            <p className="mt-2 text-2xl font-black text-rose-900">
              {currency.format(totals.gastos)}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-4">
            <div className="flex items-center gap-2 text-indigo-700">
              <Wallet size={16} />
              <span className="text-xs font-bold uppercase">Ganancia</span>
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-900">
              {currency.format(totals.ganancia)}
            </p>
          </div>
        </div>

        <div className="h-[420px] px-5 pb-6">
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
    </div>
  );
}
