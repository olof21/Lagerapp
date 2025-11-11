// Denna fil hanterar Firebase som är databasen i bakgrunden av websidan där all data sparas //

// Firebase + App-logik //
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth, signInAnonymously, 
    updateProfile, 
    onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
getFirestore, enableIndexedDbPersistence,
doc, getDoc, setDoc, getDocs, collection, onSnapshot, writeBatch, runTransaction
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

// === AUTENTISERING & ANVÄNDARHANTERING ===  
  // Lyssna på Auth-status (körs vid start och vid inloggning)
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Om användaren inte har något visningsnamn ännu
      if (!user.displayName) {
        let storedName = localStorage.getItem("displayName");
        let name = storedName;
  
        // Fråga användaren om namn om det inte redan finns sparat
        if (!name) {
          name = prompt("Ange ditt namn:");
          while (!name || name.trim() === "") {
            name = prompt("Du måste ange ett namn:");
          }
          name = name.trim();
        }
  
        // 🔍 Kontrollera i Firestore att namnet inte redan används
        const existingUser = await getDoc(doc(db, "users", name.toLowerCase()));
        if (existingUser.exists()) {
          alert("Namnet används redan. Välj ett annat!");
          localStorage.removeItem("displayName");
          window.location.reload(); // starta om flödet
          return;
        }
  
        // ✅ Uppdatera användarens profil i Firebase Auth
        await updateProfile(user, { displayName: name });
  
        // 💾 Spara namnet i localStorage för nästa gång
        localStorage.setItem("displayName", name);
  
        // 📂 Skapa användarpost i Firestore
        await setDoc(doc(db, "users", name.toLowerCase()), {
          uid: user.uid,
          name: name,
          createdAt: new Date().toISOString()
        });
  
        console.log(`✅ Ny användare skapad och inloggad: ${name}`);
      } else {
        // Användaren har redan ett namn
        localStorage.setItem("displayName", user.displayName);
        console.log(`✅ Inloggad som: ${user.displayName}`);
      }
    } else {
      // Ingen användare inloggad ännu → logga in anonymt
      console.log("🔐 Ingen användare – loggar in anonymt...");
      await signInAnonymously(auth);
    }
  });
  
  // 🛰️ Offline-stöd (för Firestore)
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("⚠️ Kunde inte aktivera offline-stöd:", err.code);
  });