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

const snap = await getDocs(collection(db, "Plantas"));
const nombres = snap.docs
  .map((d) => d.data().nombre || d.id)
  .sort((a, b) => a.localeCompare(b, "es"));

console.log(`\nTotal: ${nombres.length} plantas\n`);
nombres.forEach((n, i) => console.log(`${i + 1}. ${n}`));
process.exit(0);
