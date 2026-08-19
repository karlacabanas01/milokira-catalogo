"use client";

import { useState } from "react";
import { Modal, Input, Button } from "../../components/ui";

type SaleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { description: string; total_amount: number }) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onSave({
      description,
      total_amount: Number(amount),
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

        <Button
          type="submit"
          variant="exito"
          size="lg"
          fullWidth
          loading={isSaving}
          loadingText="Guardando..."
        >
          Guardar Venta
        </Button>
      </form>
    </Modal>
  );
}
