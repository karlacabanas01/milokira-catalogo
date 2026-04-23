import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FICHAS = [
  {
    titulo: "Hojas amarillas — exceso de riego",
    categoria: "enfermedad",
    keywords: ["amarilla", "amarillas", "hoja", "hojas", "riego", "podrida", "exceso", "agua"],
    contenido:
      "Las hojas amarillentas que empiezan por las de abajo suelen indicar exceso de riego o mala drenaje. Revisa que la maceta tenga orificios, que el sustrato no esté encharcado, y deja que la tierra se seque al menos 2-3 cm antes del próximo riego. Si la raíz está oscura y blanda, hay pudrición: saca la planta, corta las raíces dañadas y trasplanta en sustrato nuevo más aireado.",
  },
  {
    titulo: "Hojas marrones crujientes — falta de humedad",
    categoria: "enfermedad",
    keywords: ["marron", "cafe", "seca", "crujiente", "punta", "humedad", "aire"],
    contenido:
      "Las puntas marrones y crujientes en tropicales (monstera, potus, calatheas) indican aire seco o sustrato muy seco. Soluciones: acerca a otras plantas, pon una bandeja con piedras y agua debajo, rocía las hojas en las mañanas, o usa un humidificador. Riego regular, sin encharcar.",
  },
  {
    titulo: "Cuidados generales Monstera Deliciosa",
    categoria: "especie",
    keywords: ["monstera", "deliciosa", "costilla", "adan"],
    contenido:
      "La Monstera prefiere luz indirecta brillante, riego cuando los 3 cm superiores de sustrato estén secos (cada 7-10 días), humedad media-alta, y un tutor o palo de musgo para trepar. Si no le salen fenestraciones (hoyos), le falta luz. Fertiliza en primavera-verano cada 15 días.",
  },
  {
    titulo: "Cuidados Potus (Pothos)",
    categoria: "especie",
    keywords: ["potus", "pothos", "epipremnum", "enredadera"],
    contenido:
      "El potus es muy resistente: acepta luz media a baja (no directa), riego cuando el sustrato está seco al tacto (7-14 días), y tolera olvidos. Si las hojas se ven pálidas o pequeñas, necesita más luz. Se propaga fácil con esquejes en agua.",
  },
  {
    titulo: "Cuidados Suculentas",
    categoria: "especie",
    keywords: ["suculenta", "suculentas", "crasa", "echeveria", "haworthia"],
    contenido:
      "Las suculentas quieren MUCHA luz directa (mínimo 4-6h al día) y poca agua: riega solo cuando el sustrato está completamente seco (cada 10-15 días en verano, cada 20-30 en invierno). Sustrato debe ser muy drenante (mezcla con arena o perlita). Si se estiran, les falta luz. Hojas blandas = demasiado agua.",
  },
  {
    titulo: "Plaga — Cochinillas algodonosas",
    categoria: "plaga",
    keywords: ["cochinilla", "algodon", "blancas", "bolitas", "pelusa", "plaga"],
    contenido:
      "Las cochinillas se ven como motas blancas algodonosas en hojas, tallos y axilas. Solución: limpia manualmente con un hisopo mojado en alcohol al 70%, repite cada 3-4 días durante 2 semanas. Aísla la planta afectada. En infestaciones fuertes, aplicar jabón potásico o aceite de neem.",
  },
  {
    titulo: "Plaga — Arañita roja",
    categoria: "plaga",
    keywords: ["araña", "aranita", "roja", "telaraña", "puntos", "acaro"],
    contenido:
      "La arañita roja aparece en ambientes secos: hojas con puntos amarillos pequeños y telarañas finas en el reverso. Aumenta la humedad inmediatamente (rocía las hojas a diario), lava las hojas con agua jabonosa y aplica aceite de neem cada 5 días. Aísla la planta y revisa las vecinas.",
  },
  {
    titulo: "Tutores de musgo sphagnum — info de venta",
    categoria: "negocio",
    keywords: ["tutor", "tutores", "musgo", "sphagnum", "esfagno", "trepadora", "precio"],
    contenido:
      "Milokira vende tutores de musgo sphagnum a pedido, ideales para plantas trepadoras como monstera, potus o filodendros. Se hacen en distintos tamaños (60cm, 80cm y a medida). Para precios y disponibilidad, derivar al WhatsApp +56 9 9495 5949.",
  },
];

async function seed() {
  console.log(`\nSubiendo ${FICHAS.length} fichas a ConocimientoKira...\n`);
  let ok = 0;
  for (const f of FICHAS) {
    try {
      await addDoc(collection(db, "ConocimientoKira"), {
        ...f,
        created_at: new Date().toISOString(),
      });
      console.log(`  [OK] ${f.titulo}`);
      ok++;
    } catch (err) {
      console.error(`  [ERR] ${f.titulo}:`, err.message);
    }
  }
  console.log(`\nListo: ${ok}/${FICHAS.length} fichas creadas.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error general:", err);
  process.exit(1);
});
