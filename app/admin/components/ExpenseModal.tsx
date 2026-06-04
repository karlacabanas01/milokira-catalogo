import { useState } from "react";

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      description: form.description,
      amount: Number(form.amount),
    });
    setForm({ description: "", amount: "" });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-stone-200 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold mb-6 text-stone-800 flex items-center gap-2">
          Registrar Gasto 💸
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-stone-500 ml-1">
              Descripción
            </label>
            <input
              autoFocus
              required
              placeholder="Ej: Maceteros"
              className="w-full p-3.5 bg-milokira-crema border border-stone-200 rounded-xl text-stone-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-stone-400"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-stone-500 ml-1">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-stone-500">$</span>
              <input
                required
                type="number"
                placeholder="0"
                className="w-full p-3.5 pl-8 bg-milokira-crema border border-stone-200 rounded-xl text-stone-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-stone-400"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-stone-100 border border-stone-300/60 text-stone-700 font-medium rounded-xl hover:bg-stone-100 hover:text-stone-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? "Guardando..." : "Guardar Gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
