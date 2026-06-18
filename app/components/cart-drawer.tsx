"use client";

import { useState } from "react";
import { ShoppingBag, X, Plus, Minus, Trash2, Send } from "lucide-react";
import { useCart } from "../context/CartContext";

const WHATSAPP_NUMBER = "56994955949";

export default function CartDrawer() {
  const { items, increment, decrement, removeItem, clear, totalItems, totalPrice } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const formatCLP = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

  const enviarWhatsApp = () => {
    if (items.length === 0) return;
    const lineas = items.map(
      (i) =>
        `\u2022 ${i.nombre} (x${i.quantity}) - ${formatCLP(i.precio * i.quantity)}`,
    );
    const mensaje = [
      "¡Hola Milokira!",
      "Me interesan estas plantitas:",
      "",
      ...lineas,
      "",
      `*Total aprox: ${formatCLP(totalPrice)}*`,
      "",
      "¿Tienen disponibilidad?",
    ].join("\n");
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-5 sm:bottom-24 sm:right-6 z-40 group bg-milokira-verde hover:bg-milokira-lila text-white p-4 rounded-full shadow-xl shadow-milokira-verde/40 transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Abrir carrito"
      >
        <ShoppingBag size={22} strokeWidth={2.5} />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-black min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            {totalItems}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar carrito"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2 text-stone-800">
            <ShoppingBag className="text-milokira-verde" size={20} strokeWidth={2.5} />
            <h2 className="font-bold text-lg tracking-wide">
              Mi consulta
              {totalItems > 0 && (
                <span className="ml-2 text-xs font-semibold text-stone-400">
                  ({totalItems} {totalItems === 1 ? "item" : "items"})
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 text-stone-500">
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                <ShoppingBag size={28} className="text-stone-300" />
              </div>
              <p className="font-bold text-stone-700 mb-1">Tu lista está vacía</p>
              <p className="text-sm">
                Agrega las plantitas que te interesen y pregúntanos por WhatsApp.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 p-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    {item.imagenUrl ? (
                      <img
                        src={item.imagenUrl}
                        alt={item.nombre}
                        style={{ objectPosition: item.imagenPosition || "50% 50%" }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        🌿
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 text-sm line-clamp-2 leading-tight">
                      {item.nombre}
                    </p>
                    <p className="text-milokira-verde font-extrabold text-sm mt-0.5">
                      {item.precioTipo === "desde" && "Desde "}
                      {item.precioTipo === "aprox" && "Aprox. "}
                      {formatCLP(item.precio)}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-stone-100 rounded-full p-0.5">
                        <button
                          type="button"
                          onClick={() => decrement(item.id)}
                          className="w-7 h-7 rounded-full bg-white text-stone-600 hover:text-milokira-verde flex items-center justify-center shadow-sm transition-colors"
                          aria-label="Restar"
                        >
                          <Minus size={14} strokeWidth={2.5} />
                        </button>
                        <span className="min-w-[20px] text-center font-bold text-sm text-stone-700">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increment(item.id)}
                          className="w-7 h-7 rounded-full bg-white text-stone-600 hover:text-milokira-verde flex items-center justify-center shadow-sm transition-colors"
                          aria-label="Sumar"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                        aria-label="Quitar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-stone-200 p-4 space-y-3 bg-stone-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500 font-medium">Total aprox.</span>
              <span className="font-black text-lg text-milokira-verde">
                {formatCLP(totalPrice)}
              </span>
            </div>
            <button
              type="button"
              onClick={enviarWhatsApp}
              className="w-full bg-milokira-verde hover:bg-milokira-lila text-white font-bold py-3 rounded-xl uppercase tracking-wider text-sm transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <Send size={16} strokeWidth={2.5} />
              Consultar por WhatsApp
            </button>
            <button
              type="button"
              onClick={clear}
              className="w-full text-stone-500 hover:text-rose-500 text-xs font-semibold py-1 transition-colors"
            >
              Vaciar lista
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
