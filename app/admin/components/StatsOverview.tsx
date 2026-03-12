import React from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

type Financials = {
  income: number;
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
  value,
  onClick,
  variant,
  icon: Icon,
}: {
  label: string;
  value: number;
  onClick?: () => void;
  variant: "success" | "danger" | "info";
  icon: React.ElementType; // Tipo para componentes de React (Lucide, Fa, etc.)
}) => {
  const styles = {
    success: {
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      shadow: "hover:shadow-emerald-900/20",
    },
    danger: {
      text: "text-rose-400",
      border: "border-rose-500/20",
      shadow: "hover:shadow-rose-900/20",
    },
    info: {
      text: "text-blue-400",
      border: "border-blue-500/20",
      shadow: "",
    },
  };

  const currentStyle = styles[variant];
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl bg-slate-900 p-4 text-center border transition-all duration-300 w-full
        ${currentStyle.border}
        ${onClick ? `hover:bg-slate-800 hover:-translate-y-1 hover:shadow-xl ${currentStyle.shadow} active:scale-95 cursor-pointer group` : ""}
      `}
    >
      {/* Fondo con brillo sutil del mismo color que el texto */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity ${onClick ? "group-hover:opacity-10" : "opacity-5"} bg-current ${currentStyle.text}`}
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2 opacity-90">
          {/* Renderizamos el Icono aquí, pasando clases de Tailwind */}
          <Icon className={`w-4 h-4 ${currentStyle.text}`} strokeWidth={2.5} />

          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${currentStyle.text}`}
          >
            {label}
          </span>
        </div>

        <p className="text-2xl font-black text-slate-100 tracking-tight">
          {new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
          }).format(value)}
        </p>
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
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
        variant={financials.profit >= 0 ? "info" : "danger"}
        icon={Wallet}
      />
    </div>
  );
}
