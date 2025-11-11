// Denna fil hanterarloggfunktionen, alltså att man kan se vem som gjort vad och när i Firestore //

import { db, auth } from "./firebase-setup.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/**
 * Loggar en händelse till Firestore → "logs"-kollektionen
 * @param {string} action - Vad som hände (t.ex. "Skapade pall")
 * @param {object} details - Extra data, t.ex. { pallId, placeId }
 */
export async function logAction(action, details = {}) {
  try {
    const user = auth.currentUser;
    const who = user?.displayName || "okänd";

    await addDoc(collection(db, "logs"), {
      action,
      who,
      details,
      timestamp: serverTimestamp() // exakt tid från Firestore-servern
    });

    console.log(`🪵 Logg sparad: ${action} av ${who}`);
  } catch (err) {
    console.error("❌ Kunde inte logga händelse:", err);
  }
}
