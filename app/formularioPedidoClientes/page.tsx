"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  Leaf,
  User,
  Phone,
  MapPin,
  StickyNote,
  CalendarDays,
  Truck,
  Store,
  Send,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  Search,
} from "lucide-react";

const WHATSAPP_NUMBER = "56994955949";

const SECTORES = [
  { value: "Norte Oriente (Bicentenario, Las Rastras)", price: 1000 },
  { value: "Norte Poniente (Barrio Norte, Las Américas, Sandoval)", price: 1500 },
  { value: "Sur Oriente (Valles de Talca, San Miguel, Don Sebastián)", price: 2500 },
  { value: "Sur Poniente (La Florida, Faustino, Nueva Holanda, Doña Ignacia)", price: 2500 },
  { value: "Otro sector", price: 0 },
] as const;

type DeliveryType = "delivery" | "retiro";
type CatalogPlant = {
  id: string;
  nombre: string;
  stock: number;
  disponible: boolean;
  imagenUrl: string;
  imagenPosition: string;
  imagenZoom?: number;
};

type SelectedPlant = {
  id: string;
  nombre: string;
  quantity: number;
};

export default function PedidoPublicoPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<DeliveryType>("retiro");
  const [diaEntrega, setDiaEntrega] = useState("");
  const [direccion, setDireccion] = useState("");
  const [sector, setSector] = useState("");
  const [sectorOtro, setSectorOtro] = useState("");
  const [notas, setNotas] = useState("");
  const [plantasSeleccionadas, setPlantasSeleccionadas] = useState<
    SelectedPlant[]
  >([]);

  const PAGE_SIZE = 6;
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogoPlantas, setCatalogoPlantas] = useState<CatalogPlant[]>([]);
  const [buscadorPlanta, setBuscadorPlanta] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [lastSearch, setLastSearch] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState<{ id: string; resumen: string } | null>(
    null,
  );

  // Reset visibleCount cuando cambia la búsqueda (derived state pattern)
  if (lastSearch !== buscadorPlanta) {
    setVisibleCount(PAGE_SIZE);
    setLastSearch(buscadorPlanta);
  }

  const telefonoCompleto = telefono ? `+56 9 ${telefono}` : "";
  const sectorFinal = sector === "Otro sector" ? sectorOtro.trim() : sector;
  const deliveryFee =
    tipoEntrega === "delivery"
      ? SECTORES.find((s) => s.value === sector)?.price ?? 0
      : 0;
  const deliveryFeeDisplay =
    tipoEntrega === "delivery" && sector === "Otro sector"
      ? "Se coordina"
      : tipoEntrega === "delivery" && deliveryFee > 0
        ? `$${deliveryFee.toLocaleString("es-CL")}`
        : "";
  const plantasDisponiblesFiltradas = catalogoPlantas.filter((planta) =>
    planta.nombre.toLowerCase().includes(buscadorPlanta.toLowerCase()),
  );
  const totalPlantitas = plantasSeleccionadas.reduce(
    (a, b) => a + b.quantity,
    0,
  );

  useEffect(() => {
    let mounted = true;

    const cargarCatalogo = async () => {
      try {
        const snap = await getDocs(collection(db, "Plantas"));
        if (!mounted) return;

        const lista = snap.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const stock = Number(data.stock) || 0;
            const disponible =
              data.precio?.disponible !== false && stock > 0;

            return {
              id: docSnap.id,
              nombre: data.nombre || docSnap.id,
              stock,
              disponible,
              imagenUrl: data.imagenUrl || "",
              imagenPosition: data.imagenPosition || "50% 50%",
              imagenZoom: Number(data.imagenZoom) || 1,
            };
          })
          .filter((planta) => planta.disponible)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        setCatalogoPlantas(lista);
      } catch (error) {
        console.error("Error cargando catálogo:", error);
      } finally {
        if (mounted) setIsLoadingCatalog(false);
      }
    };

    cargarCatalogo();

    return () => {
      mounted = false;
    };
  }, []);

  const validar = () => {
    if (!nombre.trim()) return "Necesitamos tu nombre.";
    if (telefono.length !== 8)
      return "Tu teléfono debe tener 8 números después del 9.";
    if (plantasSeleccionadas.length === 0)
      return "Selecciona al menos una planta del catálogo.";
    if (tipoEntrega === "delivery") {
      if (!sector) return "Elige el sector de entrega.";
      if (sector === "Otro sector" && !sectorOtro.trim())
        return "Escribe el nombre de tu sector.";
      if (!direccion.trim()) return "Necesitamos la dirección de entrega.";
      if (!diaEntrega) return "Elige el día de entrega.";
    }
    return null;
  };

  const agregarPlanta = (planta: CatalogPlant) => {
    setPlantasSeleccionadas((prev) => {
      const yaEsta = prev.find((p) => p.id === planta.id);
      if (yaEsta) {
        return prev.map((p) =>
          p.id === planta.id
            ? { ...p, quantity: Math.min(p.quantity + 1, planta.stock) }
            : p,
        );
      }
      return [...prev, { id: planta.id, nombre: planta.nombre, quantity: 1 }];
    });
  };

  const quitarUnaUnidad = (id: string) => {
    setPlantasSeleccionadas((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantity: p.quantity - 1 } : p))
        .filter((p) => p.quantity > 0),
    );
  };

  const quitarPlanta = (id: string) => {
    setPlantasSeleccionadas((prev) => prev.filter((p) => p.id !== id));
  };

  const cantidadDePlanta = (id: string) =>
    plantasSeleccionadas.find((p) => p.id === id)?.quantity ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setIsSaving(true);

    try {
      const ref = doc(collection(db, "Transacciones"));
      const data = {
        tipo: "pedido",
        status: "pending",
        customer_name: nombre.trim(),
        phone: telefonoCompleto,
        delivery_type: tipoEntrega,
        delivery_day: tipoEntrega === "delivery" ? diaEntrega : "",
        address: tipoEntrega === "delivery" ? direccion.trim() : "",
        sector: tipoEntrega === "delivery" ? sectorFinal : "",
        notes: notas.trim(),
        items: plantasSeleccionadas.map(({ id, nombre, quantity }) => ({
          product_id: id,
          nombre,
          quantity,
          unit_price: 0,
        })),
        total_amount: deliveryFee,
        delivery_fee: deliveryFee,
        created_at: new Date().toISOString(),
        source: "publico",
      };

      await setDoc(ref, data);

      const resumen = [
        `¡Hola Milokira! Acabo de hacer un pedido por la página.`,
        ``,
        `*Nombre:* ${nombre.trim()}`,
        `*Teléfono:* ${telefonoCompleto}`,
        `*Entrega:* ${tipoEntrega === "delivery" ? `Delivery (${diaEntrega})` : "Retiro"}`,
        tipoEntrega === "delivery" && sectorFinal
          ? `*Sector:* ${sectorFinal}`
          : null,
        tipoEntrega === "delivery" && deliveryFee > 0
          ? `*Costo delivery:* $${deliveryFee.toLocaleString("es-CL")}`
          : null,
        tipoEntrega === "delivery" ? `*Dirección:* ${direccion.trim()}` : null,
        ``,
        `*Plantas:*`,
        ...plantasSeleccionadas.map(
          (p) => `- ${p.nombre}${p.quantity > 1 ? ` ×${p.quantity}` : ""}`,
        ),
        notas.trim() ? `\n*Notas:* ${notas.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      setEnviado({ id: ref.id, resumen });
    } catch (err) {
      console.error(err);
      setError("Hubo un problema enviando el pedido. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (enviado) {
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(enviado.resumen)}`;
    return (
      <main className="min-h-screen bg-linear-to-br from-milokira-crema via-white to-milokira-lila/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border-2 border-milokira-verde/30 shadow-xl p-7 sm:p-9 text-center">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-milokira-verde/30 rounded-full blur-2xl" />
              <div className="relative h-16 w-16 rounded-2xl bg-linear-to-br from-emerald-400 to-milokira-verde flex items-center justify-center shadow-lg shadow-emerald-300">
                <CheckCircle size={32} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-black text-stone-800 mb-2 tracking-tight">
            ¡Pedido recibido!
          </h1>
          <p className="text-stone-600 text-sm mb-6 leading-relaxed">
            Lo guardamos en nuestro sistema. Te escribiremos por WhatsApp para
            confirmar precios, disponibilidad y total.
          </p>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-milokira-verde hover:bg-milokira-verde/90 text-white font-bold py-3.5 rounded-xl text-sm tracking-wide shadow-md transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <Send size={16} strokeWidth={2.5} />
            Adelantar pedido por WhatsApp
          </a>
          <p className="text-[11px] text-stone-400">
            (Opcional — para acelerar el contacto)
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-milokira-crema via-white to-milokira-lila/10 py-6 sm:py-10 px-4 pb-32 sm:pb-32">
      <div className="max-w-md mx-auto">
        {/* Header simple */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-linear-to-br from-milokira-lila to-milokira-verde shadow-lg shadow-milokira-lila/30 mb-3">
            <Leaf className="text-white" size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight">
            Hacer un pedido
          </h1>
          <p className="text-stone-500 text-sm mt-1 font-medium">
            Llena los datos y te confirmamos por WhatsApp 🌿
          </p>
        </div>

        {/* Form */}
        <form
          id="pedidoForm"
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6 space-y-4"
        >
          {/* Nombre */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
              Tu nombre <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: María González"
                className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-base sm:text-sm outline-none focus:bg-white focus:border-milokira-verde transition-colors placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
              Teléfono <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-stretch bg-stone-50 border border-stone-200 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-milokira-verde transition-colors">
              <div className="flex items-center gap-1.5 pl-3 pr-2 border-r border-stone-200 text-stone-500 text-sm font-bold">
                <Phone size={14} className="text-stone-400" />
                +56 9
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={8}
                value={telefono}
                onChange={(e) =>
                  setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="12345678"
                className="flex-1 px-3 py-3 bg-transparent text-stone-700 text-base sm:text-sm outline-none placeholder:text-stone-400"
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1 ml-1">
              Pon solo los 8 números después del 9 (ej: 12345678).
            </p>
          </div>

          {/* Plantas — selección visual */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
              ¿Qué plantas quieres? <span className="text-rose-500">*</span>
            </label>

            {/* Chips de plantas seleccionadas */}
            {plantasSeleccionadas.length > 0 && (
              <div className="mb-3 bg-milokira-verde/10 border border-milokira-verde/30 rounded-xl p-2.5">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-black text-milokira-verde uppercase tracking-wider">
                    Tu pedido ({totalPlantitas}{" "}
                    {totalPlantitas === 1 ? "planta" : "plantas"})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plantasSeleccionadas.map((p) => (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-1 bg-white border border-milokira-verde/40 rounded-full pl-2.5 pr-1 py-0.5 shadow-sm"
                    >
                      <span className="text-xs font-bold text-stone-700 max-w-32 truncate">
                        {p.nombre}
                      </span>
                      {p.quantity > 1 && (
                        <span className="text-[10px] font-black text-milokira-verde">
                          ×{p.quantity}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => quitarPlanta(p.id)}
                        className="ml-0.5 p-0.5 rounded-full text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        aria-label={`Quitar ${p.nombre}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buscador */}
            <div className="relative mb-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={buscadorPlanta}
                onChange={(e) => setBuscadorPlanta(e.target.value)}
                placeholder="Buscar planta por nombre"
                className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-base sm:text-sm outline-none focus:bg-white focus:border-milokira-verde transition-colors placeholder:text-stone-400"
              />
            </div>

            {/* Grilla visual */}
            {isLoadingCatalog ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-stone-100 animate-pulse rounded-xl aspect-square"
                  />
                ))}
              </div>
            ) : plantasDisponiblesFiltradas.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                No encontramos plantas con ese nombre en stock.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {plantasDisponiblesFiltradas.slice(0, visibleCount).map((planta) => {
                  const cantidad = cantidadDePlanta(planta.id);
                  const seleccionada = cantidad > 0;
                  const sinStock = cantidad >= planta.stock;
                  return (
                    <button
                      key={planta.id}
                      type="button"
                      onClick={() => !sinStock && agregarPlanta(planta)}
                      disabled={sinStock}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all text-left ${
                        seleccionada
                          ? "border-milokira-verde bg-milokira-verde/5 shadow-sm"
                          : "border-stone-200 bg-white hover:border-milokira-verde/40"
                      } ${sinStock ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    >
                      <div className="relative aspect-square bg-linear-to-br from-milokira-crema via-milokira-lila/10 to-milokira-verde/10 overflow-hidden">
                        {/* Placeholder shimmer: visible hasta que carga la imagen */}
                        <div
                          className="absolute inset-0 flex items-center justify-center text-2xl text-milokira-verde/30 animate-pulse"
                          aria-hidden="true"
                        >
                          🌿
                        </div>
                        {planta.imagenUrl ? (
                          <img
                            src={planta.imagenUrl}
                            alt={planta.nombre}
                            loading="lazy"
                            decoding="async"
                            style={{
                              objectPosition: planta.imagenPosition,
                              transformOrigin: planta.imagenPosition,
                              transform:
                                planta.imagenZoom && planta.imagenZoom > 1
                                  ? `scale(${planta.imagenZoom})`
                                  : undefined,
                            }}
                            onLoad={(e) => {
                              e.currentTarget.style.opacity = "1";
                            }}
                            className="relative w-full h-full object-cover opacity-0 transition-opacity duration-500"
                          />
                        ) : null}
                        {seleccionada && (
                          <div className="absolute top-1 right-1 z-10 bg-milokira-verde text-white text-[10px] font-black h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                            ×{cantidad}
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[11px] sm:text-xs font-bold text-stone-700 line-clamp-2 leading-tight">
                          {planta.nombre}
                        </p>
                        {seleccionada ? (
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                quitarUnaUnidad(planta.id);
                              }}
                              className="h-6 w-6 rounded-full bg-stone-100 text-stone-600 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors"
                              aria-label="Quitar uno"
                            >
                              <span className="text-sm font-black leading-none">
                                −
                              </span>
                            </button>
                            <span className="text-xs font-black text-milokira-verde">
                              {cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!sinStock) agregarPlanta(planta);
                              }}
                              disabled={sinStock}
                              className="h-6 w-6 rounded-full bg-milokira-verde text-white hover:bg-milokira-verde/90 disabled:opacity-40 flex items-center justify-center transition-colors"
                              aria-label="Agregar uno"
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-milokira-verde font-bold mt-0.5">
                            {sinStock ? "Sin stock" : "+ Agregar"}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Botón "Ver más" */}
            {!isLoadingCatalog &&
              plantasDisponiblesFiltradas.length > visibleCount && (
                <div className="mt-3 flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((c) =>
                        Math.min(
                          c + PAGE_SIZE,
                          plantasDisponiblesFiltradas.length,
                        ),
                      )
                    }
                    className="inline-flex items-center gap-1.5 bg-white border-2 border-milokira-verde/40 text-milokira-verde hover:bg-milokira-verde hover:text-white font-bold px-5 py-2.5 rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all text-xs uppercase tracking-wider"
                  >
                    Ver más plantitas
                    <Plus size={14} strokeWidth={3} />
                  </button>
                  <span className="text-[10px] text-stone-400 font-medium">
                    Mostrando {visibleCount} de{" "}
                    {plantasDisponiblesFiltradas.length}
                  </span>
                </div>
              )}

            <p className="text-[10px] text-stone-400 mt-2 ml-1">
              Toca cualquier planta para agregarla a tu pedido.
            </p>
          </div>

          {/* Tipo de entrega */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
              Entrega <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoEntrega("retiro")}
                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                  tipoEntrega === "retiro"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500"
                    : "bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                <Store size={14} />
                Retiro
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrega("delivery")}
                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                  tipoEntrega === "delivery"
                    ? "bg-milokira-lila/10 text-milokira-lila border-milokira-lila"
                    : "bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                <Truck size={14} />
                Delivery
              </button>
            </div>
          </div>

          {/* Día + Dirección si es delivery */}
          {tipoEntrega === "delivery" && (
            <>
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Día de entrega <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <select
                    value={diaEntrega}
                    onChange={(e) => setDiaEntrega(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-base sm:text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors"
                  >
                    <option value="">Elige un día...</option>
                    <option value="lunes">Lunes</option>
                    <option value="martes">Martes</option>
                    <option value="miercoles">Miércoles</option>
                    <option value="jueves">Jueves</option>
                    <option value="viernes">Viernes</option>
                    <option value="otro">Otro día (lo coordinamos)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Sector <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-base sm:text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors"
                >
                  <option value="">Elige tu sector...</option>
                  {SECTORES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value} {s.price > 0 ? `($${s.price.toLocaleString("es-CL")})` : "(se coordina)"}
                    </option>
                  ))}
                </select>
                {sector === "Otro sector" && (
                  <input
                    value={sectorOtro}
                    onChange={(e) => setSectorOtro(e.target.value)}
                    placeholder="Escribe el nombre de tu sector"
                    className="w-full mt-2 px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-base sm:text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors placeholder:text-stone-400"
                  />
                )}
                {sector && (
                  <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 font-medium">
                    {sector === "Otro sector"
                      ? "Precio del delivery se coordina según tu ubicación"
                      : `Delivery estimado: ${deliveryFeeDisplay}`}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Dirección <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-3 text-stone-400"
                  />
                  <textarea
                    rows={2}
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle y número"
                    className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-base sm:text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors placeholder:text-stone-400 resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Notas */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
              Notas (opcional)
            </label>
            <div className="relative">
              <StickyNote
                size={16}
                className="absolute left-3 top-3 text-stone-400"
              />
              <textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: para regalo, portón verde, no tocar timbre..."
                className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-base sm:text-sm outline-none focus:bg-white focus:border-milokira-verde transition-colors placeholder:text-stone-400 resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Submit invisible para que Enter dentro del form lo dispare */}
          <button type="submit" className="sr-only" tabIndex={-1}>
            Enviar pedido
          </button>
        </form>

        <p className="text-center text-[11px] text-stone-400 mt-4">
          Milokira · Talca, Chile 🌿
        </p>
      </div>

      {/* Sticky bar inferior: contador + CTA siempre visible */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-md mx-auto px-4 pt-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Tu pedido
            </p>
            <p className="text-sm font-black text-stone-800 truncate">
              {totalPlantitas === 0
                ? "Sin plantas aún"
                : `${totalPlantitas} ${totalPlantitas === 1 ? "plantita" : "plantitas"}`}
              {tipoEntrega === "delivery" && deliveryFee > 0 && (
                <span className="text-milokira-verde font-bold">
                  {" "}
                  + ${deliveryFee.toLocaleString("es-CL")}
                </span>
              )}
            </p>
          </div>
          <button
            type="submit"
            form="pedidoForm"
            disabled={isSaving || isLoadingCatalog || totalPlantitas === 0}
            className="shrink-0 bg-linear-to-r from-emerald-600 to-milokira-verde hover:from-emerald-500 hover:to-emerald-600 text-white font-black px-5 py-3 rounded-xl text-sm tracking-wide shadow-md shadow-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enviando…
              </>
            ) : isLoadingCatalog ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Cargando…
              </>
            ) : (
              <>
                <Send size={14} strokeWidth={2.5} />
                Enviar pedido
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
