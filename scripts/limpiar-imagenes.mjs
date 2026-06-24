import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import * as readline from "readline/promises";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("\n🔍 Leyendo Firestore...");
const snap = await getDocs(collection(db, "Plantas"));
const urlsEnUso = new Set();
snap.forEach((d) => {
  const url = d.data().imagenUrl;
  if (url) urlsEnUso.add(url);
});
console.log(`   → ${urlsEnUso.size} imágenes referenciadas en plantas`);

console.log("\n📦 Listando archivos en Storage/plantas/...");
const carpetaRef = ref(storage, "plantas");
const resultado = await listAll(carpetaRef);
console.log(`   → ${resultado.items.length} archivos encontrados`);

// Obtener la URL de descarga de cada archivo y comparar con las de Firestore
const noUsadas = [];
for (const item of resultado.items) {
  const url = await getDownloadURL(item);
  const estaEnUso = [...urlsEnUso].some((u) => u.includes(item.name));
  if (!estaEnUso) {
    noUsadas.push({ ref: item, name: item.name, url });
  }
}

if (noUsadas.length === 0) {
  console.log("\n✅ No hay imágenes sin usar. El storage está limpio.");
  process.exit(0);
}

console.log(`\n🗑️  Imágenes SIN usar (${noUsadas.length}):`);
noUsadas.forEach((img, i) => {
  console.log(`   ${i + 1}. ${img.name}`);
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const respuesta = await rl.question("\n¿Deseas eliminar estas imágenes? (s/N): ");
rl.close();

if (respuesta.trim().toLowerCase() !== "s") {
  console.log("\n❌ Operación cancelada. No se eliminó nada.");
  process.exit(0);
}

console.log("\n🗑️  Eliminando...");
let eliminadas = 0;
for (const img of noUsadas) {
  try {
    await deleteObject(img.ref);
    console.log(`   ✓ ${img.name}`);
    eliminadas++;
  } catch (err) {
    console.error(`   ✗ Error eliminando ${img.name}:`, err.message);
  }
}

console.log(`\n✅ Listo. ${eliminadas}/${noUsadas.length} imágenes eliminadas.\n`);
