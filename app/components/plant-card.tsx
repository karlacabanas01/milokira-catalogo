import Image from "next/image";
import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
// 1. IMPORTAMOS LOS ICONOS NUEVOS
import { Pencil, Trash2 } from "lucide-react";

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
  const { id, nombre, descripcion, imagenUrl, precio, categorias } = planta;
  const [isLoading, setIsLoading] = useState(true);
  const estaDisponible = precio.disponible !== false;

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
      className={`bg-white rounded-xl overflow-hidden shadow-sm transition-all duration-500 flex flex-col h-full border-2 relative 
      ${
        estaDisponible
          ? "hover:shadow-xl hover:shadow-milokira-lila/30 border-transparent hover:border-milokira-lila/50 group"
          : `${isAdmin ? "" : "grayscale pointer-events-none"} opacity-70 border-gray-100 bg-gray-50`
      }`}
    >
      <div className="relative w-full h-64 overflow-hidden rounded-t-2xl bg-[#fdfaf5]">
        {imagenUrl ? (
          <Image
            src={imagenUrl}
            alt={nombre}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
          <div className="absolute top-3 left-3 z-20 flex gap-1.5">
            {/* Botón Editar - Celeste suave al hover */}
            <button
              onClick={onEdit}
              className="bg-teal-50 backdrop-blur-xs text-teal-500 p-2 rounded-full shadow-md hover:bg-teal-100 hover:text-teal-700 transition-all duration-300 border border-teal-200"
              title="Editar planta"
            >
              <Pencil size={16} strokeWidth={2.5} />
            </button>

            {/* Botón Eliminar - Rojo/Rosa suave al hover */}
            <button
              onClick={manejarEliminar}
              className="bg-red-50 backdrop-blur-xs text-red-400 p-2 rounded-full shadow-md hover:bg-red-100 hover:text-red-600 transition-all duration-300 border border-red-200"
              title="Eliminar planta"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <div className="absolute top-3 right-3 z-10 flex flex-wrap gap-1 justify-end max-w-[60%]">
          {categorias?.map((cat) => (
            <span key={cat} className="bg-white/80 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-full text-stone-600 uppercase tracking-tighter shadow-sm border border-stone-100">
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3
          className={`text-xl font-bold mb-2 leading-tight line-clamp-2 ${estaDisponible ? "text-gray-800" : "text-gray-400"}`}
          title={nombre}
        >
          {nombre}
        </h3>
        <p
          className={`text-sm mb-6 line-clamp-3 flex-grow ${estaDisponible ? "text-gray-500" : "text-gray-400"}`}
        >
          {descripcion}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div
            className={`font-extrabold text-lg ${estaDisponible ? "text-milokira-verde" : "text-gray-400 italic"}`}
          >
            {formatearPrecio(precio)}
          </div>

          <button
            onClick={manejarCompra}
            disabled={!estaDisponible}
            className={`relative z-10 overflow-hidden px-4 py-2 rounded font-bold text-xs uppercase tracking-[1px] transition-all duration-500
              ${
                estaDisponible
                  ? "cursor-pointer outline outline-[1px] outline-milokira-verde text-milokira-verde hover:text-white before:content-[''] before:absolute before:-left-[20px] before:top-0 before:h-full before:bg-milokira-verde before:skew-x-[45deg] before:-z-10 before:w-0 hover:before:w-[200%] before:transition-[width] before:duration-500"
                  : "bg-gray-200 text-gray-500 border-none opacity-50 cursor-not-allowed shadow-none scale-95"
              }`}
          >
            {estaDisponible ? "Lo quiero" : "Agotado"}
          </button>
        </div>
      </div>
    </div>
  );
}
