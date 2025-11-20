import { places } from "./places-config.js";
import { auth, db } from "./firebase-setup.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ================================
// ⭐ INITIERA PLATSER I FIRESTORE ⭐
// ================================

async function initializeAllLocations() {
  console.log("👉 Startar initiering av alla platser...");

  for (const placeId of places) {
    const ref = doc(db, "locations", placeId);

    await setDoc(ref, {
      pallar: [],
      who: auth.currentUser?.displayName || "system",
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log("✓ Skapade plats:", placeId);
  }

  console.log("🎉 Alla platser är nu skapade i Firestore!");
}

// ⭐ Kör init när användaren är inloggad
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  initializeAllLocations();
});
