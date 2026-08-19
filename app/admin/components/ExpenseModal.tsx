"use client";

import { useState } from "react";
import { Modal, Input, Button } from "../../components/ui";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { description: string; amount: number }) => Promise<void>;
  isSaving: boolean;
};

export default function ExpenseModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: Props) {
  const [form, setForm] = useState({ description: "", amount: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      description: form.description,
      amount: Number(form.amount),
    });
    setForm({ description: "", amount: "" });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Gasto 💸">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          autoFocus
          required
          label="Descripción"
          placeholder="Ej: Maceteros"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Input
          required
          type="number"
          label="Monto"
          prefix="$"
          placeholder="0"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="neutra" size="lg" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="peligro"
            size="lg"
            fullWidth
            loading={isSaving}
            loadingText="Guardando..."
          >
            Guardar Gasto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
