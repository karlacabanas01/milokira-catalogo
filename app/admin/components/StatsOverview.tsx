import React from "react";
import { TrendingUp, TrendingDown, Wallet, CalendarDays } from "lucide-react";

type Financials = {
  income: number;
  incomeWeek: number;
  expenses: number;
  profit: number;
};

type Props = {
  financials: Financials;
  onExpensesClick: () => void;
  onSalesClick: () => void;
};

const StatCard = ({
  label,
  sublabel,
  value,
  onClick,
  variant,
  icon: Icon,
}: {
  label: string;
  sublabel?: string;
  value: number;
  onClick?: () => void;
  variant: "success" | "danger" | "info" | "week";
  icon: React.ElementType;
}) => {
  const styles = {
    success: {
      bg: "bg-emerald-50",
      hoverBg: "hover:bg-emerald-100",
      text: "text-emerald-700",
      value: "text-emerald-900",
      border: "border-emerald-200",
    },
    danger: {
      bg: "bg-orange-50",
      hoverBg: "hover:bg-orange-100",
      text: "text-orange-700",
      value: "text-orange-900",
      border: "border-orange-200",
    },
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
  onExpensesClick,
  onSalesClick,
}: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
      <StatCard
        label="Esta semana"
        sublabel="lun → dom"
        value={financials.incomeWeek}
        variant="week"
        icon={CalendarDays}
      />

      <StatCard
        label="Ventas"
        value={financials.income}
        onClick={onSalesClick}
        variant="success"
        icon={TrendingUp}
      />

      <StatCard
        label="Gastos"
        value={financials.expenses}
        onClick={onExpensesClick}
        variant="danger"
        icon={TrendingDown}
      />

      <StatCard
        label="Ganancia"
        value={financials.profit}
        variant="info"
        icon={Wallet}
      />
    </div>
  );
}
