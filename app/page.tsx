"use client";

import { useState } from "react";
import { plantasMilokira } from "./data/inventario";
import PlantCard from "./components/plant-card";
import Image from "next/image";

export default function Home() {
  const [categoriaActiva, setCategoriaActiva] = useState("TODAS");
  const categorias = [
    "TODAS",
    "CACTUS",
    "SUCULENTAS",
    "JARDINES",
    "INTERIOR",
    "EXTERIOR",
  ];

  const plantasFiltradas = plantasMilokira.filter((planta) => {
    if (categoriaActiva === "TODAS") return true;

    return planta.categoria.toUpperCase() === categoriaActiva.toUpperCase();
  });

  return (
    <main className="min-h-screen bg-milokira-crema patron-muro p-8 font-sans">
      <div className="flex justify-center items-center flex-col mb-8 mt-4">
        <div className="bg-milokira-crema/90 backdrop-blur-sm p-5 rounded-[30px] shadow-lg shadow-milokira-lila/20 border border-white/50 transition-transform hover:scale-105 duration-500">
          <Image
            src="/img/logo.png"
            alt="Logo Milokira Plantitas"
            width={220}
            height={90}
            className="object-contain"
            priority
          />
        </div>

        <h2 className="text-center text-milokira-verde font-black mt-6 tracking-[5px] uppercase text-2xl sm:text-3xl md:text-4xl drop-shadow-md">
          Catálogo de Plantas
        </h2>
        <p className="text-center text-gray-600 font-medium mt-4 max-w-xl mx-auto text-sm sm:text-base leading-relaxed px-4 drop-shadow-sm">
          Un proyecto nacido del amor por las plantas y la inspiración de
          nuestros tres peludos: Milo, Loki y Kira 🐾.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-16 mt-8">
        {categorias.map((categoria) => (
          <button
            key={categoria}
            onClick={() => setCategoriaActiva(categoria)}
            className={`
              /* ESTILOS BASE MÁS PEQUEÑOS */
              relative z-10 overflow-hidden px-4 py-2 rounded-md font-bold uppercase tracking-[2px] text-xs sm:text-sm cursor-pointer outline outline-[1.5px] outline-milokira-verde transition-all duration-1000 bg-transparent
              
              /* ESTILOS HOVER GENERALES (Escala más suave) */
              hover:text-white hover:scale-105 hover:shadow-md hover:shadow-milokira-verde/40
              
              /* ESTILOS DEL PSEUDO-ELEMENTO */
              before:content-[''] before:absolute before:-left-[50px] before:top-0 before:h-full before:bg-milokira-verde before:skew-x-[45deg] before:-z-10 before:transition-[width] before:duration-1000
              
              /* LÓGICA DE ESTADO */
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
        {plantasFiltradas.length > 0 ? (
          plantasFiltradas.map((planta) => (
            <PlantCard key={planta.id} planta={planta} />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500 py-10">
            No hay plantitas en esta categoría por ahora. 🌵
          </p>
        )}
      </div>
      {/* FOOTER DE INFORMACIÓN Y LOGÍSTICA */}
      <footer className="mt-20 mb-4 w-full max-w-5xl mx-auto">
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-sm border border-milokira-lila/30 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:shadow-md hover:border-milokira-lila/50 duration-500">
          {/* Columna Izquierda: Logística */}
          <div className="text-center md:text-left space-y-3 text-sm text-gray-600 font-medium">
            <h3 className="text-milokira-verde font-bold text-base mb-4 uppercase tracking-[2px]">
              Envíos y Entregas
            </h3>

            <p className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-lg">📍</span>
              Ubicados en Talca, sector Bicentenario.
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
              Envíos a regiones por pagar.
            </p>
          </div>

          {/* Columna Derecha: Créditos y Marca */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right border-t md:border-t-0 md:border-l border-milokira-lila/30 pt-6 md:pt-0 md:pl-8">
            <p className="text-gray-800 font-black tracking-widest uppercase text-lg mb-1">
              Milokira
            </p>
            <p className="text-xs text-gray-500 mb-4">Cultivado con amor 🌿</p>

            {/* Tu firma de desarrolladora */}
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
