"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  Pin,
  PinOff,
  Trash2,
  Search,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  Modal,
  Button,
  Textarea,
  Input,
  EmptyState,
} from "../../components/ui";
import {
  filtrarNotas,
  mapearNota,
  MAX_TEXTO,
  MAX_TITULO,
  ordenarNotas,
  selloDeTiempo,
  validarNota,
  type NotaNegocio,
} from "../notasHelpers";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

export default function NotasModal({ isOpen, onClose }: Props) {
  const [notas, setNotas] = useState<NotaNegocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [borrando, setBorrando] = useState<string | null>(null);

  // Edición en línea: la nota que se está editando y su texto en curso.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tituloEdit, setTituloEdit] = useState("");
  const [textoEdit, setTextoEdit] = useState("");
  const [errorEdit, setErrorEdit] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const cargar = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "NotasNegocio"));
        const lista: NotaNegocio[] = [];
        snap.forEach((documento) => {
          const nota = mapearNota(documento.id, documento.data());
          if (nota) lista.push(nota);
        });
        setNotas(ordenarNotas(lista));
      } catch (e) {
        console.error("Error cargando las notas:", e);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [isOpen]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const resultado = validarNota(texto, titulo);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const ref = doc(collection(db, "NotasNegocio"));
      const nueva = {
        titulo: resultado.titulo,
        texto: resultado.texto,
        created_at: new Date().toISOString(),
        fijada: false,
      };
      await setDoc(ref, nueva);
      // Se agrega en memoria en vez de recargar: la nota recién escrita
      // aparece al instante.
      setNotas((prev) =>
        ordenarNotas([{ idFirebase: ref.id, ...nueva }, ...prev]),
      );
      setTexto("");
      setTitulo("");
    } catch (e) {
      console.error("Error guardando la nota:", e);
      setError("No se pudo guardar. Revisa tu conexión.");
    } finally {
      setIsSaving(false);
    }
  };

  const alternarFijada = async (nota: NotaNegocio) => {
    const fijada = !nota.fijada;
    // Optimista: el reorden se ve enseguida y se revierte si falla.
    setNotas((prev) =>
      ordenarNotas(
        prev.map((n) =>
          n.idFirebase === nota.idFirebase ? { ...n, fijada } : n,
        ),
      ),
    );
    try {
      await updateDoc(doc(db, "NotasNegocio", nota.idFirebase), { fijada });
    } catch (e) {
      console.error("Error fijando la nota:", e);
      setNotas((prev) =>
        ordenarNotas(
          prev.map((n) =>
            n.idFirebase === nota.idFirebase ? { ...n, fijada: !fijada } : n,
          ),
        ),
      );
    }
  };

  const empezarEdicion = (nota: NotaNegocio) => {
    setEditandoId(nota.idFirebase);
    setTituloEdit(nota.titulo ?? "");
    setTextoEdit(nota.texto);
    setErrorEdit("");
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setTituloEdit("");
    setTextoEdit("");
    setErrorEdit("");
  };

  const guardarEdicion = async (nota: NotaNegocio) => {
    const resultado = validarNota(textoEdit, tituloEdit);
    if (!resultado.ok) {
      setErrorEdit(resultado.error);
      return;
    }

    // Sin cambios reales: se cierra sin escribir ni marcarla como editada.
    if (
      resultado.texto === nota.texto &&
      resultado.titulo === (nota.titulo ?? "")
    ) {
      cancelarEdicion();
      return;
    }

    setGuardandoEdit(true);
    try {
      const updated_at = new Date().toISOString();
      await updateDoc(doc(db, "NotasNegocio", nota.idFirebase), {
        titulo: resultado.titulo,
        texto: resultado.texto,
        updated_at,
      });
      setNotas((prev) =>
        ordenarNotas(
          prev.map((n) =>
            n.idFirebase === nota.idFirebase
              ? {
                  ...n,
                  titulo: resultado.titulo || undefined,
                  texto: resultado.texto,
                  updated_at,
                }
              : n,
          ),
        ),
      );
      cancelarEdicion();
    } catch (e) {
      console.error("Error editando la nota:", e);
      setErrorEdit("No se pudo guardar. Revisa tu conexión.");
    } finally {
      setGuardandoEdit(false);
    }
  };

  const borrar = async (nota: NotaNegocio) => {
    const referencia = nota.titulo || nota.texto;
    const confirmar = window.confirm(
      `¿Borrar esta nota?\n\n"${referencia.slice(0, 120)}${referencia.length > 120 ? "…" : ""}"`,
    );
    if (!confirmar) return;

    setBorrando(nota.idFirebase);
    try {
      await deleteDoc(doc(db, "NotasNegocio", nota.idFirebase));
      setNotas((prev) =>
        prev.filter((n) => n.idFirebase !== nota.idFirebase),
      );
    } catch (e) {
      console.error("Error borrando la nota:", e);
    } finally {
      setBorrando(null);
    }
  };

  // La nota en edición queda visible aunque el filtro la excluya: al editar
  // su texto puede dejar de coincidir con la búsqueda, y desaparecer a mitad
  // de escribir haría perder lo tipeado.
  const coinciden = filtrarNotas(notas, busqueda);
  const visibles =
    editandoId && !coinciden.some((n) => n.idFirebase === editandoId)
      ? [...coinciden, ...notas.filter((n) => n.idFirebase === editandoId)]
      : coinciden;
  const restantes = MAX_TEXTO - texto.trim().length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Apuntes del negocio"
      title="Notas 📝"
      size="md"
      tall
    >
      <div className="space-y-4">
        {/* Nueva nota */}
        <form onSubmit={guardar} className="space-y-2">
          <Input
            placeholder="Título (opcional)"
            maxLength={MAX_TITULO}
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              if (error) setError("");
            }}
          />
          <Textarea
            rows={3}
            placeholder="Ej: las calatheas se venden mejor en invierno"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (error) setError("");
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-bold ${
                error
                  ? "text-rose-600"
                  : restantes < 100
                    ? "text-amber-600"
                    : "text-stone-400"
              }`}
            >
              {error || (restantes < 100 ? `${restantes} caracteres` : "")}
            </span>
            <Button
              type="submit"
              variant="primaria"
              size="sm"
              loading={isSaving}
              loadingText="Guardando..."
            >
              <Plus size={14} strokeWidth={2.5} />
              Agregar nota
            </Button>
          </div>
        </form>

        {/* Buscador: solo cuando hay suficientes notas para que sirva. */}
        {notas.length > 4 && (
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              size={14}
            />
            <Input
              className="pl-9"
              placeholder="Buscar en las notas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center text-stone-500 py-10 text-sm">
            Cargando...
          </div>
        ) : notas.length === 0 ? (
          <EmptyState>
            Todavía no hay notas. Anota lo que no quieras olvidar del negocio.
          </EmptyState>
        ) : visibles.length === 0 ? (
          <EmptyState>Ninguna nota coincide con “{busqueda}”.</EmptyState>
        ) : (
          <div className="space-y-2">
            {visibles.map((n) => (
              <div
                key={n.idFirebase}
                className={`rounded-xl border p-3 ${
                  n.fijada
                    ? "border-amber-300 bg-amber-50"
                    : "border-borde bg-campo"
                }`}
              >
                {editandoId === n.idFirebase ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Título (opcional)"
                      maxLength={MAX_TITULO}
                      value={tituloEdit}
                      onChange={(e) => {
                        setTituloEdit(e.target.value);
                        if (errorEdit) setErrorEdit("");
                      }}
                    />
                    <Textarea
                      autoFocus
                      rows={Math.min(14, Math.max(3, textoEdit.split("\n").length + 1))}
                      value={textoEdit}
                      onChange={(e) => {
                        setTextoEdit(e.target.value);
                        if (errorEdit) setErrorEdit("");
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-rose-600">
                        {errorEdit}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="neutra"
                          size="sm"
                          onClick={cancelarEdicion}
                        >
                          <X size={14} />
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="primaria"
                          size="sm"
                          loading={guardandoEdit}
                          loadingText="Guardando..."
                          onClick={() => guardarEdicion(n)}
                        >
                          <Check size={14} strokeWidth={2.5} />
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {n.titulo && (
                      <p className="text-sm font-black text-stone-900 mb-1 break-words">
                        {n.titulo}
                      </p>
                    )}
                    <p className="text-sm text-stone-800 whitespace-pre-wrap break-words">
                      {n.texto}
                    </p>
                    <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-stone-500">
                        {(() => {
                          const sello = selloDeTiempo(n);
                          return sello.etiqueta
                            ? `${sello.etiqueta} ${sello.fecha}`
                            : sello.fecha;
                        })()}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => empezarEdicion(n)}
                          aria-label="Editar nota"
                          title="Editar nota"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarFijada(n)}
                          aria-label={n.fijada ? "Dejar de fijar" : "Fijar arriba"}
                          title={n.fijada ? "Dejar de fijar" : "Fijar arriba"}
                          className={`p-1.5 rounded-lg transition-all ${
                            n.fijada
                              ? "text-amber-700 hover:bg-amber-100"
                              : "text-stone-400 hover:text-amber-600 hover:bg-amber-50"
                          }`}
                        >
                          {n.fijada ? <PinOff size={14} /> : <Pin size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => borrar(n)}
                          disabled={borrando === n.idFirebase}
                          aria-label="Borrar nota"
                          title="Borrar nota"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
