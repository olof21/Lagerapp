// pallet-handler.js
// Hanterar skapande och tömning av pallar (FIFO 1–999)

import {
    getFirestore,
    collection,
    getDocs,
    deleteDoc,
    doc,
    setDoc
  } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
  
  const db = getFirestore();
  
  /**
   * Hämtar minsta lediga pall-ID (1–999) och reserverar det genom att ta bort ID:t
   * från availablePalletIds och skapa en pall i pallets-samlingen.
   *
   * Returnerar det nya ID:t som sträng.
   */
  export async function createNewPallet() {
    // 1. Hämta alla lediga ID:n (dokument-ID:n i collectionen)
    const snapshot = await getDocs(collection(db, "availablePalletIds"));
  
    if (snapshot.empty) {
      throw new Error("Inga lediga pall-ID:n kvar (1–999 upptagna).");
    }
  
    // 2. Lista alla ID som numbers
    const ids = snapshot.docs.map(d => Number(d.id));
  
    // 3. Sortera för att få minsta möjliga ID
    ids.sort((a, b) => a - b);
  
    // 4. Använd minsta ID
    const nextId = ids[0].toString();
  
    // 5. Ta bort ID från availablePalletIds poolen
    await deleteDoc(doc(db, "availablePalletIds", nextId));
  
    // 6. Skapa en tom pallpost i pallets med grunddata
    await setDoc(doc(db, "pallets", nextId), {
      createdAt: Date.now(),
      status: "active",
      contents: "",   // kommer senare fyllas i via app-logic.js
    });
  
    return nextId;
  }
  
  /**
   * Tar bort pallen och lägger tillbaka ID i poolen så det kan användas igen.
   */
  export async function emptyPallet(id) {
    const idStr = id.toString();
  
    // 1. Radera pallen
    await deleteDoc(doc(db, "pallets", idStr));
  
    // 2. Lägg tillbaka ID i poolen
    await setDoc(doc(db, "availablePalletIds", idStr), { free: true });
  
    console.log(`Pall ${idStr} tömd och ID återfört till poolen.`);
  }
  