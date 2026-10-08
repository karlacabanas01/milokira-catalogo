import React from "react";
import {
  Wallet,
  CalendarDays,
  CalendarCheck,
  HandCoins,
} from "lucide-react";

type Financials = {
  income: number;
  incomeWeek: number;
  expenses: number;
  profit: number;
  /** Saldo pendiente con Robin: lo que le toca menos lo que ya se le pagó.
   *  Negativo significa que se le pagó de más. */
  incomeRobin: number;
  /** Ganancia del período en curso (del 25 al 24), no del mes calendario. */
  profitMes: number;
  /** Ventas del período en curso. */
  ventasMes: number;
  /** Gastos del período en curso, sueldos de Robin incluidos. */
  gastosMes: number;
};

type Props = {
  financials: Financials;
  /** Rango del período en curso, ej "25 sept → 24 oct". */
  mesActual: string;
  onWeekClick: () => void;
  onRobinClick: () => void;
};

const StatCard = ({
  label,
  sublabel,
  value,
  desglose,
  onClick,
  variant,
  icon: Icon,
}: {
  label: string;
  sublabel?: string;
  value: number;
  /** Las partes que componen el valor, para explicar de dónde sale. */
  desglose?: { texto: string; monto: number }[];
  onClick?: () => void;
  variant: "info" | "week" | "robin" | "mes";
  icon: React.ElementType;
}) => {
  const styles = {
    info: {
      bg: "bg-blue-50",
      hoverBg: "hover:bg-blue-100",
      text: "text-blue-700",
      value: "text-blue-900",
      border: "border-blue-200",
    },
    week: {
      bg: "bg-milokira-lila/30",
      hoverBg: "hover:bg-milokira-lila/50",
      text: "text-purple-700",
      value: "text-purple-900",
      border: "border-milokira-lila",
    },
    // Teal: libre entre las demás cards y se distingue del `info` de la
    // ganancia histórica, que es el dato con el que más se puede confundir.
    mes: {
      bg: "bg-teal-50",
      hoverBg: "hover:bg-teal-100",
      text: "text-teal-700",
      value: "text-teal-900",
      border: "border-teal-200",
    },
    // Rosado pálido: no lo usan las otras cards, y `pink` se distingue del
    // `rose` que marca los pedidos muy atrasados.
    robin: {
      bg: "bg-pink-50",
      hoverBg: "hover:bg-pink-100",
      text: "text-pink-700",
      value: "text-pink-900",
      border: "border-pink-200",
    },
  };

  const currentStyle = styles[variant];
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl ${currentStyle.bg} p-4 text-center border ${currentStyle.border} transition-all duration-300 w-full
        ${onClick ? `${currentStyle.hoverBg} hover:-translate-y-1 hover:shadow-md active:scale-95 cursor-pointer` : ""}
      `}
    >
      <div className="relative z-10 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${currentStyle.text}`} strokeWidth={2.5} />
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${currentStyle.text}`}
          >
            {label}
          </span>
        </div>

        <p className={`text-2xl font-black ${currentStyle.value} tracking-tight`}>
          {new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
          }).format(value)}
        </p>

        {desglose && desglose.length > 0 && (
          <div
            className={`w-full border-t pt-1.5 space-y-0.5 ${currentStyle.border}`}
          >
            {desglose.map((d) => (
              <div
                key={d.texto}
                className={`flex items-center justify-between gap-2 text-[10px] font-bold ${currentStyle.text}`}
              >
                <span>{d.texto}</span>
                <span className="tabular-nums">
                  {new Intl.NumberFormat("es-CL", {
                    style: "currency",
                    currency: "CLP",
                  }).format(d.monto)}
                </span>
              </div>
            ))}
          </div>
        )}

        {sublabel && (
          <span
            className={`text-[10px] font-bold ${currentStyle.text} opacity-80`}
          >
            {sublabel}
          </span>
        )}
      </div>
    </Component>
  );
};

export default function StatsOverview({
  financials,
  mesActual,
  onWeekClick,
  onRobinClick,
}: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      <StatCard
        label="Esta semana"
        sublabel="lun → dom"
        value={financials.incomeWeek}
        onClick={onWeekClick}
        variant="week"
        icon={CalendarDays}
      />

      {/* Ganancia del período primero: es la que se mira para decidir. */}
      <StatCard
        label="Ganancia del mes"
        sublabel={mesActual}
        value={financials.profitMes}
        desglose={[
          { texto: "Ventas", monto: financials.ventasMes },
          { texto: "Gastos", monto: financials.gastosMes },
        ]}
        variant="mes"
        icon={CalendarCheck}
      />

      <StatCard
        label="Ganancia"
        sublabel="histórico"
        value={financials.profit}
        variant="info"
        icon={Wallet}
      />

      <StatCard
        label={financials.incomeRobin < 0 ? "Robin me debe" : "Le debo a Robin"}
        sublabel="desde 21-08"
        value={Math.abs(financials.incomeRobin)}
        onClick={onRobinClick}
        variant="robin"
        icon={HandCoins}
      />
    </div>
  );
}
