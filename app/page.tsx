"use client";

import { useEffect, useState } from "react";
import PlantCard from "./components/plant-card";
import AgregarPlantaModal from "./components/agregar-planta-modal";

import Image from "next/image";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Link from "next/link";
import { Search, X, Truck, Droplet, Info } from "lucide-react";
import { MdOutlinePets } from "react-icons/md";
import { CartProvider } from "./context/CartContext";
import CartDrawer from "./components/cart-drawer";
import PlantChat from "./components/plant-chat";

interface Planta {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  imagenPosition?: string;
  categorias: string[];
  stock?: number;
  dificultad?: "facil" | "media" | "dificil";
  aptaMascotas?: "apta" | "moderada" | "toxica" | "sin-info";
  precio: {
    valor: number;
    tipo: string;
    disponible: boolean;
  };
}

export default function Home() {
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Plantas"),
      (snapshot) => {
        const listaFirebase = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Planta,
        );

        setPlantas(listaFirebase);
        setIsLoadingData(false);
      },
      (error) => {
        console.error("Error en Firebase: ", error);
        setIsLoadingData(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const categorias = [
    "TODAS",
    "CACTUS",
    "SUCULENTAS",
    "INTERIOR",
    "EXTERIOR",
    "COLECCION",
    "IMPLEMENTOS",
  ];

  const CATEGORIA_EMOJI: Record<string, string> = {
    TODAS: "✨",
    CACTUS: "🌵",
    SUCULENTAS: "🌱",
    INTERIOR: "🪴",
    EXTERIOR: "☀️",
    COLECCION: "💎",
    IMPLEMENTOS: "🪢",
  };

  const plantasFiltradas = plantas
    .filter((planta) => {
      const estaDisponible =
        planta.precio?.disponible !== false && (planta.stock ?? 1) > 0;
      const coincideCategoria =
        categoriaActiva === "TODAS" ||
        planta.categorias?.some(
          (c) => c.toUpperCase() === categoriaActiva.toUpperCase(),
        );
      const coincideBusqueda =
        busqueda.trim() === "" ||
        planta.nombre.toLowerCase().includes(busqueda.toLowerCase());
      // En modo admin se ven todas (incluso las agotadas); en público solo las disponibles.
      const visiblePorEstado = isAdmin || estaDisponible;
      return visiblePorEstado && coincideCategoria && coincideBusqueda;
    })
    .sort((a, b) =>
      a.nombre
        .trim()
        .slice(0, 3)
        .localeCompare(b.nombre.trim().slice(0, 3), "es", {
          sensitivity: "base",
        }),
    );

  const [plantaAEditar, setPlantaAEditar] = useState<Planta | null>(null);

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border-2 border-transparent relative flex flex-col">
      <div className="w-full aspect-[4/5] bg-gray-200 animate-pulse shrink-0"></div>
      <div className="p-3 sm:p-5 flex flex-col flex-grow justify-between">
        <div>
          <div className="h-6 bg-gray-200 rounded animate-pulse mb-3 w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-full"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-6 w-2/3"></div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4"></div>
        </div>
      </div>
    </div>
  );

  // SEGURIDAD
  const [logoClicks, setLogoClicks] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // FUNCIÓN SECRETA PARA ACTIVAR EL MODO ADMIN
  const handleLogoClick = () => {
    const nuevosClics = logoClicks + 1;
    setLogoClicks(nuevosClics);

    // Si haces 5 clics seguidos en el logo...
    if (nuevosClics === 5) {
      const password = prompt("🔒 Ingresa la clave secreta de Milokira:");

      if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        setIsAdmin(true);
        alert("¡Modo Administrador Activado! Ya puedes agregar plantas. 🌿");
      } else {
        alert("Clave incorrecta. Intento bloqueado.");
      }

      setLogoClicks(0);
    }
  };

  return (
    <CartProvider>
    <main
      className="min-h-screen bg-milokira-crema patron-muro px-2 pb-8 overflow-x-hidden"
      style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}
    >
      {isAdmin && (
        <button
          onClick={() => {
            setPlantaAEditar(null);
            setIsModalOpen(true);
          }}
          className="fixed bottom-6 right-6 z-50 bg-milokira-verde text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-green-700 transition-all duration-300 text-2xl pb-1"
          title="Agregar nueva planta"
        >
          +
        </button>
      )}

      <AgregarPlantaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPlantaAEditar(null);
        }}
        plantaAEditar={plantaAEditar}
      />

      {/* Barra superior: logo + redes sociales (encima del banner) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleLogoClick}
          aria-label="Logo Milokira"
          className="cursor-pointer select-none shrink-0 hover:scale-105 transition-transform duration-300"
        >
          <Image
            src="/img/logo.png"
            alt="Logo Milokira Plantitas"
            width={100}
            height={40}
            className="object-contain w-[90px] sm:w-[140px]"
            style={{ height: "auto" }}
            priority
          />
        </button>

        <div className="flex items-center gap-1 sm:gap-3">
          {isAdmin && (
            <Link href="/admin/pedidos">
              <button className="bg-amber-500 text-white p-1.5 sm:px-4 sm:py-2 rounded-full flex items-center justify-center shadow-md hover:scale-105 hover:bg-amber-400 transition-all duration-300 font-bold gap-1.5 text-xs sm:text-sm">
                <Truck size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Pedidos</span>
              </button>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin">
              <button className="bg-milokira-verde text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center justify-center shadow-md hover:scale-105 hover:bg-milokira-verde/90 transition-all duration-300 font-bold text-[11px] sm:text-sm">
                <span>Admin</span>
              </button>
            </Link>
          )}

          <a
            href="https://wa.me/56994955949"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 rounded-full hover:bg-milokira-lila/40 hover:scale-110 transition-all duration-300"
            title="WhatsApp"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] sm:w-6 sm:h-6 text-milokira-verde">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@milokira.plantas"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 rounded-full hover:bg-milokira-lila/40 hover:scale-110 transition-all duration-300"
            title="TikTok"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] sm:w-6 sm:h-6 text-milokira-verde">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17v-3.48a4.85 4.85 0 01-3.77-1.23V6.69h3.77z" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/milokira.plantitas/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 rounded-full hover:bg-milokira-lila/40 hover:scale-110 transition-all duration-300"
            title="Instagram"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] sm:w-6 sm:h-6 text-milokira-verde">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
      </div>

      {/* Banner ilustrado */}
      <section className="relative max-w-7xl mx-auto mt-2 sm:mt-3 mb-8 sm:mb-10 px-2 sm:px-4">
        <div className="relative w-full sm:aspect-[5/2] sm:max-h-[540px] overflow-hidden sm:rounded-[40px] sm:shadow-xl sm:shadow-milokira-verde/10 sm:border sm:border-white/60">
          <Image
            src="/img/header.jpg"
            alt="Hojas y plantas ilustradas"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1280px"
            className="hidden sm:block object-cover opacity-80"
          />

          {/* Contenido central del banner */}
          <div className="sm:absolute sm:inset-0 flex items-center justify-center py-6 sm:py-0">
            <div className="text-center px-6">
              <h1 className="text-5xl sm:text-5xl md:text-6xl font-black tracking-tight text-stone-800 leading-[1.05] drop-shadow-sm">
                <span className="block">Catálogo de</span>
                <span className="relative inline-block mt-1 sm:mt-2">
                  <span className="relative z-10 text-milokira-verde">plantas</span>
                  <span className="absolute inset-x-0 bottom-1 sm:bottom-2 h-3 sm:h-4 bg-milokira-lila/60 -z-0 rounded-full" />
                </span>
              </h1>
              <p className="mt-2 sm:mt-3 text-stone-600 text-[11px] sm:text-sm md:text-base font-medium italic max-w-[280px] sm:max-w-md mx-auto leading-snug">
                Un proyecto nacido del amor por las plantas y la inspiración de
                nuestros tres peludos: Milo, Loki y Kira 🐾
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Botón de guía (solo mobile) */}
      <div className="max-w-3xl mx-auto mb-4 px-4 sm:hidden">
        <button
          type="button"
          onClick={() => setIsGuideOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-white/70 backdrop-blur-sm border border-stone-200 rounded-2xl px-4 py-2.5 shadow-sm text-stone-600 text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all"
        >
          <Info size={14} className="text-milokira-verde" />
          Guía de iconos
        </button>
      </div>

      {/* Leyenda de iconos — solo desktop */}
      <div className="max-w-3xl mx-auto mb-5 sm:mb-7 px-4 hidden sm:block">
        <div className="bg-white/70 backdrop-blur-sm border border-stone-200 rounded-2xl px-4 py-3 shadow-sm space-y-3">
          <p className="text-[10px] sm:text-[11px] font-bold text-stone-500 uppercase tracking-wider text-center">
            Guía de iconos
          </p>

          {/* Dificultad */}
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-stone-600 mb-1.5 text-center sm:text-left">
              💧 Dificultad de cuidado
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-600">
                  <Droplet size={11} strokeWidth={2.5} className="fill-current" />
                </span>
                <span className="font-medium">Fácil</span>
                <span className="text-stone-400">— resistente</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                  <Droplet size={11} strokeWidth={2.5} className="fill-current" />
                  <Droplet size={11} strokeWidth={2.5} className="fill-current" />
                </span>
                <span className="font-medium">Media</span>
                <span className="text-stone-400">— riego regular</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                  <Droplet size={11} strokeWidth={2.5} className="fill-current" />
                  <Droplet size={11} strokeWidth={2.5} className="fill-current" />
                  <Droplet size={11} strokeWidth={2.5} className="fill-current" />
                </span>
                <span className="font-medium">Difícil</span>
                <span className="text-stone-400">— necesita cuidados</span>
              </span>
            </div>
          </div>

          {/* Mascotas */}
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-stone-600 mb-1.5 text-center sm:text-left">
              🐾 Compatibilidad con mascotas
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <MdOutlinePets size={13} />
                </span>
                <span className="font-medium">Apta</span>
                <span className="text-stone-400">— segura</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                  <MdOutlinePets size={13} />
                </span>
                <span className="font-medium">Riesgo</span>
                <span className="text-stone-400">— irritación leve</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                  <MdOutlinePets size={13} />
                </span>
                <span className="font-medium">Tóxica</span>
                <span className="text-stone-400">— mantener lejos</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10 sm:mb-14 max-w-6xl mx-auto flex sm:flex-wrap sm:justify-center gap-2.5 sm:gap-3 px-4 sm:px-8 py-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {categorias.map((categoria) => {
          const activa = categoriaActiva === categoria;
          const emoji = CATEGORIA_EMOJI[categoria] || "✨";
          const label =
            categoria === "TODAS"
              ? "Todas"
              : categoria === "COLECCION"
                ? "Colección"
                : categoria.charAt(0) + categoria.slice(1).toLowerCase();
          return (
            <button
              key={categoria}
              onClick={() => setCategoriaActiva(categoria)}
              className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
                activa
                  ? "bg-milokira-verde text-white shadow-lg shadow-milokira-verde/40 border-2 border-milokira-verde"
                  : "bg-white text-stone-600 border-2 border-stone-200 hover:border-milokira-verde/40 hover:text-milokira-verde"
              }`}
            >
              <span className="text-sm">{emoji}</span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="max-w-xl mx-auto mt-2 mb-8 sm:mb-10 px-4 sm:px-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-milokira-lila/20 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-milokira-verde/60 group-focus-within:text-milokira-verde transition-colors duration-300 z-10"
            size={18}
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca tu plantita 🔎"
            className="relative w-full pl-11 pr-10 py-3.5 bg-white/80 backdrop-blur-sm border-2 border-milokira-verde/20 rounded-full text-sm text-gray-700 font-medium placeholder:text-milokira-verde/40 placeholder:font-normal focus:outline-none focus:border-milokira-verde/50 focus:bg-white shadow-sm hover:shadow-md hover:border-milokira-verde/30 transition-all duration-300"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-milokira-verde transition-colors z-10"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* CTA "¿Dudas con tu planta?" — temporalmente oculto
      <div className="max-w-6xl mx-auto mb-6 sm:mb-8 px-1 sm:px-0">
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="group relative w-full overflow-hidden bg-linear-to-r from-milokira-lila/10 via-white to-milokira-verde/10 border-2 border-milokira-lila/20 hover:border-milokira-lila/50 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-3 sm:gap-4 text-left shadow-sm hover:shadow-lg hover:shadow-milokira-lila/20 transition-all duration-300 active:scale-[0.99]"
        >
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-milokira-lila/30 rounded-2xl blur-xl group-hover:bg-milokira-lila/50 transition-colors" />
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-linear-to-br from-milokira-lila to-milokira-verde flex items-center justify-center shadow-md">
              <Leaf className="text-white" size={20} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-black text-stone-800 text-sm sm:text-base tracking-tight">
                ¿Dudas con tu planta?
              </h3>
              <span className="bg-milokira-verde text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                IA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 font-medium line-clamp-2">
              Pregúntale a Kira 🐶 — manda una foto o describe qué le pasa.
            </p>
          </div>

          <div className="shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-milokira-lila text-white text-xs font-bold shadow-md group-hover:bg-milokira-verde transition-colors">
            <Sparkles size={14} strokeWidth={2.5} />
            Preguntar
          </div>
        </button>
      </div>
      */}

      <div id="catalogo" className={`scroll-mt-24 grid ${categoriaActiva === "IMPLEMENTOS" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-3"} gap-3 sm:gap-8 max-w-6xl mx-auto`}>
        {isLoadingData &&
          Array(6)
            .fill(0)
            .map((_, index) => <SkeletonCard key={`skeleton-${index}`} />)}

        {!isLoadingData &&
          plantasFiltradas.length > 0 &&
          plantasFiltradas.map((planta) => (
            // 3. NUEVO: Le pasamos isAdmin y la función onEdit a la tarjeta
            <PlantCard
              key={planta.id}
              planta={planta}
              isAdmin={isAdmin}
              onEdit={() => {
                setPlantaAEditar(planta);
                setIsModalOpen(true);
              }}
            />
          ))}
      </div>

      <footer className="mt-20 bg-white/80 backdrop-blur-md border-t-2 border-milokira-lila/30 -mx-2 px-2 rounded-t-[40px]">
        <div className="max-w-6xl mx-auto py-8 sm:py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Info de envíos */}
            <div className="text-left space-y-3 text-sm text-gray-600 font-medium flex-1 w-full">
              <h3 className="text-milokira-verde font-black text-lg sm:text-xl mb-4 tracking-tight text-center md:text-left">
                Envíos y entregas 🌿
              </h3>

              <p className="flex items-start gap-2.5">
                <span className="text-lg leading-tight shrink-0">📍</span>
                <span className="leading-relaxed">Ubicados en Talca, sector Bicentenario.</span>
              </p>

              <p className="flex items-start gap-2.5">
                <span className="text-lg leading-tight shrink-0">🛵</span>
                <span className="leading-relaxed">
                  Delivery <strong className="text-milokira-verde">GRATIS</strong>{" "}
                  en Bicentenario sobre $10.000 (valor adicional a otras zonas).
                </span>
              </p>

              <p className="flex items-start gap-2.5">
                <span className="text-lg leading-tight shrink-0">📦</span>
                <span className="leading-relaxed">Envíos a regiones por pagar.</span>
              </p>

              {/* Redes sociales */}
              <div className="flex items-center justify-center md:justify-start gap-2 pt-3">
                <a
                  href="https://wa.me/56994955949"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-milokira-verde/10 hover:bg-milokira-verde/20 transition-colors duration-300"
                  title="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-milokira-verde">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@milokira.plantas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-milokira-verde/10 hover:bg-milokira-verde/20 transition-colors duration-300"
                  title="TikTok"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-milokira-verde">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17v-3.48a4.85 4.85 0 01-3.77-1.23V6.69h3.77z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/milokira.plantitas/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-milokira-verde/10 hover:bg-milokira-verde/20 transition-colors duration-300"
                  title="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-milokira-verde">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Mapa a la derecha */}
            <a
              href="https://maps.app.goo.gl/5t2bx7ibwKcC3KFq9"
              target="_blank"
              rel="noopener noreferrer"
              className="relative group w-full md:w-64 h-48 rounded-2xl overflow-hidden border border-milokira-verde/20 shadow-sm shrink-0"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3251.952879643688!2d-71.61052662333056!3d-35.40641850033452!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9665c7935b087329%3A0xfa9cc1215a43c887!2smilokira-plantas!5e0!3m2!1ses-419!2scl!4v1774831833603!5m2!1ses-419!2scl"
                className="w-full h-full pointer-events-none"
                loading="lazy"
                title="Ubicación Milokira"
              />
              <div className="absolute inset-0 bg-milokira-verde/0 group-hover:bg-milokira-verde/10 transition-colors duration-300 flex items-end justify-center pb-3">
                <span className="bg-white/90 backdrop-blur-sm text-milokira-verde text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Abrir en Google Maps
                </span>
              </div>
            </a>
          </div>

          {/* Línea divisora y créditos */}
          <div className="border-t border-milokira-lila/20 mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-800 font-black tracking-widest uppercase text-sm">
              Milokira <span className="text-gray-400 font-normal text-xs">· Cultivado con amor 🌿</span>
            </p>
            <p className="text-xs text-gray-500 font-medium">
              Página creada por{" "}
              <a
                href="https://my-portfolio-three-eta-88.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-milokira-verde font-bold hover:text-milokira-lila transition-colors duration-300"
              >
                karcabcas
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de guía de iconos (mobile) */}
      {isGuideOpen && (
        <button
          type="button"
          onClick={() => setIsGuideOpen(false)}
          aria-label="Cerrar guía"
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto text-left"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black text-stone-800 text-lg tracking-tight">
                Guía de iconos
              </h2>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-stone-600 mb-2">
                💧 Dificultad de cuidado
              </p>
              <div className="space-y-2 text-sm text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-600">
                    <Droplet size={12} strokeWidth={2.5} className="fill-current" />
                  </span>
                  <span className="font-medium">Fácil</span>
                  <span className="text-stone-400">— resistente</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                    <Droplet size={12} strokeWidth={2.5} className="fill-current" />
                    <Droplet size={12} strokeWidth={2.5} className="fill-current" />
                  </span>
                  <span className="font-medium">Media</span>
                  <span className="text-stone-400">— riego regular</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                    <Droplet size={12} strokeWidth={2.5} className="fill-current" />
                    <Droplet size={12} strokeWidth={2.5} className="fill-current" />
                    <Droplet size={12} strokeWidth={2.5} className="fill-current" />
                  </span>
                  <span className="font-medium">Difícil</span>
                  <span className="text-stone-400">— necesita cuidados</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-stone-600 mb-2">
                🐾 Compatibilidad con mascotas
              </p>
              <div className="space-y-2 text-sm text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                    <MdOutlinePets size={14} />
                  </span>
                  <span className="font-medium">Apta</span>
                  <span className="text-stone-400">— segura</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                    <MdOutlinePets size={14} />
                  </span>
                  <span className="font-medium">Riesgo</span>
                  <span className="text-stone-400">— irritación leve</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                    <MdOutlinePets size={14} />
                  </span>
                  <span className="font-medium">Tóxica</span>
                  <span className="text-stone-400">— mantener lejos</span>
                </div>
              </div>
            </div>
          </div>
        </button>
      )}
    </main>
    <CartDrawer />
    <PlantChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </CartProvider>
  );
}
