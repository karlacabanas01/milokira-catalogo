import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "MTm228YiYcD9Lu8Mo1g0",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const descripciones = {
  "calatea-zebrina":
    "Hojas grandes con rayas verde oscuro y claro que recuerdan a una cebra. Planta de interior que adora la humedad y la luz indirecta.",
  "ctenanthe-lubersiana":
    "Pariente de las calateas, con hojas alargadas de patrón verde y crema. Mueve sus hojas según la luz, creando un espectáculo natural.",
  "maranta-leuconeura":
    "Conocida como planta de la oración porque pliega sus hojas al anochecer. Hojas con nervaduras rojas sobre fondo verde aterciopelado.",
  "mimosa":
    "La famosa planta sensitiva que cierra sus hojas al tocarla. Fascinante para grandes y chicos, un verdadero espectáculo de la naturaleza.",
  "rosa-enana":
    "Miniatura encantadora de rosal que florece abundantemente en maceta. Perfecta para balcones, terrazas o como regalo especial lleno de color.",
  "sanseviera-":
    "Variedad oscura de lengua de suegra con hojas verde intenso casi negro. Purifica el aire y sobrevive con muy poca agua y luz.",
  "sanseviera-zaylanica":
    "Elegante sanseviera con hojas largas y patrones ondulados verde claro y oscuro. Resistente, purificadora de aire y de muy bajo mantenimiento.",
  "strobilante":
    "Planta tropical de hojas color púrpura iridiscente que brillan bajo la luz. Aporta un toque exótico y llamativo a cualquier rincón interior.",
  "tradescantia-morada":
    "Hermosa planta colgante de hojas moradas intensas con brillo metálico. De rápido crecimiento y perfecta para macetas colgantes o repisas altas.",
  "poinsettia":
    "Icónica planta de Navidad con brácteas rojas brillantes que parecen flores. Perfecta para decorar en fiestas y llenar de color tus espacios.",
  "singonio-planteado":
    "Singonio de hojas plateadas con tonos verde suave que reflejan la luz de forma elegante. Ideal para interiores luminosos y fácil de cuidar.",
  "singonio-starlite":
    "Variedad compacta de singonio con hojas verde claro jaspeadas en blanco. Crece lento y es perfecta para escritorios o espacios pequeños.",
  "singonio-confetti":
    "Rareza botánica con salpicaduras rosas, crema y verdes en cada hoja como confetti. Cada hoja es única y diferente, una verdadera obra de arte.",
  "chiflera":
    "Arbusto tropical de hojas compuestas en forma de sombrilla. Ejemplar grande de unos 70-80 cm, ideal para llenar esquinas con verde y frescura.",
  "peperomia-scadens":
    "Peperomia colgante de hojas pequeñas, redondeadas y carnosas de color verde brillante. Ejemplar único disponible, ideal para repisas o estantes.",
  "helecho-perejil":
    "Helecho de hojas finamente divididas que recuerdan al perejil rizado. Ama la humedad y la sombra parcial, ideal para baños o cocinas luminosas.",
  "árbol-de-jade-(grande)":
    "Ejemplar maduro de la clásica suculenta de la abundancia y buena fortuna. Tronco grueso y hojas carnosas verde jade, símbolo de prosperidad.",
  "cadena-de-plátanos":
    "Suculenta colgante con hojitas en forma de pequeños plátanos verdes. Fácil de cuidar, ama el sol indirecto y queda hermosa en macetas colgantes.",
  "jardín-suculentas-xl":
    "Pieza extra grande diseñada para destacar. Composición robusta e inmensa con suculentas variadas que crean un paisaje desértico en miniatura.",
  "rosario-de-rubíes":
    "Tallos morados y hojas que toman un rojo intenso con buen sol. Suculenta colgante única que parece un collar de piedras preciosas naturales.",
  "jardin-milo-1":
    "Arreglo alegre y robusto con especies de crecimiento armónico. Composición diseñada para ser un pequeño oasis verde de bajo mantenimiento.",
  "lirio-leopardo":
    "Maravilla botánica con hojas de manchas oscuras atigradas que la hacen única. Floración exótica en tonos naranjas con pecas, verdaderamente especial.",
  "rosario-variegado":
    "Versión exclusiva del rosario clásico con tonos crema, rosados y verdes. Suculenta colgante muy codiciada por coleccionistas de plantas raras.",
  "jardin-loki-1":
    "Arreglo dinámico con variedad de suculentas y texturas diferentes. Composición pensada para quienes buscan un mini jardín lleno de personalidad.",
  "jardin-loki-3":
    "Tercera edición de la serie Loki. Un pequeño ecosistema en maceta con suculentas que se complementan en color, forma y textura. Bajo mantenimiento.",
  "kalanchoe":
    "Famosa por sus flores vibrantes que duran semanas. Perfecta para espacios luminosos, balcones y como regalo colorido que alegra cualquier ambiente.",
  "coleo":
    "Hojas con patrones y colores vibrantes que parecen pintados a mano por un artista. Tonos púrpura, rosa, verde y rojo en combinaciones infinitas.",
  "jardin-loki-2":
    "Segunda variante del arreglo Loki. Combinación perfecta de colores y formas con suculentas seleccionadas para crear armonía visual en tu espacio.",
  "cactus-espinas-amarillas":
    "Cactus redondo clásico con espinas de tono dorado que brillan con la luz. Súper resistente, de bajo riego y perfecto para ventanas soleadas.",
  "cucharita-peperomia":
    "Hojas gruesas, carnosas y brillantes en forma de cuchara. Ideal para interiores con luz indirecta, compacta y de crecimiento lento. Muy decorativa.",
  "jardin-rectangular-1":
    "Composición alargada ideal para centros de mesa o repisas estrechas. Arreglo elegante de suculentas variadas en maceta rectangular de diseño.",
  "begonia-alas-de-ángel":
    "Hojas asimétricas con puntitos plateados y hermosas caídas de flores rosadas. Planta elegante que combina follaje decorativo y floración abundante.",
  "dólar-verde":
    "Colgante de hojas redondas y brillantes como monedas. Dicen que atrae prosperidad y buena energía. Fácil de cuidar y de crecimiento generoso.",
  "hierba-puntera":
    "Siempreviva con puntas rojizas que se intensifican con el sol. Ideal para techos verdes, maceteros o bordes de jardín. Muy resistente a la sequía.",
  "mala-madre-(clásica)":
    "Resistente y purificadora de aire por excelencia. Produce lindos hijuelos colgantes que puedes regalar o propagar fácilmente en nuevas macetas.",
  "begonia-hardy":
    "Variedad muy resistente que regala una floración preciosa y abundante durante meses. Perfecta para patios, balcones o jardines semi sombreados.",
  "cordón-de-san-josé":
    "Suculenta de crecimiento vertical muy original con hojas apiladas en forma de cordón. Ideal para dar altura y textura diferente a tu colección.",
  "jardin-rectangular-2":
    "Segunda variante del arreglo rectangular. Minimalista y lleno de vida, perfecto para espacios modernos que necesitan un toque verde con estilo.",
  "begonia-black":
    "Hermosa begonia de hojas oscuras casi negras con reflejos metálicos. Ideal tanto para interior como exterior en luz indirecta. Elegancia pura.",
  "estrella-de-las-rocas":
    "Suculenta de forma geométrica perfecta tipo estrella. Se camufla en entornos rústicos y rocosos. Coleccionable, resistente y de belleza hipnótica.",
  "haworthia":
    "Pequeña y elegante suculenta con hojas puntiagudas y marcas blancas translúcidas. Perfecta para escritorios, repisas y espacios con luz indirecta.",
  "philodendron-lemon-lime":
    "Hojas en forma de corazón de vibrante color verde neón que iluminan cualquier rincón. Fácil de cuidar, purifica el aire y crece rápidamente.",
  "pothos-marble-queen":
    "Enredadera elegante con patrón variegado de manchas blancas tipo mármol sobre verde. Purificadora de aire, resistente y de crecimiento generoso.",
  "aspidistra":
    "La planta de hierro, prácticamente indestructible. Sobrevive en rincones con poca luz y requiere mínimos cuidados. Elegante follaje verde oscuro.",
  "palmera-washington":
    "Toque tropical inconfundible con hojas en forma de abanico. Excelente para terrazas, patios o espacios amplios donde quieras un ambiente selvático.",
  "singonio-batik":
    "Intensas nervaduras blancas sobre hoja verde oscuro con estilo teñido tipo Batik. Planta tropical compacta, ideal para interiores bien iluminados.",
  "cactus-cola-de-ratón":
    "Cactus colgante de tallos largos cubiertos de suaves espinas. Ideal para macetas de pared o colgantes, con espectacular floración rosa en primavera.",
  "jardin-milo-2":
    "Versión alternativa del arreglo Milo con contrastes de verde oscuro y claro. Composición equilibrada que aporta frescura y vida a cualquier mesa.",
  "jardin-milo-3":
    "Tercera variante de la familia Milo. Composición tierna y fácil de cuidar, perfecta como regalo o para iniciarse en el mundo de las suculentas.",
  "pothos-golden":
    "Hojas verdes con pinceladas doradas que brillan con la luz. Indestructible, purificador de aire y perfecto para principiantes en el mundo vegetal.",
  "trío-3":
    "Tercera variante del clásico trío de suculentas en maceta compartida. Ideal para tu escritorio, repisa o como un regalo especial y fácil de cuidar.",
  "collar-de-corazones":
    "Delicada enredadera con hojitas en forma de corazón que caen en cascada. Perfecta para repisas altas o macetas colgantes. Romántica y encantadora.",
  "dolar-azul-planta":
    "Hojas redondeadas de tono azulado plateado que la hacen única y muy buscada por coleccionistas. Suculenta resistente de belleza sutil y elegante.",
  "jardín-suculentas-l":
    "Composición grande con especies cuidadosamente seleccionadas y bien adaptadas. Arreglo abundante y lleno de vida que es un jardín en miniatura.",
  "trío-2":
    "Una excelente opción para empezar tu colección de suculentas. Sencillo, hermoso y muy fácil de cuidar. Tres plantitas que se complementan perfecto.",
  "adansonii-monstera-oferta":
    "Ama la humedad y agradece que pulverices sus hojas para que sus huequitos luzcan perfectos. Trepadora tropical de rápido crecimiento y fácil cuidado.",
  "gynura-terciopelo":
    "Increíblemente suave al tacto, cubierta de pelos color púrpura iridiscente que brillan bajo la luz. Una joya viviente para tu colección de plantas.",
  "monstera-adansonii":
    "La planta queso suizo, famosa por sus agujeros naturales en cada hoja. Crece rápido, trepa o cuelga según cómo la guíes. Tropical y muy decorativa.",
  "paraguayo":
    "Resistente y de rápido crecimiento que aporta un toque verde y rústico a tus espacios. Ideal para exteriores soleados o interiores muy luminosos.",
  "aeonium":
    "Forma preciosas rosetas en las puntas de sus ramas, como un bonsái suculento natural. Especie mediterránea que ama el sol y resiste bien la sequía.",
  "mala-madre-verde":
    "Tonos verdes intensos y brillantes con abundantes hijuelos. Perfecta para macetas colgantes en espacios luminosos donde pueda lucir su follaje.",
  "maranta-kerchoveana-variegata":
    "Planta de la oración con patrón variegado único. Sus hojas se pliegan por la noche como manos en oración. Rareza tropical de cuidado intermedio.",
  "singonio-red-spot-tricolor":
    "Rareza botánica que combina manchas verdes, verde claro y rosa intenso en cada hoja. Cada ejemplar es único, ideal para coleccionistas exigentes.",
  "yId1D9fV1KtYOvQH1n4i":
    "Las tres son primas de la familia Tradescantia, conocidas como Amor de hombre. Trío colgante de colores púrpura, verde y plateado. Crecen rápido.",
  "santa-teresita":
    "Cactus de bosque sin espinas que regala una floración espectacular y colorida en tonos rosa, rojo o blanco. Ideal para interiores luminosos.",
  "singonio-golden-allusion":
    "Hojas verde amarillento dorado con nervaduras rojizas que irradian calidez. Llena de luz y energía cualquier espacio interior con su tono especial.",
  "trío-1":
    "Composición minimalista y equilibrada con tres suculentas que se complementan en forma y color. Regalo perfecto para amantes de las plantas.",
  "cardenal-rosa":
    "Clásico infaltable de flores rosadas vibrantes y resistentes que alegran balcones y terrazas durante todo el año. Fácil de cuidar y muy agradecida.",
  "monstera-deliciosa":
    "Reina indiscutida de las plantas de interior. Hojas grandes y rasgadas con toque selvático que transforma cualquier espacio en una jungla urbana.",
};

async function main() {
  const entries = Object.entries(descripciones);
  console.log(`\nActualizando ${entries.length} descripciones...\n`);

  let updated = 0;
  let errors = 0;

  for (const [id, descripcion] of entries) {
    try {
      await updateDoc(doc(db, "Plantas", id), { descripcion });
      console.log(`  [OK] (${descripcion.length} chars) ${id}`);
      updated++;
    } catch (err) {
      console.error(`  [ERROR] ${id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nListo: ${updated} actualizadas, ${errors} errores.`);
  process.exit(0);
}

main().catch(console.error);
