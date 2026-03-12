"use client";

import { useEffect, useState } from "react";
// 1. IMPORTAMOS FIREBASE EN LUGAR DE SUPABASE
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Ajusta la ruta si tu config está en otra carpeta
import { X } from "lucide-react";

// 2. ACTUALIZAMOS EL TIPO AL FORMATO FIREBASE
type Expense = {
  idFirebase: string;
  description: string;
  amount: number;
  created_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  // Eliminamos businessId porque ya no hace falta
  onChange: () => void;
};

export default function ExpenseListModal({ isOpen, onClose, onChange }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchExpenses = async () => {
        setLoading(true);
        try {
          // 3. CONSULTA A FIREBASE: Traemos "Gastos" ordenados por fecha de creación (más recientes primero)
          const q = query(
            collection(db, "Gastos"),
            orderBy("created_at", "desc"),
          );
          const querySnapshot = await getDocs(q);

          const listaGastos: Expense[] = [];

          querySnapshot.forEach((documento) => {
            const data = documento.data();
            listaGastos.push({
              idFirebase: documento.id,
              description: data.description || "Sin descripción",
              amount: Number(data.amount) || 0,
              // Por si en la migración quedó guardado como 'date' en vez de 'created_at'
              created_at:
                data.created_at || data.date || new Date().toISOString(),
            });
          });

          setExpenses(listaGastos);
        } catch (error) {
          console.error("Error al cargar los gastos:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchExpenses();
    }
  }, [isOpen]);

  // 4. FUNCIÓN PARA ELIMINAR EL DOCUMENTO DE FIREBASE
  const handleDelete = async (idFirebase: string) => {
    if (!confirm("¿Borrar gasto?")) return;

    try {
      await deleteDoc(doc(db, "Gastos", idFirebase));

      // Actualizamos la lista en pantalla
      setExpenses((prev) => prev.filter((e) => e.idFirebase !== idFirebase));

      // Le avisamos a la página principal que recalcule las ganancias
      onChange();
    } catch (error) {
      console.error("Error al borrar:", error);
      alert("Hubo un error al eliminar el gasto.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-800 shadow-2xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-rose-400">
            Historial de Gastos
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center text-zinc-500 py-10">Cargando...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center text-zinc-500 py-10 border border-dashed border-zinc-800 rounded-xl">
              Sin gastos.
            </div>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.idFirebase}
                className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center"
              >
                <div>
                  <p className="text-white font-medium">
                    {expense.description}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(expense.created_at).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-rose-400 font-bold">
                    -${expense.amount.toLocaleString("es-CL")}
                  </span>
                  <button
                    onClick={() => handleDelete(expense.idFirebase)}
                    className="text-xs text-zinc-600 hover:text-rose-400 mt-1 underline"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
