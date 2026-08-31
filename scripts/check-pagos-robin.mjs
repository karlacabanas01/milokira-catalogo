/**
 * Diagnóstico del saldo de Robin: lee los pedidos y los pagos reales y muestra
 * por qué el saldo da lo que da. Solo lee, no escribe nada.
 *
 *   node scripts/check-pagos-robin.mjs
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

const ROBIN_DESDE = new Date("2026-08-21T00:00:00").getTime();
const clp = (n) => `$${Math.round(n).toLocaleString("es-CL")}`;

async function main() {
  const [txSnap, pagosSnap] = await Promise.all([
    getDocs(collection(db, "Transacciones")),
    getDocs(collection(db, "PagosRobin")),
  ]);

  // --- Lo que le corresponde -------------------------------------------
  let totalRobin = 0;
  txSnap.forEach((d) => {
    const data = d.data();
    const estado = data.status ? String(data.status).toLowerCase() : "completado";
    if (estado === "pending") return;
    const createdAt = data.created_at ? new Date(String(data.created_at)).getTime() : 0;
    if (!createdAt || createdAt < ROBIN_DESDE) return;

    const monto = Number(data.total_amount) || 0;
    const items = Array.isArray(data.items) ? data.items : [];
    const productos = items
      .filter((i) => i?.es_de_companero)
      .reduce((acc, i) => acc + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);
    const delivery = data.delivery_type === "delivery" ? Number(data.delivery_fee) || 0 : 0;
    const directo = Math.max(0, Number(data.robin_amount) || 0);
    const bruto = delivery + directo + productos;
    if (bruto <= 0) return;
    totalRobin += Math.min(bruto, monto);
  });

  // --- Los pagos --------------------------------------------------------
  console.log(`\n=== COLECCIÓN PagosRobin: ${pagosSnap.size} documento(s) ===\n`);

  if (pagosSnap.size === 0) {
    console.log("  ⚠️  VACÍA. El pago no llegó a guardarse.");
    console.log("      Causa más probable: las security rules de Firestore");
    console.log("      no permiten escribir en 'PagosRobin'.\n");
  }

  let pagadoValido = 0;
  let pagadoDescartado = 0;

  pagosSnap.forEach((d) => {
    const data = d.data();
    const createdAt = data.created_at ? new Date(String(data.created_at)).getTime() : 0;
    const monto = Number(data.amount);

    const razones = [];
    if (!data.created_at) razones.push("sin created_at");
    else if (!createdAt) razones.push(`created_at ilegible: ${JSON.stringify(data.created_at)}`);
    else if (createdAt < ROBIN_DESDE) razones.push(`fecha anterior al 21-08 (${data.created_at})`);
    if (!Number.isFinite(monto)) razones.push(`amount no numérico: ${JSON.stringify(data.amount)}`);
    else if (monto <= 0) razones.push(`amount <= 0: ${monto}`);

    const ok = razones.length === 0;
    if (ok) pagadoValido += monto;
    else pagadoDescartado += Number.isFinite(monto) && monto > 0 ? monto : 0;

    console.log(`  ${ok ? "✅" : "❌"} ${d.id}`);
    console.log(`     amount:      ${JSON.stringify(data.amount)}  (typeof ${typeof data.amount})`);
    console.log(`     created_at:  ${JSON.stringify(data.created_at)}`);
    console.log(`     description: ${JSON.stringify(data.description)}`);
    if (!ok) console.log(`     → DESCARTADO: ${razones.join(" · ")}`);
    console.log();
  });

  // --- Resumen ----------------------------------------------------------
  console.log("=== SALDO ===\n");
  console.log(`  Le corresponde:      ${clp(totalRobin)}`);
  console.log(`  Pagos que cuentan:  −${clp(pagadoValido)}`);
  if (pagadoDescartado > 0) {
    console.log(`  Pagos descartados:   ${clp(pagadoDescartado)}  ⚠️  no se están restando`);
  }
  console.log(`  ─────────────────────────────`);
  console.log(`  Saldo:               ${clp(totalRobin - pagadoValido)}\n`);
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message);
  if (String(e.code).includes("permission-denied")) {
    console.error("   → Las security rules están bloqueando la lectura de PagosRobin.\n");
  }
  process.exit(1);
});
