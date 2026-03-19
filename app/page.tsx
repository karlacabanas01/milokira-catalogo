"use client";

import { useEffect, useState } from "react";
import PlantCard from "./components/plant-card";
import AgregarPlantaModal from "./components/agregar-planta-modal";

import Image from "next/image";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Link from "next/link";
import { Search } from "lucide-react";

interface Planta {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  categorias: string[];
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

  const plantasFiltradas = plantas.filter((planta) => {
    const coincideCategoria =
      categoriaActiva === "TODAS" ||
      planta.categorias?.some(c => c.toUpperCase() === categoriaActiva.toUpperCase());
    const coincideBusqueda =
      busqueda.trim() === "" ||
      planta.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });

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
    <main className="min-h-screen bg-milokira-crema patron-muro px-4 py-8 sm:px-8 font-sans overflow-x-hidden">
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

      <div className="fixed bottom-4 right-4 z-100"></div>
      <div className="flex justify-center items-center flex-col mb-8 mt-4">
        <div
          onClick={handleLogoClick}
          className="bg-milokira-crema/90 backdrop-blur-sm p-5 rounded-[30px] shadow-lg shadow-milokira-lila/20 border border-white/50 transition-transform hover:scale-105 duration-500 cursor-pointer select-none"
        >
          <Image
            src="/img/logo.png"
            alt="Logo Milokira Plantitas"
            width={220}
            height={90}
            className="object-contain"
            style={{ height: "auto" }}
            priority
          />
        </div>

        {isAdmin && (
          <div className="mt-6 animate-fade-in">
            <Link href="/admin">
              <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-full flex items-center justify-center shadow-md hover:scale-105 hover:bg-indigo-700 transition-all duration-300 font-bold tracking-wide gap-2 border-2 border-indigo-400/50">
                <span className="text-lg">📊</span>
                <span>Ir al Panel de Control</span>
              </button>
            </Link>
          </div>
        )}

        <h2 className="text-center text-milokira-verde font-black mt-6 tracking-[5px] uppercase text-2xl sm:text-3xl md:text-4xl drop-shadow-md">
          Catálogo de Plantas
        </h2>
        <p className="text-center text-gray-600 font-medium mt-4 max-w-xl mx-auto text-sm sm:text-base leading-relaxed px-4 drop-shadow-sm">
          Un proyecto nacido del amor por las plantas y la inspiración de
          nuestros tres peludos: Milo, Loki y Kira 🐾.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-8 mb-6 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="relative w-full group">
          <div className="absolute inset-0 bg-milokira-lila/20 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-milokira-verde/60 group-focus-within:text-milokira-verde transition-colors duration-300" size={18} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar plantita..."
            className="relative w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-sm border-2 border-milokira-verde/20 rounded-full text-sm text-gray-700 font-medium placeholder:text-milokira-verde/40 placeholder:font-normal focus:outline-none focus:border-milokira-verde/50 focus:bg-white/90 shadow-sm hover:shadow-md hover:border-milokira-verde/30 transition-all duration-300"
          />
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

      <footer className="mt-20 mb-4 w-full max-w-5xl mx-auto">
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-sm border border-milokira-lila/30 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:shadow-md hover:border-milokira-lila/50 duration-500">
          <div className="text-center md:text-left space-y-3 text-sm text-gray-600 font-medium">
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
          </div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right border-t md:border-t-0 md:border-l border-milokira-lila/30 pt-6 md:pt-0 md:pl-8">
            <p className="text-gray-800 font-black tracking-widest uppercase text-lg mb-1">
              Milokira
            </p>
            <p className="text-xs text-gray-500 mb-4">Cultivado con amor 🌿</p>

            <div className="bg-milokira-crema px-4 py-2 rounded-full border border-milokira-verde/20">
              <p className="text-xs text-gray-500 font-medium">
                Página creada por{" "}
                <a
                  href="https://github.com/karlacabanas01"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-milokira-verde font-bold hover:text-milokira-lila transition-colors duration-300"
                >
                  karcabcas
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
