// Hanterar inloggning, namn och användarregistrering

import { auth, db } from "./firebase-setup.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { startApp } from './app-logic.js';


async function generateAvailableIds() {
  const db = getFirestore();
  for (let i = 1; i <= 999; i++) {
    await setDoc(doc(db, "availablePalletIds", i.toString()), { free: true });
  }
  console.log("Klart! 1–999 skapade.");
}
console.log("TEST: generatorn laddades!");

// KÖR GENERERINGEN EN GÅNG
generateAvailableIds();

// ================================
// Startpunkt – vänta på Firebase Auth
// ================================
export function initAuth(startAppCallback) {

  onAuthStateChanged(auth, async (user) => {
    // Ingen användare → logga in anonymt
    if (!user) {
      const cred = await signInAnonymously(auth);
      user = cred.user;
    }

    const uid = user.uid;
    const userRef = doc(db, "users", uid);

    // Hämta användarens dokument
    const snap = await getDoc(userRef);

    // Om dokumentet saknas → fråga efter namn
    if (!snap.exists()) {
      let name = "";

      // Fråga tills giltigt namn
      while (!name || !name.trim()) {
        name = prompt("Välkommen! Skriv ditt namn:");
      }

      name = name.trim();

      // Spara namnet
      await setDoc(userRef, { name });
      console.log("Namn sparat:", name);
    }

    // Allt är klart → kör vidare appen
    startAppCallback();
    startApp();

  });
}