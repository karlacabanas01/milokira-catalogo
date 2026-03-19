import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const snapshot = await getDocs(collection(db, "Plantas"));

  console.log(`\nMigrando ${snapshot.size} plantas: categoria (string) → categorias (string[])\n`);

  let migrated = 0;
  let skipped = 0;

  for (const documento of snapshot.docs) {
    const data = documento.data();
    const ref = doc(db, "Plantas", documento.id);

    // Si ya tiene el campo categorias como array, saltar
    if (Array.isArray(data.categorias)) {
      console.log(`  [SKIP] ${documento.id} — ya tiene categorias[]`);
      skipped++;
      continue;
    }

    const categoriaActual = data.categoria || "INTERIOR";
    const nuevasCategorias = [categoriaActual.toUpperCase()];

    await updateDoc(ref, {
      categorias: nuevasCategorias,
      categoria: deleteField(),
    });

    console.log(`  [OK] ${documento.id}: "${categoriaActual}" → ${JSON.stringify(nuevasCategorias)}`);
    migrated++;
  }

  console.log(`\nResultado: ${migrated} migradas, ${skipped} ya estaban migradas.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Error en migración:", err);
  process.exit(1);
});
