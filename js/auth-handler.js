// Hanterar inloggning, namn och användarregistrering

import { auth, db } from "./firebase-setup.js";
import {
  signInAnonymously,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Lyssna på Auth-status (körs vid start och vid inloggning)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Om användaren inte har något visningsnamn ännu
    if (!user.displayName) {
      let storedName = localStorage.getItem("displayName");
      let name = storedName;

      // Fråga användaren om namn om det inte redan finns sparat
      if (!name) {
        name = prompt("Ange ditt namn (t.ex. Aleksandra):");
        while (!name || name.trim() === "") {
          name = prompt("Du måste ange ett namn (t.ex. Aleksandra):");
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