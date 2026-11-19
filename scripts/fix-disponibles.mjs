/**
 * Reactiva en el catálogo las plantas que tienen stock pero quedaron marcadas
 * como no disponibles.
 *
 * El catálogo público esconde una planta si `precio.disponible === false` O si
 * `stock <= 0`. La marca se pone a mano cuando algo se agota, pero nada la
 * volvía a encender al reponer, así que plantas con stock seguían saliendo
 * "Agotado por ahora".
 *
 * Por defecto solo informa. Para escribir hay que pasar --aplicar, y antes de
 * tocar nada guarda un respaldo JSON del estado actual.
 *
 *   node scripts/fix-disponibles.mjs                   # solo mira
 *   node scripts/fix-disponibles.mjs --aplicar         # corrige
 *
 * Pide correo y clave del panel: las reglas de Firestore no dejan escribir sin
 * sesión. Se pueden pasar por entorno para no tipearlos:
 *   MILOKIRA_EMAIL=... MILOKIRA_PASS=... node scripts/fix-disponibles.mjs --aplicar
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
  let agotadasDeVerdad = 0;
  let coherentes = 0;

  snap.forEach((d) => {
    const data = d.data();
    const stock = Number(data.stock) || 0;
    const disponible = data.precio?.disponible;
    if (stock > 0 && disponible === false) {
      porArreglar.push({ id: d.id, nombre: data.nombre ?? d.id, stock });
    } else if (stock <= 0) {
      agotadasDeVerdad++;
    } else {
      coherentes++;
    }
  });

  console.log(`Catálogo: ${snap.size} plantas`);
  console.log(`  ${coherentes} visibles y correctas`);
  console.log(`  ${agotadasDeVerdad} sin stock (agotadas de verdad, se quedan así)`);
  console.log(`  ${porArreglar.length} CON STOCK pero escondidas como agotadas\n`);

  if (porArreglar.length === 0) {
    console.log("Nada que corregir.");
    return;
  }

  porArreglar
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .forEach((p) => console.log(`  ${p.nombre}  (stock: ${p.stock})`));

  if (!APLICAR) {
    console.log(`\nSolo miré, no cambié nada.`);
    console.log(`Para reactivarlas:  node scripts/fix-disponibles.mjs --aplicar`);
    return;
  }

  const respaldo = `/tmp/milokira-disponibles-${Date.now()}.json`;
  writeFileSync(respaldo, JSON.stringify(porArreglar, null, 2));
  console.log(`\nRespaldo del estado previo: ${respaldo}`);

  let ok = 0;
  for (const p of porArreglar) {
    await updateDoc(doc(db, "Plantas", p.id), {
      "precio.disponible": true,
      updated_at: new Date().toISOString(),
    });
    ok++;
  }
  console.log(`\n${ok} plantas vuelven al catálogo.`);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nError:", e.message);
    process.exit(1);
  });
