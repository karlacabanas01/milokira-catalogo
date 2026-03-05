import Image from "next/image";

const formatearPrecio = (precio) => {
  if (precio.disponible === false) return "Agotado por ahora";

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
  const estaDisponible = precio.disponible !== false;

  const manejarCompra = () => {
    if (!estaDisponible) return;
    const numeroWhatsApp = "56994955949";
    const mensaje = `¡Hola! 🌿 Estaba viendo el catálogo de Milokira y me interesa mucho la planta *${nombre}*. ¿Aún la tienen disponible?`;
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-sm transition-all duration-500 flex flex-col h-full border-2 relative 
      ${
        estaDisponible
          ? "hover:shadow-xl hover:shadow-milokira-lila/30 border-transparent hover:border-milokira-lila/50 group"
          : "grayscale opacity-70 border-gray-100 bg-gray-50 pointer-events-none"
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
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">🌿</span>
            <span className="text-xs text-stone-400 font-medium tracking-wider">
              PRÓXIMAMENTE
            </span>
          </div>
        )}

        <div
          className={`absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent ${estaDisponible ? "opacity-60" : "opacity-80"}`}
        ></div>

        <span className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-full text-stone-600 uppercase tracking-tighter">
          {categoria}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3
          className={`text-xl font-bold mb-2 leading-tight ${estaDisponible ? "text-gray-800" : "text-gray-400"}`}
        >
          {nombre}
        </h3>
        <p
          className={`text-sm mb-6 line-clamp-2 flex-grow ${estaDisponible ? "text-gray-500" : "text-gray-400"}`}
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
