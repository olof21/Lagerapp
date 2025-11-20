// ===============================
// auth-handler.js – Stabil namnhantering för varje enhet
// ===============================

import { auth, db } from "./firebase-setup.js";
import { 
  onAuthStateChanged, 
  signInAnonymously,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { startApp } from "./app-logic.js";


// ---------------------------------------------------------
// 1. Skapa / hämta DEVICE-ID (permanent per enhet)
// ---------------------------------------------------------
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

const deviceId = getOrCreateDeviceId();


// ---------------------------------------------------------
// 2. HÄMTA NAMN från device-dokumentet
//    (Device-ID → 100% stabilt mellan uppdateringar)
// ---------------------------------------------------------
async function getStoredName() {
  const docRef = doc(db, "devices", deviceId);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().name : null;
}


// ---------------------------------------------------------
// 3. SPARA NAMN (både Firestore och localStorage)
// ---------------------------------------------------------
async function saveName(name, uid) {
  name = name.trim();

  // Koppla enhetens deviceId -> namn
  await setDoc(doc(db, "devices", deviceId), {
    name,
    updated: Date.now()
  }, { merge: true });

  // Koppla Firebase UID -> deviceId (men ej namn!)
  if (uid) {
    await setDoc(doc(db, "user_devices", uid), {
      deviceId
    }, { merge: true });
  }

  // Spara lokalt också
  localStorage.setItem("lagerUserName", name);

  return name;
}


// ---------------------------------------------------------
// 4. HUVUDLOGIK VID AUTH
//    - Frågar EN gång om namn
//    - Hittar befintligt namn om det finns
// ---------------------------------------------------------
export function initAuth(startAppCallback) {

  onAuthStateChanged(auth, async (user) => {

    // Skapa anonymt konto om det inte finns
    if (!user) {
      await signInAnonymously(auth);
      return;
    }

    let name = localStorage.getItem("lagerUserName");

    // 🔸 1. Har vi namn lokalt? (snabbast)
    if (name) {
      startAppCallback(name);
      return;
    }

    // 🔸 2. Har vi namn i Firestore via deviceId?
    name = await getStoredName();
    if (name) {
      localStorage.setItem("lagerUserName", name);
      startAppCallback(name);
      return;
    }

    // 🔸 3. INGET namn hittades → fråga en enda gång
    name = prompt("Ange ditt namn");

    while (!name || !name.trim()) {
      name = prompt("Du måste ange ett giltigt namn:");
    }

    // 🔸 4. Spara namnet
    await saveName(name, user.uid);

    startAppCallback(name);
  });

}
