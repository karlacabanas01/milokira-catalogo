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

/**
 * Dificultad por defecto según categoría.
 * - Suculentas / Cactus: fáciles (muy resistentes).
 * - Resto: media.
 * - Implementos: ignorados (no aplica).
 */
function dificultadPorCategoria(categorias) {
  if (!Array.isArray(categorias)) return "media";
  const upper = categorias.map((c) =>
    typeof c === "string" ? c.toUpperCase() : "",
  );
  if (upper.includes("IMPLEMENTOS")) return null; // no aplica
  if (upper.includes("SUCULENTAS") || upper.includes("CACTUS")) return "facil";
  return "media";
}

async function seed() {
  const snapshot = await getDocs(collection(db, "Plantas"));

  console.log(
    `\nRevisando ${snapshot.size} plantas${DRY_RUN ? " (DRY RUN — sin escribir)" : ""}\n`,
  );

  let updated = 0;
  let skipped = 0;

  for (const documento of snapshot.docs) {
    const data = documento.data();
    const ref = doc(db, "Plantas", documento.id);

    const yaTieneDificultad = typeof data.dificultad === "string";
    const yaTieneMascotas = typeof data.aptaMascotas === "string";

    if (yaTieneDificultad && yaTieneMascotas) {
      skipped++;
      continue;
    }

    const patch = {};
    if (!yaTieneDificultad) {
      const d = dificultadPorCategoria(data.categorias);
      if (d) patch.dificultad = d;
    }
    if (!yaTieneMascotas) {
      patch.aptaMascotas = "sin-info";
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      await updateDoc(ref, patch);
    }

    console.log(
      `  [${DRY_RUN ? "DRY" : "OK"}] ${documento.id}: ${JSON.stringify(patch)}`,
    );
    updated++;
  }

  console.log(
    `\nResultado: ${updated} ${DRY_RUN ? "a actualizar" : "actualizadas"}, ${skipped} sin cambios.`,
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
