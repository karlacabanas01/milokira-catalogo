import { useState } from "react";

const formatearPrecio = (precio) => {
  const montoFormateado = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(precio.valor);

  if (precio.tipo === "desde") return `Desde ${montoFormateado}`;
  if (precio.tipo === "aprox") return `Aprox. ${montoFormateado}`;
  return montoFormateado;
};

export default function PlantCard({ planta }) {
  const { nombre, descripcion, imagenUrl, precio, categoria } = planta;
  const [isLoading, setIsLoading] = useState(true);

  const manejarCompra = () => {
    const numeroWhatsApp = "56994955949";
    const mensaje = `¡Hola! 🌿 Estaba viendo el catálogo de Milokira y me interesa mucho la planta *${nombre}*. ¿Aún la tienen disponible?`;
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-milokira-lila/30 transition-all duration-500 ease-in-out group flex flex-col h-full border-2 border-transparent hover:border-milokira-lila/50 relative">
      <div className="absolute top-3 right-3 z-10 bg-milokira-lila/90 backdrop-blur-sm text-milokira-verde text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
        {categoria}
      </div>

      <div className="relative h-64 overflow-hidden bg-milokira-crema shrink-0 group">
        {/* {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse z-10">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
          </div>
        )} */}

        {/* AQUÍ ESTÁ EL CAMBIO: Se agregó loading="lazy" */}
        <img
          src={imagenUrl}
          alt={nombre}
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          className={`w-full h-full object-cover object-center transform transition-all duration-700 ease-in-out group-hover:scale-110 
          ${isLoading ? "opacity-0" : "opacity-100"}`}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">
          {nombre}
        </h3>

        <p className="text-gray-500 text-sm mb-6 line-clamp-2 flex-grow">
          {descripcion}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="text-milokira-verde font-extrabold text-lg">
            {formatearPrecio(precio)}
          </div>

          <button
            onClick={manejarCompra}
            className="relative z-10 overflow-hidden px-4 py-2 rounded font-bold text-xs uppercase tracking-[1px] cursor-pointer outline outline-[1px] outline-milokira-verde text-milokira-verde transition-all duration-500 hover:text-white hover:shadow-md before:content-[''] before:absolute before:-left-[20px] before:top-0 before:h-full before:bg-milokira-verde before:skew-x-[45deg] before:-z-10 before:w-0 hover:before:w-[200%] before:transition-[width] before:duration-500"
          >
            Lo quiero
          </button>
        </div>
      </div>
    </div>
  );
}
