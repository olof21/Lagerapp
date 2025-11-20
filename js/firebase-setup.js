// Denna fil hanterar Firebase som är databasen i bakgrunden av websidan där all data sparas //

// Firebase + App-logik //
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, signInAnonymously, 
    updateProfile, 
    onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
getFirestore, enableIndexedDbPersistence,
doc, getDoc, setDoc, getDocs, collection, onSnapshot, writeBatch, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === Firebase Setup ===
const firebaseConfig = {
    apiKey: "AIzaSyC_lEAQE6m-LhuxWfbWVlZ7ag_RQHB_ZbQ",
    authDomain: "lagervy---databas.firebaseapp.com",
    projectId: "lagervy---databas",
    storageBucket: "lagervy---databas.firebasestorage.app",
    messagingSenderId: "389445759047",
    appId: "1:389445759047:web:4ec5c41980d6f7939a4162",
    measurementId: "G-MLL7N1SDBB"
};

// Initiera Firebase //
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

/*
// === CREATE PALLET IDS (RUN ONCE ONLY) ===
async function generateAvailableIds() {
  for (let i = 1; i <= 999; i++) {
    await setDoc(doc(db, "availablePalletIds", i.toString()), { free: true });
  }
  console.log("Klart! 1–999 skapade.");
}
generateAvailableIds();
*/