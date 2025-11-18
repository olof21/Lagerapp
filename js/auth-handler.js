// Hanterar inloggning, namn och användarregistrering

import { auth } from "./firebase-setup.js";
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export function initAuth(startAppCallback) {

  onAuthStateChanged(auth, async (user) => {

    // Ingen användare? → Skapa anonym login
    if (!user) {
      const cred = await signInAnonymously(auth);
      user = cred.user;
    }

    const uid = user.uid;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    let name = user.displayName;   // <-- Hämta ev. namn från Auth

    // Om Auth-saknar namn → fråga användaren
    if (!name) {

      if (!snap.exists()) {
        // Fråga tills giltigt namn
        while (!name || !name.trim()) {
          name = prompt("Välkommen! Skriv ditt namn:");
        }
        name = name.trim();

        // Spara i Firestore (valfritt)
        await setDoc(userRef, { name });
      } else {
        // Firestore hade ett namn → använd det först
        name = snap.data().name;
      }

      // ⭐ SPARA NAMNET I FIREBASE AUTH (det viktiga!!)
      await updateProfile(user, { displayName: name });

      console.log("✔ Namn uppdaterat i Firebase Auth:", name);
    }

    // Firebase Auth har nu ett riktigt displayName
    startAppCallback();
  });
}