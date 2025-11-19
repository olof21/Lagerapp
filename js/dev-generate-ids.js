// Kör detta EN gång för att fylla "availablePalletIds" med ID 1–999 genom vercel dev

import { db } from "./firebase-setup.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export async function generateAvailableIds() {
  for (let i = 1; i <= 999; i++) {
    await setDoc(doc(db, "availablePalletIds", i.toString()), { free: true });
  }
  console.log("🎉 Klart! Alla ID 1–999 finns i availablePalletIds.");
}

generateAvailableIds();