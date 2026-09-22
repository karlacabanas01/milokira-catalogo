"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { Printer, ArrowLeft } from "lucide-react";
import { nombreCourier } from "../../envios/helpers";

/**
 * Etiqueta de envío para pegar en el paquete.
 *
 * Ocupa media hoja carta/oficio: se imprime una hoja, se corta por la mitad y
 * queda del tamaño que piden los couriers. No lleva el detalle de las plantas
 * —el courier no lo necesita y expone lo que va dentro del paquete.
 */

type Envio = {
  customer_name: string;
  phone?: string;
  address?: string;
  envio_rut?: string;
  envio_email?: string;
  envio_comuna?: string;
  envio_region?: string;
  envio_courier?: string;
  created_at?: string;
};

// Remitente fijo: es siempre el mismo y va impreso en cada etiqueta.
const REMITENTE = {
  nombre: "Milokira",
  direccion: "Talca, Región del Maule",
  telefono: "+56 9 9495 5949",
};

export default function EtiquetaEnvioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-stone-500">
          Cargando…
        </div>
      }
    >
      <EtiquetaContent />
    </Suspense>
  );
}

function EtiquetaContent() {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "Transacciones", id));
        if (snap.exists()) setEnvio(snap.data() as Envio);
      } catch (error) {
        console.error("Error cargando el envío:", error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        Cargando…
      </div>
    );
  }

  if (!envio) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-stone-500">
        <p>No se encontró el envío.</p>
        <a href="/admin/pedidos" className="text-sky-600 font-bold underline">
          Volver a pedidos
        </a>
      </div>
    );
  }

  const courier = nombreCourier(envio.envio_courier);

  return (
    <>
      <style>{`
        @page { size: letter portrait; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .etiqueta {
          width: 216mm;
          /* Media hoja carta: se imprime y se corta por la línea. */
          height: 139mm;
          box-sizing: border-box;
          padding: 12mm;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center justify-between gap-3 border-b border-stone-200">
        <a
          href="/admin/pedidos"
          className="flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft size={16} />
          Pedidos
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Printer size={16} />
          Imprimir etiqueta
        </button>
      </div>

      <div className="bg-stone-200 print:bg-white p-4 print:p-0">
        <div className="etiqueta bg-white mx-auto shadow-lg print:shadow-none border-2 border-stone-900 print:border-stone-900">
          {/* Courier arriba: es lo primero que mira quien despacha. */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-stone-900">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                Envío por
              </p>
              <p className="text-2xl font-black text-stone-900 leading-tight">
                {courier || "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                Por pagar
              </p>
              <p className="text-sm font-bold text-stone-900">
                Paga el destinatario
              </p>
            </div>
          </div>

          {/* Destinatario: el bloque grande, el que se lee al repartir. */}
          <div className="pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">
              Destinatario
            </p>
            <p className="text-2xl font-black text-stone-900 leading-tight">
              {envio.customer_name}
            </p>

            <table className="mt-2 text-[13px] text-stone-900 leading-snug">
              <tbody>
                <tr>
                  <td className="font-bold pr-3 align-top whitespace-nowrap">RUT</td>
                  <td className="font-mono">{envio.envio_rut || "—"}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-3 align-top whitespace-nowrap">Teléfono</td>
                  <td className="font-mono">{envio.phone || "—"}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-3 align-top whitespace-nowrap">Correo</td>
                  <td>{envio.envio_email || "—"}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-3 align-top whitespace-nowrap">Dirección</td>
                  <td>{envio.address || "—"}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-3 align-top whitespace-nowrap">Comuna</td>
                  <td>{envio.envio_comuna || "—"}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-3 align-top whitespace-nowrap">Región</td>
                  <td className="font-black">{envio.envio_region || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remitente: chico, abajo, como lo piden los couriers. */}
          <div className="mt-4 pt-3 border-t border-stone-400">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-0.5">
              Remitente
            </p>
            <p className="text-[13px] text-stone-900 leading-snug">
              <span className="font-black">{REMITENTE.nombre}</span>
              {" · "}
              {REMITENTE.direccion}
              {" · "}
              <span className="font-mono">{REMITENTE.telefono}</span>
            </p>
          </div>
        </div>

        {/* Guía de corte: marca dónde termina la media hoja. */}
        <p className="no-print text-center text-[11px] text-stone-500 mt-3">
          Se imprime en media hoja carta u oficio. Corta por el borde de la
          etiqueta.
        </p>
      </div>
    </>
  );
}
