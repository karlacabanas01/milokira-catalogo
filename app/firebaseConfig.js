import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Estos valores son públicos por diseño: viajan en el bundle del navegador.
// Lo que protege la base no son ellos, son las security rules de Firestore y
// Storage (firestore.rules / storage.rules) más la sesión de Firebase Auth.
const firebaseConfig = {
  apiKey: "AIzaSyB6t07v_o7AfpbfoPkfx1PMnmCUnZRPkzM",
  authDomain: "milokira-plantas.firebaseapp.com",
  projectId: "milokira-plantas",
  storageBucket: "milokira-plantas.firebasestorage.app",
  messagingSenderId: "54535735115",
  appId: "1:54535735115:web:8526229916cf5f8a57cace",
  measurementId: "G-6BS44RBFW9",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
