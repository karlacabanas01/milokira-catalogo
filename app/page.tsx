"use client";

import { useEffect, useState } from "react";
import PlantCard from "./components/plant-card";
import AgregarPlantaModal from "./components/agregar-planta-modal";

import Image from "next/image";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Link from "next/link";
import { Search, X } from "lucide-react";

interface Planta {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  categorias: string[];
  stock?: number;
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
  const [tituloVisible, setTituloVisible] = useState("");

  useEffect(() => {
    const texto = "Catálogo de Plantas";
    let i = 0;
    const interval = setInterval(() => {
      setTituloVisible(texto.slice(0, i + 1));
      i++;
      if (i >= texto.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

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
    "JARDINES",
    "INTERIOR",
    "EXTERIOR",
    "COLECCION",
  ];

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
      return estaDisponible && coincideCategoria && coincideBusqueda;
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
    <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[420px] border-2 border-transparent relative flex flex-col">
      <div className="h-64 bg-gray-200 animate-pulse shrink-0"></div>
      <div className="p-5 flex flex-col flex-grow justify-between">
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

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
    <main className="min-h-screen bg-milokira-crema patron-muro px-2 pb-8 font-sans overflow-x-hidden">
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

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-milokira-crema/80 backdrop-blur-xl border-b border-milokira-verde/10 shadow-sm shadow-milokira-lila/10 px-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between py-3 sm:py-4">
          <div
            onClick={handleLogoClick}
            className="cursor-pointer select-none shrink-0 hover:scale-105 transition-transform duration-300"
          >
            <Image
              src="/img/logo.png"
              alt="Logo Milokira Plantitas"
              width={120}
              height={48}
              className="object-contain sm:w-[140px]"
              style={{ height: "auto" }}
              priority
            />
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin">
                <button className="bg-milokira-verde text-white px-4 py-2 rounded-full flex items-center justify-center shadow-md hover:scale-105 hover:bg-milokira-verde/90 transition-all duration-300 font-bold tracking-wide gap-2 text-xs sm:text-sm">
                  <span>Panel Admin</span>
                </button>
              </Link>
            )}

            <a
              href="https://wa.me/56994955949"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-milokira-lila/40 transition-colors duration-300"
              title="WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-milokira-verde">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@milokira.plantas"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-milokira-lila/40 transition-colors duration-300"
              title="TikTok"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-milokira-verde">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17v-3.48a4.85 4.85 0 01-3.77-1.23V6.69h3.77z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/milokira.plantitas/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-milokira-lila/40 transition-colors duration-300"
              title="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 text-milokira-verde">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Spacer para el navbar fijo */}
      <div className="h-14 sm:h-16" />

      {/* Hero */}
      <div className="text-center mb-8 mt-10 sm:mt-14 px-4">
        <div className="inline-block relative">
          <div className="absolute -top-3 -left-3 text-milokira-verde/20 text-5xl sm:text-6xl select-none pointer-events-none">
            &#x1F33F;
          </div>
          <div className="absolute -bottom-2 -right-3 text-milokira-verde/15 text-4xl sm:text-5xl select-none pointer-events-none rotate-45">
            &#x1F33F;
          </div>
          <div className="bg-white/50 backdrop-blur-sm border border-milokira-verde/15 rounded-3xl px-8 sm:px-12 py-6 sm:py-8 shadow-lg shadow-milokira-lila/10">
            <p className="text-milokira-verde/50 text-[10px] sm:text-xs font-bold uppercase tracking-[4px] mb-2">
              Milokira Plantitas
            </p>
            <h2 className="text-milokira-verde font-black tracking-[3px] sm:tracking-[5px] uppercase text-2xl sm:text-3xl md:text-4xl leading-tight">
              {tituloVisible}
              <span className="inline-block w-[2px] h-[1em] bg-milokira-verde/60 align-middle ml-0.5 animate-pulse" />
            </h2>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="w-8 sm:w-12 h-px bg-milokira-verde/30" />
              <span className="text-milokira-verde/40 text-lg">&#x1F331;</span>
              <div className="w-8 sm:w-12 h-px bg-milokira-verde/30" />
            </div>
          </div>
        </div>
        <p className="mt-5 max-w-sm mx-auto text-gray-400 italic text-sm sm:text-base leading-relaxed">
          &ldquo;Un proyecto nacido del amor por las plantas y la inspiración de
          nuestros tres peludos: Milo, Loki y Kira&rdquo; 🐾
        </p>
      </div>

      <div className="max-w-xl mx-auto mt-8 mb-6 px-4 sm:px-8">
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
            placeholder="Buscar plantita..."
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

      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-16 px-4 sm:px-8 max-w-6xl mx-auto">
        {categorias.map((categoria) => (
          <button
            key={categoria}
            onClick={() => setCategoriaActiva(categoria)}
            className={`
              relative z-10 overflow-hidden px-4 py-2 rounded-md font-bold uppercase tracking-[2px] text-xs sm:text-sm cursor-pointer outline-[1.5px] outline-milokira-verde transition-all duration-1000 bg-transparent
              hover:text-white hover:scale-105 hover:shadow-md hover:shadow-milokira-verde/40
              before:content-[''] before:absolute before:-left-12.5 before:top-0 before:h-full before:bg-milokira-verde before:skew-x-45 before:-z-10 before:transition-[width] before:duration-1000
              ${
                categoriaActiva === categoria
                  ? "text-white scale-105 shadow-md shadow-milokira-verde/40 before:w-[250%] outline-milokira-verde"
                  : "text-milokira-verde before:w-0 hover:before:w-[250%] outline-milokira-verde"
              }
            `}
          >
            {categoria}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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

      <footer className="mt-20 bg-white/70 backdrop-blur-md border-t border-milokira-lila/30 -mx-2 px-2">
        <div className="max-w-6xl mx-auto py-8 sm:py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Info de envíos */}
            <div className="text-center md:text-left space-y-3 text-sm text-gray-600 font-medium flex-1">
              <h3 className="text-milokira-verde font-bold text-base mb-4 uppercase tracking-[2px]">
                Envíos y Entregas
              </h3>

              <p className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-lg">📍</span>
                <span>Ubicados en Talca, sector Bicentenario.</span>
              </p>

              <p className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-lg">🛵</span>
                <span>
                  Delivery <strong className="text-milokira-verde">GRATIS</strong>{" "}
                  en el sector (valor adicional a otras zonas).
                </span>
              </p>

              <p className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-lg">📦</span>
                <span>Envíos a regiones por pagar.</span>
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
    </main>
  );
}
