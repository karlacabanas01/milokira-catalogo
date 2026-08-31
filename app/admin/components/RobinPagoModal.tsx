"use client";

import { useState } from "react";
import { Modal, Input, Button } from "../../components/ui";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: {
    description: string;
    amount: number;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      description: form.description.trim() || "Pago a Robin",
      amount: Number(form.amount),
    });
    setForm({ description: "", amount: "" });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagar a Robin 🤝">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-stone-500 -mt-1">
          Registra plata que ya le entregaste. Baja el saldo pendiente y no
          afecta las ventas ni los gastos del negocio.
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

        {saldoPendiente > 0 && (
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
          placeholder="Ej: transferencia deliverys de agosto"
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
            Registrar Pago
          </Button>
        </div>
      </form>
    </Modal>
  );
}
