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

  console.log(`Total plantas: ${snapshot.size}\n`);

  const plantas = [];
  snapshot.forEach((d) => {
    const data = d.data();
    plantas.push({
      id: d.id,
      nombre: data.nombre || "Sin nombre",
      descripcion: data.descripcion || "",
      len: (data.descripcion || "").length,
    });
  });

  plantas.sort((a, b) => a.len - b.len);

  for (const p of plantas) {
    const status = p.len < 80 ? "CORTA" : "OK";
    console.log(`[${status}] (${p.len} chars) ${p.nombre}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Desc: "${p.descripcion}"`);
    console.log("");
  }

  const cortas = plantas.filter((p) => p.len < 80);
  console.log(`\nResumen: ${cortas.length} plantas necesitan descripción más larga.`);

  process.exit(0);
}

main().catch(console.error);
