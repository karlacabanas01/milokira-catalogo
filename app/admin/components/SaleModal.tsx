"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { Modal, Input, Button } from "../../components/ui";

type SaleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    description: string;
    total_amount: number;
    /** Parte del monto que le corresponde a Robin (0 si no hay). */
    robin_amount: number;
  }) => void;
  isSaving: boolean;
};

export default function SaleModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: SaleModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [hayRobin, setHayRobin] = useState(false);
  const [robinAmount, setRobinAmount] = useState("");

  const totalNum = Number(amount) || 0;
  const robinNum = hayRobin ? Number(robinAmount) || 0 : 0;
  // No puede tocarle más de lo que se cobró.
  const robinExcede = robinNum > totalNum && totalNum > 0;
  const paraVivero = totalNum - robinNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || robinExcede) return;

    onSave({
      description,
      total_amount: totalNum,
      robin_amount: robinNum,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Venta">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          type="text"
          required
          label="¿Qué vendiste? (Descripción)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: 2 Plantas pequeñas y 1 macetero..."
        />

        <Input
          type="number"
          required
          min="0"
          label="Monto Total"
          prefix="$"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />

        {/* Parte de esta venta que le toca a Robin. El monto total no cambia:
            el cliente paga todo junto; esto solo reparte. */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hayRobin}
              onChange={(e) => {
                setHayRobin(e.target.checked);
                if (!e.target.checked) setRobinAmount("");
              }}
              className="w-4 h-4 accent-milokira-lila cursor-pointer"
            />
            <span className="text-sm font-bold text-stone-700 flex items-center gap-1.5">
              <HandCoins size={15} className="text-purple-600" />
              Incluye venta de Robin
            </span>
          </label>

          {hayRobin && (
            <>
              <Input
                type="number"
                min="0"
                label="¿Cuánto es de Robin?"
                prefix="$"
                value={robinAmount}
                onChange={(e) => setRobinAmount(e.target.value)}
                placeholder="0"
                error={
                  robinExcede
                    ? "No puede ser mayor que el monto total."
                    : undefined
                }
              />

              {robinNum > 0 && !robinExcede && (
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-stone-500">Para el vivero</span>
                  <span className="text-emerald-700 font-mono font-bold">
                    ${paraVivero.toLocaleString("es-CL")}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <Button
          type="submit"
          variant="exito"
          size="lg"
          fullWidth
          disabled={robinExcede}
          loading={isSaving}
          loadingText="Guardando..."
        >
          Guardar Venta
        </Button>
      </form>
    </Modal>
  );
}
