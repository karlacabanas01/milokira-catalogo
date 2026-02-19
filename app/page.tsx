"use client";

import { useState } from "react";
import { catalogoMilokira } from "./data/inventario";
import PlantCard from "./components/plant-card";
import Image from "next/image";

export default function Home() {
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");
  const categorias = ["Todas", "Cactus", "Suculentas", "Interior"];

  const plantasFiltradas = catalogoMilokira.filter((planta) => {
    if (categoriaActiva === "Todas") return true;
    return planta.categoria === categoriaActiva;
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
    </main>
  );
}
