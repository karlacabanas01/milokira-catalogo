"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { renderTicket, type TicketOrder } from "../ticketImg";

const STORAGE_KEY = "milokira-tickets-print";

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, base64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] || "image/png";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

async function compartirImagen(dataUrl: string, nombre: string) {
  const file = dataUrlToFile(dataUrl, `${nombre}.png`);
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShare) {
    try {
      await navigator.share({ files: [file], title: nombre });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Error al compartir:", err);
      }
    }
  } else {
    // Fallback: descarga la imagen.
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${nombre}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export default function TicketPrintPage() {
  const [tickets, setTickets] = useState<{ src: string; nombre: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const orders = JSON.parse(raw) as TicketOrder[];
        setTickets(
          orders.map((o) => ({
            src: renderTicket(o),
            nombre: `pedido-${o.customer_name}`,
          })),
        );
      }
    } catch (err) {
      console.error("Error generando tickets:", err);
    }
    setLoaded(true);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 pb-16">
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3">
        <Link href="/admin/pedidos">
          <button className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
            <ArrowLeft size={16} />
            Volver
          </button>
        </Link>
        <p className="text-sm font-bold text-zinc-700">
          {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
        </p>
      </div>

      {/* Instrucción */}
      <div className="mx-auto max-w-md px-4 mt-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm font-bold text-emerald-800 mb-0.5">
            📷 Para guardar en Fotos
          </p>
          <p className="text-xs text-emerald-700 leading-snug">
            Mantén presionada la imagen y toca{" "}
            <span className="font-bold">&ldquo;Añadir a Fotos&rdquo;</span>, o usa
            el botón <span className="font-bold">Enviar por WhatsApp</span>.
          </p>
        </div>
      </div>

      {/* Tickets */}
      <div className="mx-auto max-w-md px-4 mt-5 space-y-8">
        {!loaded && (
          <p className="text-center text-zinc-500 text-sm py-10">
            Generando tickets…
          </p>
        )}
        {loaded && tickets.length === 0 && (
          <p className="text-center text-zinc-500 text-sm py-10">
            No hay tickets para mostrar. Vuelve a /admin/pedidos.
          </p>
        )}
        {tickets.map((t, i) => (
          <div key={t.nombre + i} className="flex flex-col items-center gap-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Ticket {i + 1}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.src}
              alt={`Ticket ${i + 1}`}
              className="w-full max-w-[320px] border border-zinc-300 shadow-sm bg-white"
            />
            <button
              type="button"
              onClick={() => compartirImagen(t.src, t.nombre)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-full text-sm shadow-md transition-colors active:scale-95"
            >
              <Send size={15} strokeWidth={2.5} />
              Enviar por WhatsApp
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
