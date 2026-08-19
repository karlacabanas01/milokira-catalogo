"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Image as ImageIcon, Leaf, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  imageBase64?: string;
  imageMime?: string;
}

const RATE_LIMIT_KEY = "milokira-chat-count";
const RATE_LIMIT_DATE_KEY = "milokira-chat-date";
const DAILY_LIMIT = 5;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export default function PlantChat({ isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "¡Guau! Soy Kira 🐶🌿 Sé mucho de plantas (y un poquito de morder macetas 😅). Cuéntame qué le pasa a tu plantita o mándame una foto.\n\n⚠️ Tienes 5 preguntas al día, ¡no las desperdicies!",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mime: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(DAILY_LIMIT);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem(RATE_LIMIT_DATE_KEY);
    if (storedDate !== today) {
      localStorage.setItem(RATE_LIMIT_DATE_KEY, today);
      localStorage.setItem(RATE_LIMIT_KEY, "0");
      setRemaining(DAILY_LIMIT);
    } else {
      const used = Number(localStorage.getItem(RATE_LIMIT_KEY) ?? 0);
      setRemaining(Math.max(0, DAILY_LIMIT - used));
    }
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const fileToBase64 = (file: File): Promise<{ base64: string; mime: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({ base64, mime: file.type });
      };
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setError("La imagen es muy grande (máx 4MB).");
      return;
    }

    try {
      const { base64, mime } = await fileToBase64(file);
      setAttachedImage({ base64, mime, preview: URL.createObjectURL(file) });
      setError("");
    } catch {
      setError("No pude cargar la imagen.");
    }
  };

  const incrementUsage = () => {
    const used = Number(localStorage.getItem(RATE_LIMIT_KEY) ?? 0) + 1;
    localStorage.setItem(RATE_LIMIT_KEY, String(used));
    setRemaining(Math.max(0, DAILY_LIMIT - used));
  };

  const enviar = async () => {
    const texto = input.trim();
    if (!texto && !attachedImage) return;
    if (remaining <= 0) {
      setError("Llegaste al límite diario. Vuelve mañana o escríbenos por WhatsApp.");
      return;
    }

    const nuevoMensaje: ChatMessage = {
      role: "user",
      text: texto,
      imageBase64: attachedImage?.base64,
      imageMime: attachedImage?.mime,
    };

    const historial = [...messages.filter((m) => m.role !== "model" || !m.text.startsWith("¡Hola!")), nuevoMensaje];
    setMessages((prev) => [...prev, nuevoMensaje]);
    setInput("");
    setAttachedImage(null);
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historial }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error en la respuesta");
      }

      incrementUsage();
      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(texto);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar chat"
          onClick={onClose}
          className="fixed inset-0 z-superposicion bg-stone-900/40 backdrop-blur-sm"
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-modal w-full sm:max-w-md bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-gradient-to-r from-milokira-lila/10 to-milokira-verde/10">
          <div className="flex items-center gap-3 text-stone-800">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-milokira-lila to-milokira-verde flex items-center justify-center shadow-md">
              <Leaf className="text-white" size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-wide leading-tight">Kira</h2>
              <p className="text-[11px] text-stone-500 font-medium">Perrita experta en plantas 🐾</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-stone-50/50">
          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-milokira-verde text-white rounded-br-sm"
                    : "bg-white text-stone-700 border border-stone-200 rounded-bl-sm shadow-sm"
                }`}
              >
                {m.imageBase64 && m.imageMime && (
                  <img
                    src={`data:${m.imageMime};base64,${m.imageBase64}`}
                    alt="Imagen enviada"
                    className="rounded-lg mb-2 max-w-full max-h-60 object-contain"
                  />
                )}
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm shadow-sm px-3.5 py-2.5 flex items-center gap-2 text-stone-500 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Kira está olfateando la respuesta…
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <footer className="border-t border-stone-200 p-3 bg-white space-y-2">
          {attachedImage && (
            <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-2">
              <img
                src={attachedImage.preview}
                alt="Vista previa"
                className="w-12 h-12 object-cover rounded"
              />
              <span className="text-xs text-stone-600 flex-1 truncate">
                Imagen lista para enviar
              </span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-stone-400 hover:text-rose-500 p-1"
                aria-label="Quitar imagen"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || remaining <= 0}
              className="shrink-0 p-2.5 rounded-full bg-stone-100 text-stone-600 hover:bg-milokira-lila/20 hover:text-milokira-lila transition-colors disabled:opacity-40"
              aria-label="Adjuntar imagen"
            >
              <ImageIcon size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={remaining > 0 ? "Escribe tu pregunta..." : "Límite diario alcanzado"}
              rows={1}
              disabled={loading || remaining <= 0}
              className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-milokira-lila/40 focus:border-milokira-lila transition-all resize-none max-h-24"
            />

            <button
              type="button"
              onClick={enviar}
              disabled={loading || remaining <= 0 || (!input.trim() && !attachedImage)}
              className="shrink-0 p-2.5 rounded-full bg-milokira-verde text-white hover:bg-milokira-lila transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              aria-label="Enviar"
            >
              <Send size={18} strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-[10px] text-stone-400 text-center">
            {remaining} consultas restantes hoy · Las respuestas pueden contener errores
          </p>
        </footer>
      </aside>
    </>
  );
}
