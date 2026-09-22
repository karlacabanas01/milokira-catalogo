/**
 * Revisa si hay precios "pegados" en el ingreso de mercadería: overrides
 * escritos a mano que pisan el precio calculado de una compra nueva, y plantas
 * cuyo precio en el catálogo no coincide con el de su última compra ingresada.
 *
 * Solo lee, no escribe nada.
 *
 *   node scripts/check-precios-mercaderia.mjs
 */
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

const clp = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const redondearComercial = (n) => {
  if (n <= 0) return 0;
  const paso = n < 10000 ? 500 : 1000;
  return Math.round(n / paso) * paso;
};

async function main() {
  const [comprasSnap, plantasSnap] = await Promise.all([
    getDocs(collection(db, "Compras")),
    getDocs(collection(db, "Plantas")),
  ]);

  const plantas = new Map();
  plantasSnap.forEach((d) => plantas.set(d.id, d.data()));

  const compras = [];
  comprasSnap.forEach((d) => compras.push({ id: d.id, ...d.data() }));
  compras.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));

  // --- 1. Overrides guardados ------------------------------------------
  console.log("\n=== PRECIOS EDITADOS A MANO (overrides) ===\n");
  let overrides = 0;
  for (const c of compras) {
    for (const i of c.items || []) {
      if (i.precioSugeridoOverride > 0) {
        overrides++;
        console.log(`  ${i.nombre}`);
        console.log(`     compra:   ${c.proveedor || "?"} · ${(c.fecha || "").slice(0, 10)} · ${c.status}`);
        console.log(`     override: ${clp(i.precioSugeridoOverride)}`);
        console.log();
      }
    }
  }
  if (overrides === 0) console.log("  Ninguno. No hay precios forzados a mano.\n");

  // --- 2. Catálogo vs última compra ingresada ---------------------------
  console.log("=== PRECIO DEL CATÁLOGO vs ÚLTIMA COMPRA INGRESADA ===\n");

  const ultimaPorPlanta = new Map();
  for (const c of compras) {
    if (c.status !== "ingresada") continue;
    const ivaFactor = 1 + (Number(c.ivaPorcentaje) || 0) / 100;
    const unidadesTot = (c.items || []).reduce((a, b) => a + (Number(b.unidades) || 0), 0);
    const despPorUnidad = unidadesTot > 0 ? (Number(c.despachoTotal) || 0) / unidadesTot : 0;

    for (const i of c.items || []) {
      if (!i.ingresada) continue;
      const porMaceta = Math.max(1, Number(i.plantasPorMaceta) || 1);
      const costoReal = ((Number(i.precioUnitNeto) || 0) * ivaFactor + despPorUnidad) / porMaceta;
      const base = costoReal * (1 + (Number(c.margenSugerido) || 0) / 100);
      const sugerido = i.precioSugeridoOverride > 0 ? i.precioSugeridoOverride : base;
      ultimaPorPlanta.set(slugify(i.nombre), {
        nombre: i.nombre,
        esperado: redondearComercial(sugerido),
        override: i.precioSugeridoOverride > 0,
        fecha: (c.fecha || "").slice(0, 10),
        proveedor: c.proveedor || "?",
      });
    }
  }

  let desajustes = 0;
  for (const [slug, info] of ultimaPorPlanta) {
    const planta = plantas.get(slug);
    if (!planta) continue;
    const actual = Number(planta?.precio?.valor) || 0;
    if (actual !== info.esperado) {
      desajustes++;
      console.log(`  ⚠️  ${info.nombre}`);
      console.log(`     catálogo:      ${clp(actual)}`);
      console.log(`     última compra: ${clp(info.esperado)}${info.override ? "  (precio forzado a mano)" : ""}`);
      console.log(`     compra:        ${info.proveedor} · ${info.fecha}`);
      console.log();
    }
  }

  if (desajustes === 0) {
    console.log("  ✅ Todas las plantas tienen el precio de su última compra.\n");
  } else {
    console.log(`  ${desajustes} planta(s) con precio distinto al de su última compra.\n`);
  }
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message, "\n");
  process.exit(1);
});
