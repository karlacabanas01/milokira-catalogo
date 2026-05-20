import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

/**
 * Clasificación de aptitud para mascotas basada en literatura general
 * (ASPCA y similares). Es una aproximación: el cliente final debe
 * consultar veterinario en casos reales.
 *
 * Coincidimos por palabras clave en el nombre (case insensitive),
 * priorizando matches más específicos sobre genéricos.
 */

const APTAS = [
  "aspidistra",
  "calatea",
  "calathea",
  "maranta",
  "ctenante",
  "ctenanthe",
  "peperomia",
  "cucharita",
  "haworthia",
  "gasteria",
  "ceropegia",
  "cactus cola",
  "helecho",
  "santa teresita",
];

const MODERADAS = [
  "cinta",
  "malamadre",
  "hierba puntera",
  "gynura",
  "coleo",
  "senecio",
  "rosario",
  "tradenscantia",
  "tradescantia",
  "sansev",
  "sanseviera",
  "sansevieria",
  "pothos",
  "pothus",
  "siempreviva",
  "paraguayo",
];

const TOXICAS = [
  "monstera",
  "singonio",
  "philodendron",
  "ph. cordatum",
  "ph cordatum",
  "cordatum",
  "anthurium",
  "aro italiano",
  "cuna de moises",
  "begonia",
  "dracaena",
  "ficus",
  "geranio",
  "lirio",
  "poinsettia",
  "raphidophora",
  "strobilante",
  "chiflera",
  "mimosa",
  "aeonium",
  "lavanda",
  "cadena de plátanos",
  "cadena de platanos",
  "cordon-san-jose",
  "cordón san jose",
  "cordon san jose",
  "amarilis",
  "aloe",
  "amor de hombre",
  "aranto",
  "kalonche",
  "jade",
  "palmera",
  "dolar",
  "estrella de las rocas",
  "cactus encaje",
  "cactus erizo",
  "cactus-amarillo",
];

function classify(nombre) {
  const n = (nombre || "").toLowerCase();
  // toxica gana sobre moderada gana sobre apta (más conservador para mascotas)
  for (const k of TOXICAS) if (n.includes(k)) return "toxica";
  for (const k of MODERADAS) if (n.includes(k)) return "moderada";
  for (const k of APTAS) if (n.includes(k)) return "apta";
  return null;
}

async function seed() {
  const snapshot = await getDocs(collection(db, "Plantas"));

  console.log(
    `\nClasificando aptitud para mascotas en ${snapshot.size} plantas${
      DRY_RUN ? " (DRY RUN — sin escribir)" : ""
    }${FORCE ? " [FORZANDO sobreescritura]" : ""}\n`,
  );

  const buckets = { apta: 0, moderada: 0, toxica: 0, "sin-info": 0, skipped: 0 };

  for (const documento of snapshot.docs) {
    const data = documento.data();
    const ref = doc(db, "Plantas", documento.id);
    const nombre = data.nombre || documento.id;

    const yaTiene = typeof data.aptaMascotas === "string";
    const valorActual = yaTiene ? data.aptaMascotas : "sin-info";

    // Si ya está seteado en algo distinto de "sin-info" y no es FORCE, no tocar.
    if (yaTiene && valorActual !== "sin-info" && !FORCE) {
      buckets.skipped++;
      continue;
    }

    const propuesto = classify(nombre);
    if (!propuesto) {
      // Sin match en las listas → lo dejamos sin-info para que lo setees manual
      buckets["sin-info"]++;
      if (!yaTiene && !DRY_RUN) {
        await updateDoc(ref, { aptaMascotas: "sin-info" });
      }
      continue;
    }

    if (propuesto === valorActual) {
      buckets.skipped++;
      continue;
    }

    buckets[propuesto]++;
    if (!DRY_RUN) {
      await updateDoc(ref, { aptaMascotas: propuesto });
    }

    console.log(
      `  [${DRY_RUN ? "DRY" : "OK"}] ${nombre} → ${propuesto}`,
    );
  }

  console.log(
    `\nResumen: 🐾 apta=${buckets.apta} · moderada=${buckets.moderada} · tóxica=${buckets.toxica} · sin-info=${buckets["sin-info"]} · sin cambios=${buckets.skipped}`,
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
