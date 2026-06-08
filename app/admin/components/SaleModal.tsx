import { useState } from "react";
import { X } from "lucide-react";

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

  if (!isOpen) return null;

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!description || !amount) return;

    onSave({
      description,
      total_amount: Number(amount),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-stone-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-stone-200">
          <h2 className="text-xl font-bold text-stone-800">Registrar Venta</h2>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-500">
              ¿Qué vendiste? (Descripción)
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: 2 Plantas pequeñas y 1 macetero..."
              className="w-full bg-milokira-crema border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-500">
              Monto Total
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-stone-500">$</span>
              <input
                type="number"
                required
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-milokira-crema border border-stone-200 rounded-xl pl-8 pr-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar Venta"}
          </button>
        </form>
      </div>
    </div>
  );
}
