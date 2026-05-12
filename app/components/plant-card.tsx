import Image from "next/image";
import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
// 1. IMPORTAMOS LOS ICONOS NUEVOS
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, Check } from "lucide-react";
import { useCart } from "../context/CartContext";

interface Precio {
  valor: number;
  tipo: string;
  disponible: boolean;
}

interface Planta {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  imagenPosition?: string;
  categorias: string[];
  precio: Precio;
}

interface PlantCardProps {
  readonly planta: Planta;
  readonly isAdmin: boolean;
  readonly onEdit: () => void;
}

const formatearPrecio = (precio: Precio): string => {
  if (precio.disponible === false) return "Agotado por ahora";

  const montoFormateado = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(precio.valor);

  if (precio.tipo === "desde") return `Desde ${montoFormateado}`;
  if (precio.tipo === "aprox") return `Aprox. ${montoFormateado}`;
  return montoFormateado;
};

export default function PlantCard({ planta, isAdmin, onEdit }: PlantCardProps) {
  const { id, nombre, descripcion, imagenUrl, imagenPosition, precio, categorias } = planta;
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();
  const estaDisponible = precio.disponible !== false;
  const esTutor = categorias?.some((c) => c.toUpperCase() === "IMPLEMENTOS");

  const agregarAlCarrito = () => {
    if (!estaDisponible) return;
    addItem({
      id,
      nombre,
      precio: precio.valor,
      precioTipo: precio.tipo,
      imagenUrl,
      imagenPosition,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const manejarCompra = () => {
    if (!estaDisponible) return;
    const numeroWhatsApp = "56994955949";
    const mensaje = `¡Hola! 🌿 Estaba viendo el catálogo de Milokira y me interesa mucho la planta *${nombre}*. ¿Aún la tienen disponible?`;
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  const manejarEliminar = async () => {
    const confirmar = window.confirm(
      `¿Estás segura de que quieres eliminar a ${nombre} del catálogo?`,
    );

    if (confirmar) {
      try {
        await deleteDoc(doc(db, "Plantas", id));
        // alert("Planta eliminada correctamente."); // Opcional: Firebase onSnapshot ya actualiza la UI
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("Hubo un error al eliminar la planta.");
      }
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col h-full border-2 relative hover:-translate-y-1
      ${
        estaDisponible
          ? "hover:shadow-xl hover:shadow-milokira-lila/30 border-transparent hover:border-milokira-lila/50 group"
          : `${isAdmin ? "" : "grayscale pointer-events-none"} opacity-70 border-gray-100 bg-gray-50`
      }`}
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-3xl bg-[#fdfaf5]">
        {imagenUrl ? (
          <Image
            src={imagenUrl}
            alt={nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectPosition: imagenPosition || "50% 50%" }}
            className={`object-cover transition-transform duration-700 ${estaDisponible ? "group-hover:scale-110" : ""}`}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">🌿</span>
            <span className="text-xs text-stone-400 font-medium tracking-wider">
              PRÓXIMAMENTE
            </span>
          </div>
        )}

        {/* Carga (Skeleton) para la imagen */}
        {imagenUrl && isLoading && (
          <div className="absolute inset-0 bg-milokira-crema z-10 flex items-center justify-center">
            <div className="w-10 h-10 border-[3px] border-milokira-lila/30 border-t-milokira-verde rounded-full animate-spin" />
          </div>
        )}

        <div
          className={`absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent ${estaDisponible ? "opacity-60" : "opacity-80"}`}
        ></div>

        {/* NUEVOS BOTONES DE ADMIN MÁS ELEGANTES */}
        {isAdmin && (
          <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 z-20 flex gap-1 sm:gap-1.5">
            <button
              onClick={onEdit}
              className="bg-teal-50 backdrop-blur-xs text-teal-500 p-1.5 sm:p-2 rounded-full shadow-md hover:bg-teal-100 hover:text-teal-700 transition-all duration-300 border border-teal-200"
              title="Editar planta"
            >
              <Pencil size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={manejarEliminar}
              className="bg-red-50 backdrop-blur-xs text-red-400 p-1.5 sm:p-2 rounded-full shadow-md hover:bg-red-100 hover:text-red-600 transition-all duration-300 border border-red-200"
              title="Eliminar planta"
            >
              <Trash2 size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        )}

        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex flex-wrap gap-1 justify-end max-w-[70%]">
          {categorias?.map((cat) => (
            <span key={cat} className="bg-white/80 backdrop-blur-sm text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-stone-600 uppercase tracking-tighter shadow-sm border border-stone-100">
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-5 flex flex-col flex-grow">
        <h3
          className={`${esTutor ? "text-xl" : "text-sm sm:text-xl"} font-bold mb-1 sm:mb-2 leading-tight line-clamp-2 ${estaDisponible ? "text-gray-800" : "text-gray-400"}`}
          title={nombre}
        >
          {nombre}
        </h3>
        <p
          className={`mb-2 sm:mb-6 ${isExpanded ? "" : "line-clamp-2"} sm:line-clamp-3 flex-grow ${esTutor ? "whitespace-pre-line text-lg sm:text-sm leading-relaxed" : "text-xs sm:text-sm"} ${estaDisponible ? "text-gray-500" : "text-gray-400"}`}
        >
          {descripcion}
        </p>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="sm:hidden self-start mb-2 flex items-center gap-0.5 text-[11px] font-bold text-milokira-lila hover:text-milokira-verde transition-colors uppercase tracking-wider"
        >
          {isExpanded ? (
            <>
              Ver menos <ChevronUp size={12} strokeWidth={3} />
            </>
          ) : (
            <>
              Ver más <ChevronDown size={12} strokeWidth={3} />
            </>
          )}
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-auto">
          <div
            className={`font-black text-base sm:text-xl tracking-tight ${estaDisponible ? "text-milokira-verde" : "text-gray-400 italic"}`}
          >
            {formatearPrecio(precio)}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={manejarCompra}
              disabled={!estaDisponible}
              className={`relative z-10 overflow-hidden flex-1 sm:flex-none sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 rounded font-bold text-[10px] sm:text-xs uppercase tracking-[1px] transition-all duration-500
                ${
                  estaDisponible
                    ? "cursor-pointer outline outline-[1px] outline-milokira-verde text-milokira-verde hover:text-white before:content-[''] before:absolute before:-left-[20px] before:top-0 before:h-full before:bg-milokira-verde before:skew-x-[45deg] before:-z-10 before:w-0 hover:before:w-[200%] before:transition-[width] before:duration-500"
                    : "bg-gray-200 text-gray-500 border-none opacity-50 cursor-not-allowed shadow-none scale-95"
                }`}
            >
              {estaDisponible ? "Lo quiero" : "Agotado"}
            </button>

            {estaDisponible && (
              <button
                type="button"
                onClick={agregarAlCarrito}
                aria-label="Agregar al carrito"
                title="Agregar al carrito"
                className={`shrink-0 p-1.5 sm:p-2 rounded-full transition-all duration-300 shadow-sm border ${
                  justAdded
                    ? "bg-milokira-verde border-milokira-verde text-white scale-110"
                    : "bg-white border-milokira-verde/30 text-milokira-verde hover:bg-milokira-verde hover:text-white hover:border-milokira-verde active:scale-90"
                }`}
              >
                {justAdded ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <Plus size={14} strokeWidth={3} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
