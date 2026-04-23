"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { X, Plus, Edit3, Trash2, BookOpen, Search } from "lucide-react";

export interface Knowledge {
  idFirebase: string;
  titulo: string;
  categoria: string;
  keywords: string[];
  contenido: string;
  created_at: string;
}

const CATEGORIAS = ["cuidado", "enfermedad", "plaga", "especie", "negocio"] as const;

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

export default function KnowledgeListModal({ isOpen, onClose }: Props) {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Knowledge | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "ConocimientoKira"), orderBy("created_at", "desc"));
        const snap = await getDocs(q);
        const data: Knowledge[] = snap.docs.map((d) => ({
          idFirebase: d.id,
          ...(d.data() as Omit<Knowledge, "idFirebase">),
        }));
        setItems(data);
      } catch (err) {
        console.error("Error cargando conocimiento:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  const refresh = async () => {
    const q = query(collection(db, "ConocimientoKira"), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    setItems(
      snap.docs.map((d) => ({
        idFirebase: d.id,
        ...(d.data() as Omit<Knowledge, "idFirebase">),
      })),
    );
  };

  const handleDelete = async (item: Knowledge) => {
    if (!confirm(`¿Eliminar la ficha "${item.titulo}"?`)) return;
    await deleteDoc(doc(db, "ConocimientoKira", item.idFirebase));
    refresh();
  };

  const filtered = items.filter((i) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      i.titulo.toLowerCase().includes(s) ||
      i.categoria.toLowerCase().includes(s) ||
      i.keywords.some((k) => k.toLowerCase().includes(s))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 w-full max-w-3xl max-h-[90vh] rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-linear-to-r from-indigo-500/10 to-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <BookOpen size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tight text-white">
                Cerebro de Kira
              </h2>
              <p className="text-xs text-zinc-500">
                {items.length} fichas · conocimiento que usa la IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-2 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </header>

        <div className="px-6 py-3 border-b border-zinc-800 flex gap-2 items-center bg-zinc-950/40">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar título, keyword..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Plus size={14} strokeWidth={2.5} />
            Nueva
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-10 text-zinc-500 text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              {items.length === 0
                ? "No hay fichas todavía. Crea la primera."
                : "Nada coincide con la búsqueda."}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((item) => (
                <li
                  key={item.idFirebase}
                  className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.categoria}
                        </span>
                        <h3 className="font-bold text-white text-sm truncate">
                          {item.titulo}
                        </h3>
                      </div>
                      <p className="text-zinc-400 text-xs line-clamp-2 mb-2">
                        {item.contenido}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.keywords.slice(0, 6).map((k) => (
                          <span
                            key={k}
                            className="text-[10px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800"
                          >
                            {k}
                          </span>
                        ))}
                        {item.keywords.length > 6 && (
                          <span className="text-[10px] text-zinc-500">
                            +{item.keywords.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditing(item);
                          setShowForm(true);
                        }}
                        className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showForm && (
        <KnowledgeForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function KnowledgeForm({
  editing,
  onClose,
  onSaved,
}: {
  readonly editing: Knowledge | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState(editing?.titulo ?? "");
  const [categoria, setCategoria] = useState<string>(editing?.categoria ?? "cuidado");
  const [keywords, setKeywords] = useState(editing?.keywords?.join(", ") ?? "");
  const [contenido, setContenido] = useState(editing?.contenido ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        titulo: titulo.trim(),
        categoria,
        keywords: keywords
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
        contenido: contenido.trim(),
      };

      if (editing) {
        await updateDoc(doc(db, "ConocimientoKira", editing.idFirebase), data);
      } else {
        await addDoc(collection(db, "ConocimientoKira"), {
          ...data,
          created_at: new Date().toISOString(),
        });
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 w-full max-w-xl rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
        <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-black text-white">
            {editing ? "Editar ficha" : "Nueva ficha"}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-1.5 rounded-full"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Título
            </label>
            <input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Hojas amarillas en Monstera"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500 transition-colors"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Keywords (separadas por coma)
            </label>
            <input
              required
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="monstera, amarillo, hojas, riego"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Palabras que Kira usará para encontrar esta ficha al responder.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Contenido
            </label>
            <textarea
              required
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={7}
              placeholder="Información completa que usará la IA como contexto..."
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-linear-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-teal-400 shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
