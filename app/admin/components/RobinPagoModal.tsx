"use client";

import { useState } from "react";
import { Modal, Input, Button } from "../../components/ui";
import type { TipoPagoRobin } from "../robinHelpers";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: {
    description: string;
    amount: number;
    tipo: TipoPagoRobin;
  }) => Promise<void>;
  readonly isSaving: boolean;
  /** Saldo pendiente antes de este abono, para ofrecerlo como atajo. */
  readonly saldoPendiente: number;
};

const formatCLP = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function RobinPagoModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  saldoPendiente,
}: Props) {
  const [form, setForm] = useState({ description: "", amount: "" });
  const [tipo, setTipo] = useState<TipoPagoRobin>("abono");

  const esSueldo = tipo === "sueldo";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      description:
        form.description.trim() || (esSueldo ? "Sueldo Robin" : "Pago a Robin"),
      amount: Number(form.amount),
      tipo,
    });
    setForm({ description: "", amount: "" });
    setTipo("abono");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagar a Robin 🤝">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Son dos cosas distintas: una cancela deuda, la otra es un gasto. */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo("abono")}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
              !esSueldo
                ? "bg-pink-50 text-pink-700 border-pink-300 shadow-sm"
                : "bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300"
            }`}
          >
            Abono a su cuenta
          </button>
          <button
            type="button"
            onClick={() => setTipo("sueldo")}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
              esSueldo
                ? "bg-orange-50 text-orange-700 border-orange-300 shadow-sm"
                : "bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300"
            }`}
          >
            Sueldo por trabajo
          </button>
        </div>

        <p className="text-xs text-stone-500 -mt-2">
          {esSueldo
            ? "Le pagas por trabajar: suma a los gastos y baja la ganancia del negocio. No descuenta lo que le debes de deliverys y ventas."
            : "Le pagas lo que le corresponde de deliverys y ventas: baja el saldo pendiente y no afecta la ganancia."}
        </p>

        <Input
          autoFocus
          required
          type="number"
          label="Monto"
          prefix="$"
          placeholder="0"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />

        {!esSueldo && saldoPendiente > 0 && (
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, amount: String(Math.round(saldoPendiente)) })
            }
            className="-mt-2 text-xs font-bold text-pink-700 hover:text-pink-900 underline underline-offset-2 transition-colors"
          >
            Saldar todo: {formatCLP(saldoPendiente)}
          </button>
        )}

        <Input
          label="Nota (opcional)"
          placeholder={
            esSueldo ? "Ej: sueldo octubre" : "Ej: transferencia deliverys de agosto"
          }
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="neutra" size="lg" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primaria"
            size="lg"
            fullWidth
            loading={isSaving}
            loadingText="Guardando..."
          >
            {esSueldo ? "Registrar Sueldo" : "Registrar Abono"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
