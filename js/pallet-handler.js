// pallet-handler.js
// Hanterar pall-ID-poolen och tömning av pallar via Firestore

import {
    getFirestore,
    collection,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    getDoc
  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
  
  const db = getFirestore();
  
  /**
   * 🟦 Hämta nästa lediga pall-ID
   * Returnerar bara ID:t — ändrar INGENTING i Firestore.
   * (Själva pallen skapas först när man trycker "Spara".)
   */
  export async function reservePalletId() {
    const colRef = collection(db, "availablePalletIds");
    const snap = await getDocs(colRef);
  
    if (snap.empty) {
      throw new Error("Inga lediga pall-ID:n kvar (1–999 upptagna).");
    }
  
    // Plocka ut dokument-ID:n (1..999)
    const ids = snap.docs.map(d => Number(d.id));
    ids.sort((a, b) => a - b);
  
    // Returnera lägsta lediga ID
    return ids[0].toString();
  }
  
  /**
   * 🟦 Skapar pallen i Firestore när användaren trycker "Spara"
   * - Tar bort ID från poolen
   * - Skapar pallen i "pallets"
   */
  export async function createPalletInFirestore(id, data) {
    const idStr = id.toString();
  
    // 1. Ta bort ID från poolen (ledig → upptagen)
    await deleteDoc(doc(db, "availablePalletIds", idStr));
  
    // 2. Skapa själva pallen
    await setDoc(doc(db, "pallets", idStr), data, { merge: true });
  }
  
  /**
   * 🟦 Töm en pall (ger tillbaka ID till poolen)
   */
  export async function emptyPallet(id) {
    const idStr = id.toString();
  
    // 1. Ta bort pallen helt
    await deleteDoc(doc(db, "pallets", idStr));
  
    // 2. Lägg tillbaka ID i poolen
    await setDoc(doc(db, "availablePalletIds", idStr), { free: true });
  }
  