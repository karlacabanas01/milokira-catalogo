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
  const [plantasList, setPlantasList] = useState<string[]>([""]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogoPlantas, setCatalogoPlantas] = useState<CatalogPlant[]>([]);
  const [buscadorPlanta, setBuscadorPlanta] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState<{ id: string; resumen: string } | null>(null);

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
  const plantasSeleccionadas = plantasList
    .map((id) => {
      const planta = catalogoPlantas.find((p) => p.id === id);
      return planta ? { id: planta.id, nombre: planta.nombre } : null;
    })
    .filter(Boolean) as { id: string; nombre: string }[];
  const plantasDisponiblesFiltradas = catalogoPlantas.filter((planta) =>
    planta.nombre.toLowerCase().includes(buscadorPlanta.toLowerCase())
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

  const updatePlanta = (idx: number, value: string) => {
    setPlantasList((prev) => prev.map((p, i) => (i === idx ? value : p)));
  };

  const addPlanta = () => {
    setPlantasList((prev) => [...prev, ""]);
  };

  const removePlanta = (idx: number) => {
    setPlantasList((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== idx);
    });
  };

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
        items: plantasSeleccionadas.map(({ id, nombre }) => ({
          product_id: id,
          nombre,
          quantity: 1,
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
        ...plantasSeleccionadas.map((p) => `- ${p.nombre}`),
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
    <main className="min-h-screen bg-linear-to-br from-milokira-crema via-white to-milokira-lila/10 py-6 sm:py-10 px-4">
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
                className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-verde transition-colors placeholder:text-stone-400"
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
                className="flex-1 px-3 py-3 bg-transparent text-stone-700 text-sm outline-none placeholder:text-stone-400"
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1 ml-1">
              Pon solo los 8 números después del 9 (ej: 12345678).
            </p>
          </div>

          {/* Plantas */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 mb-1.5 block">
              ¿Qué plantas quieres? <span className="text-rose-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={buscadorPlanta}
                onChange={(e) => setBuscadorPlanta(e.target.value)}
                placeholder="Buscar planta por nombre"
                className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-verde transition-colors placeholder:text-stone-400"
              />
            </div>
            <div className="space-y-2">
              {plantasList.map((plantaId, idx) => (
                <div key={idx} className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Leaf
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-milokira-verde"
                    />
                    <select
                      value={plantaId}
                      onChange={(e) => updatePlanta(idx, e.target.value)}
                      disabled={isLoadingCatalog}
                      className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-verde transition-colors disabled:opacity-50"
                    >
                      <option value="">
                        {isLoadingCatalog
                          ? "Cargando catálogo..."
                          : "Selecciona una planta del catálogo"}
                      </option>
                      {plantasDisponiblesFiltradas.map((planta) => (
                        <option key={planta.id} value={planta.id}>
                          {planta.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  {plantasList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePlanta(idx)}
                      className="shrink-0 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 transition-colors"
                      aria-label="Quitar planta"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {buscadorPlanta && plantasDisponiblesFiltradas.length === 0 && (
                <p className="text-[11px] text-stone-500 ml-1">
                  No encontramos plantas con ese nombre en stock.
                </p>
              )}
              <button
                type="button"
                onClick={addPlanta}
                disabled={isLoadingCatalog}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-milokira-verde/10 hover:bg-milokira-verde/20 text-milokira-verde border-2 border-dashed border-milokira-verde/40 hover:border-milokira-verde/70 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                <Plus size={14} strokeWidth={3} />
                Agregar otra planta
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5 ml-1">
              Solo se muestran plantas visibles en el catálogo público.
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
                    className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors"
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
                  className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors"
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
                    className="w-full mt-2 px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors placeholder:text-stone-400"
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
                    className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-lila transition-colors placeholder:text-stone-400 resize-none"
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
                className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-milokira-verde transition-colors placeholder:text-stone-400 resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving || isLoadingCatalog}
            className="w-full mt-2 bg-linear-to-r from-emerald-600 to-milokira-verde hover:from-emerald-500 hover:to-emerald-600 text-white font-black py-4 rounded-xl text-sm tracking-wide shadow-lg shadow-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando…
              </>
            ) : isLoadingCatalog ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Cargando catálogo…
              </>
            ) : (
              <>
                <Send size={16} strokeWidth={2.5} />
                Enviar pedido
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-stone-400 mt-4">
          Milokira · Talca, Chile 🌿
        </p>
      </div>
    </main>
  );
}
