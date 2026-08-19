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
import { Modal, EmptyState } from "../../components/ui";

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Historial de Gastos" tall>
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-stone-500 py-10">Cargando...</div>
        ) : expenses.length === 0 ? (
          <EmptyState>Sin gastos.</EmptyState>
        ) : (
          expenses.map((expense) => (
            <div
              key={expense.idFirebase}
              className="bg-campo p-4 rounded-xl border border-borde flex justify-between items-center"
            >
              <div>
                <p className="text-stone-800 font-medium">
                  {expense.description}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {new Date(expense.created_at).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </div>
              <div className="text-right">
                <span className="block text-rose-600 font-bold">
                  -${expense.amount.toLocaleString("es-CL")}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(expense.idFirebase)}
                  className="text-xs text-stone-400 hover:text-rose-600 mt-1 underline"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
