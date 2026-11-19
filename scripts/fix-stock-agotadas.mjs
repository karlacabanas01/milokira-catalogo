/**
 * Pone stock 0 a las plantas marcadas como no disponibles que todavía
 * arrastran stock registrado.
 *
 * Esos números son restos de mercaderías viejas que nunca se depuraron: la
 * planta ya no está a la venta, se marcó agotada a mano, pero el stock quedó
 * como estaba. Dejarlo en cero hace que el inventario diga la verdad y que el
 * catálogo y el panel cuenten lo mismo.
 *
 * Por defecto solo informa. Para escribir hay que pasar --aplicar, y antes de
 * tocar nada guarda un respaldo JSON con el stock previo de cada planta, por
 * si alguna hay que devolverla.
 *
 *   node scripts/fix-stock-agotadas.mjs              # solo mira
 *   node scripts/fix-stock-agotadas.mjs --aplicar    # corrige
 *
 * Pide correo y clave del panel: las reglas de Firestore no dejan escribir sin
 * sesión. Se pueden pasar por entorno para no tipearlos:
 *   MILOKIRA_EMAIL=... MILOKIRA_PASS=... node scripts/fix-stock-agotadas.mjs --aplicar
 */
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { createInterface } from "node:readline/promises";
import { writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";

const firebaseConfig = {
  apiKey: "AIzaSyB6t07v_o7AfpbfoPkfx1PMnmCUnZRPkzM",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
  messagingSenderId: "54535735115",
  appId: "1:54535735115:web:8526229916cf5f8a57cace",
};

const APLICAR = process.argv.includes("--aplicar");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function entrar() {
  const email = process.env.MILOKIRA_EMAIL;
  const pass = process.env.MILOKIRA_PASS;
  if (email && pass) {
    await signInWithEmailAndPassword(auth, email, pass);
    return;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const e = email ?? (await rl.question("Correo del panel: "));
  const p = pass ?? (await rl.question("Clave: "));
  rl.close();
  await signInWithEmailAndPassword(auth, e.trim(), p);
}

const main = async () => {
  if (APLICAR) {
    console.log("Entrando con tu cuenta (las reglas no dejan escribir sin sesión)...\n");
    await entrar();
  }

  const snap = await getDocs(collection(db, "Plantas"));

  const porArreglar = [];
  let yaEnCero = 0;
  let aLaVenta = 0;

  snap.forEach((d) => {
    const data = d.data();
    const stock = Number(data.stock) || 0;
    const disponible = data.precio?.disponible;
    if (disponible === false && stock > 0) {
      porArreglar.push({ id: d.id, nombre: data.nombre ?? d.id, stock });
    } else if (disponible === false) {
      yaEnCero++;
    } else {
      aLaVenta++;
    }
  });

  console.log(`Catálogo: ${snap.size} plantas`);
  console.log(`  ${aLaVenta} a la venta`);
  console.log(`  ${yaEnCero} agotadas y ya con stock 0 (nada que hacer)`);
  console.log(`  ${porArreglar.length} agotadas pero con stock fantasma\n`);

  if (porArreglar.length === 0) {
    console.log("Nada que corregir.");
    return;
  }

  const total = porArreglar.reduce((s, p) => s + p.stock, 0);
  porArreglar
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .forEach((p) => console.log(`  ${p.nombre}  ${p.stock} → 0`));
  console.log(`\n  ${total} unidades fantasma en total.`);

  if (!APLICAR) {
    console.log(`\nSolo miré, no cambié nada.`);
    console.log(`Para corregir:  node scripts/fix-stock-agotadas.mjs --aplicar`);
    return;
  }

  const respaldo = `/tmp/milokira-stock-previo-${Date.now()}.json`;
  writeFileSync(respaldo, JSON.stringify(porArreglar, null, 2));
  console.log(`\nRespaldo del stock previo: ${respaldo}`);

  let ok = 0;
  for (const p of porArreglar) {
    await updateDoc(doc(db, "Plantas", p.id), {
      stock: 0,
      updated_at: new Date().toISOString(),
    });
    ok++;
  }
  console.log(`\n${ok} plantas quedaron en stock 0.`);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nError:", e.message);
    process.exit(1);
  });
