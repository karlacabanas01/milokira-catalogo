import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DRY_RUN = process.argv.includes("--dry-run");

async function migrate() {
  const snapshot = await getDocs(collection(db, "Plantas"));

  console.log(
    `\nRevisando ${snapshot.size} plantas: TUTORES → IMPLEMENTOS${DRY_RUN ? " (DRY RUN — sin escribir)" : ""}\n`,
  );

  let migrated = 0;
  let skipped = 0;

  for (const documento of snapshot.docs) {
    const data = documento.data();
    const ref = doc(db, "Plantas", documento.id);

    if (!Array.isArray(data.categorias)) {
      skipped++;
      continue;
    }

    const tieneTutores = data.categorias.some(
      (c) => typeof c === "string" && c.toUpperCase() === "TUTORES",
    );

    if (!tieneTutores) {
      skipped++;
      continue;
    }

    const sinTutores = data.categorias.filter(
      (c) => typeof c === "string" && c.toUpperCase() !== "TUTORES",
    );

    const yaTieneImplementos = sinTutores.some(
      (c) => c.toUpperCase() === "IMPLEMENTOS",
    );

    const nuevas = yaTieneImplementos
      ? sinTutores
      : [...sinTutores, "IMPLEMENTOS"];

    if (!DRY_RUN) {
      await updateDoc(ref, { categorias: nuevas });
    }

    console.log(
      `  [${DRY_RUN ? "DRY" : "OK"}] ${documento.id}: ${JSON.stringify(data.categorias)} → ${JSON.stringify(nuevas)}`,
    );
    migrated++;
  }

  console.log(
    `\nResultado: ${migrated} ${DRY_RUN ? "a migrar" : "migradas"}, ${skipped} sin cambios.`,
  );
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Error en migración:", err);
  process.exit(1);
});
