/**
 * Corrige las plantas cuyo `precio.valor` no coincide con su propio
 * `costo` + `margen` — el síntoma de un precio pisado por una edición hecha
 * sobre datos en caché.
 *
 * Recalcula precio = costo * (1 + margen/100), redondeado comercialmente.
 *
 *   node scripts/fix-precios-desajustados.mjs           → reporte, no escribe
 *   node scripts/fix-precios-desajustados.mjs --aplicar → escribe (con respaldo)
 */
import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const APLICAR = process.argv.includes("--aplicar");
const clp = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

const redondearComercial = (n) => {
  if (n <= 0) return 0;
  const paso = n < 10000 ? 500 : 1000;
  return Math.round(n / paso) * paso;
};

async function main() {
  const snap = await getDocs(collection(db, "Plantas"));

  const respaldo = [];
  const cambios = [];

  snap.forEach((d) => {
    const x = d.data();
    respaldo.push({ id: d.id, precio: x.precio, costo: x.costo, margen: x.margen });

    const costo = Number(x.costo) || 0;
    const margen = Number(x.margen);
    const actual = Number(x?.precio?.valor) || 0;
    if (costo <= 0 || !Number.isFinite(margen) || actual <= 0) return;

    const esperado = redondearComercial(costo * (1 + margen / 100));
    // Tolerancia: el redondeo comercial ya mueve el número, solo interesan
    // los desajustes grandes (un precio de otra compra, no un centavo).
    if (Math.abs(esperado - actual) <= Math.max(600, actual * 0.06)) return;

    cambios.push({ id: d.id, nombre: x.nombre || d.id, actual, nuevo: esperado, costo, margen });
  });

  cambios.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  console.log(`\n=== ${cambios.length} planta(s) con el precio desajustado ===\n`);
  for (const c of cambios) {
    const signo = c.nuevo > c.actual ? "↑" : "↓";
    console.log(`  ${signo} ${c.nombre}`);
    console.log(`     ${clp(c.actual)} → ${clp(c.nuevo)}   (costo ${clp(c.costo)} + ${c.margen}%)`);
  }

  if (!APLICAR) {
    console.log(`\n  Nada se escribió. Para aplicar:`);
    console.log(`    node scripts/fix-precios-desajustados.mjs --aplicar\n`);
    return;
  }

  const archivo = `respaldo-precios-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.json`;
  writeFileSync(archivo, JSON.stringify(respaldo, null, 2));
  console.log(`\n  Respaldo de las ${respaldo.length} plantas en ${archivo}`);

  let ok = 0;
  for (const c of cambios) {
    await updateDoc(doc(db, "Plantas", c.id), { "precio.valor": c.nuevo });
    ok++;
  }
  console.log(`  ✅ ${ok} precio(s) actualizados.\n`);
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message, "\n");
  process.exit(1);
});
