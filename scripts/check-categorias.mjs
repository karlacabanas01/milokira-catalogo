import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snapshot = await getDocs(collection(db, "Plantas"));

  // Agrupar por categoría actual
  const porCategoria = {};
  const todas = [];

  snapshot.forEach((d) => {
    const data = d.data();
    const cat = (data.categoria || "SIN CATEGORÍA").toUpperCase();
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push({ id: d.id, nombre: data.nombre });
    todas.push({ id: d.id, nombre: data.nombre, categoria: cat });
  });

  console.log(`\nTotal plantas: ${snapshot.size}\n`);

  // Mostrar agrupadas
  for (const [cat, plantas] of Object.entries(porCategoria).sort()) {
    console.log(`\n📂 ${cat} (${plantas.length}):`);
    for (const p of plantas.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
      console.log(`   - [${p.id}] ${p.nombre}`);
    }
  }

  // Lista completa ordenada por nombre
  console.log("\n\n📋 LISTA COMPLETA (por nombre):");
  console.log("=".repeat(80));
  for (const p of todas.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    console.log(`  ${p.nombre.padEnd(32)} │ ${p.categoria.padEnd(12)} │ ${p.id}`);
  }

  process.exit(0);
}

main().catch(console.error);
