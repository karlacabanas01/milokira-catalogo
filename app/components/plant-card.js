const formatearPrecio = (precio) => {
  // Si no hay precio o la planta no está disponible, manejamos el caso
  if (!precio || precio.disponible === false) return "No disponible";

  const montoFormateado = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(precio.valor);

  if (precio.tipo === "desde") return `Desde ${montoFormateado}`;
  if (precio.tipo === "aprox") return `Aprox. ${montoFormateado}`;
  return montoFormateado;
};

export default function PlantCard({ planta, prioridad = false }) {
  const { nombre, descripcion, imagenUrl, precio, categoria } = planta;

  const esDisponible = precio.disponible !== false;

  const manejarCompra = () => {
    if (!esDisponible) return;

    const numeroWhatsApp = "56994955949";
    const mensaje = `¡Hola! 🌿 Estaba viendo el catálogo de Milokira y me interesa mucho la planta *${nombre}*. ¿Aún la tienen disponible?`;
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full border-2 border-transparent relative 
      ${!esDisponible ? "opacity-75 grayscale-[0.5]" : "hover:shadow-milokira-lila/30 hover:border-milokira-lila/50"}`}
    >
      {/* Etiqueta de Categoría */}
      <div className="absolute top-3 right-3 z-10 bg-milokira-lila/90 backdrop-blur-sm text-milokira-verde text-xs font-bold uppercase px-3 py-1 rounded-full">
        {categoria}
      </div>

      {/* Imagen con filtro si no está disponible */}
      <div className="relative h-64 overflow-hidden bg-milokira-crema shrink-0 group">
        <img
          src={imagenUrl}
          alt={nombre}
          className={`w-full h-full object-cover transition-all duration-700 ${esDisponible ? "group-hover:scale-110" : ""}`}
        />
        {!esDisponible && (
          <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
            <span className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg font-bold shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">
          {nombre}
        </h3>
        <p className="text-gray-500 text-sm mb-6 line-clamp-2 flex-grow">
          {descripcion}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div
            className={`${esDisponible ? "text-milokira-verde" : "text-gray-400"} font-extrabold text-lg`}
          >
            {formatearPrecio(precio)}
          </div>

          <button
            onClick={manejarCompra}
            disabled={!esDisponible}
            className={`relative z-10 px-4 py-2 rounded font-bold text-xs uppercase tracking-[1px] transition-all duration-500 
              ${
                esDisponible
                  ? 'cursor-pointer outline outline-[1px] outline-milokira-verde text-milokira-verde hover:text-white before:content-[""] before:absolute before:-left-[20px] before:top-0 before:h-full before:bg-milokira-verde before:skew-x-[45deg] before:-z-10 before:w-0 hover:before:w-[200%] before:transition-[width]'
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            {esDisponible ? "Lo quiero" : "Sin stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
