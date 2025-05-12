import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDgPMBczAKrPs2k_LgGCFYNpoQmMlUFrEg",
  authDomain: "gra-system-43b0e.firebaseapp.com",
  projectId: "gra-system-43b0e",
  storageBucket: "gra-system-43b0e.firebasestorage.app",
  messagingSenderId: "906686759137",
  appId: "1:906686759137:web:25cc53a4e424e4b29c37a0",
  measurementId: "G-8RMZW8H83V",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
