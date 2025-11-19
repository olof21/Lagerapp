// Denna fil hanterar användargränssnitt som knapptryckningar osv //
  
// 1️⃣ Importera det du behöver
import { auth, db } from "./firebase-setup.js";
import { setMsg, today } from "./ui-helper.js";
import { 
  doc, getDoc, setDoc, onSnapshot, writeBatch, runTransaction, collection, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { logAction } from "./logger.js";
import { initAuth } from './auth-handler.js';
import { reservePalletId, createPalletInFirestore } from "./pallet-handler.js";

// Start
initAuth(() => {
  console.log("Auth + namn klart. Startar appen...");
  startApp();
});

export function startApp() {
  console.log("Appen startar nu!");
}


// 2️⃣ Hämta DOM-referenser
const moveWhoInput      = document.getElementById("moveWhoInput");
const moveBtn           = document.getElementById("moveBtn");
const clearFromBtn           = document.getElementById("clearFromBtn");
const moveMsg           = document.getElementById("moveMsg");

const createPallIdInput = document.getElementById("createPallIdInput");
const createContentsInput = document.getElementById("createContentsInput");
const createSaveBtn     = document.getElementById("createSaveBtn");

// (DETTA ÄR EGENTLIGEN DEL AV "SKAPA PALL"-DELEN)  Aktivera/inaktivera "Spara pall" beroende på innehåll
createContentsInput?.addEventListener("input", () => {
  const valid = createContentsInput.value.trim().length >= 2;

  if (valid) {
    createSaveBtn.disabled = false;
    createSaveBtn.classList.remove("disabled");
  } else {
    createSaveBtn.disabled = true;
    createSaveBtn.classList.add("disabled");
  }
});

const createSaveMsg     = document.getElementById("createSaveMsg");

const assignPallIdInput = document.getElementById("assignPallIdInput");
const assignSaveBtn     = document.getElementById("assignSaveBtn");
const assignSaveMsg     = document.getElementById("assignSaveMsg");

const inspectBtn        = document.getElementById("inspectBtn");
const inspectSelect     = document.getElementById("inspectSelect");
const inspectResult     = document.getElementById("inspectResult");

const searchBtn         = document.getElementById("searchBtn");
const searchInput       = document.getElementById("searchInput");
const searchResults     = document.getElementById("searchResults");

const exportBtn         = document.getElementById("exportBtn");
const importInput       = document.getElementById("importInput");

const assignPlaceSelect = document.getElementById("assignPlaceSelect");
const moveFromSelect    = document.getElementById("moveFromSelect");
const moveToSelect      = document.getElementById("moveToSelect");

const createNewPalletBtn = document.getElementById("createNewPalletBtn");
const createPalletForm = document.getElementById("createPalletForm");

// Till "Redigera Pall"
const editPallIdInput = document.getElementById("editPallIdInput");
const editSearchBtn = document.getElementById("editSearchBtn");
const editArea = document.getElementById("editArea");
const editContentsInput = document.getElementById("editContentsInput");
const editSaveBtn = document.getElementById("editSaveBtn");
const editMsg = document.getElementById("editMsg");

// Disable "Spara pall" från början
createSaveBtn.disabled = true;
createSaveBtn.classList.add("disabled");


// 3️⃣ Datastrukturer
const pallets = {};
const locations = {};


// 4️⃣ Skapa statisk lista med alla platser
const places = [];
(function gen() {
  const S = ["L", "R"];
  for (const side of S)
    for (let r = 1; r <= 4; r++)
      for (let c = 1; c <= 3; c++)
        for (let h = 1; h <= 3; h++)
          places.push(`${side}-R${r}-C${c}-H${h}`);
})();
console.log("✅ Platser genererade:", places.length, "ex:", places.slice(0, 5));


// 5️⃣ Realtidsuppdatering — pallets
onSnapshot(collection(db, "pallets"), (snap) => {
  snap.docChanges().forEach(ch => {
    if (ch.type === "removed") delete pallets[ch.doc.id];
    else pallets[ch.doc.id] = ch.doc.data();
  });
});


// 6️⃣ Realtidsuppdatering — locations
onSnapshot(collection(db, "locations"), (snap) => {
  snap.docChanges().forEach(ch => {
    if (ch.type === "removed") delete locations[ch.doc.id];
    else locations[ch.doc.id] = ch.doc.data();
  });

  // Kombinera statiska plats-ID med lagrade pall-data
  const placeObjects = places.map(id => ({
    id,
    pallId: locations[id]?.pallId || ""
  }));

  // Uppdatera dropdowns
  fillAssignPlaceSelect(placeObjects);
  fillMoveFromSelect(placeObjects);
  fillMoveToSelect(placeObjects);
  fillInspectSelect(placeObjects);
});


// === Funktioner ===


// ================================
//  TIMESTAMP FORMATTER
// ================================
function formatTimestamp(ts) {
  if (!ts) return "";
  const date = ts.toDate();
  const d = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const t = date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return `${d} kl ${t}`;
}

// ================================
// 1. SKAPA NY PALL
// ================================
createNewPalletBtn?.addEventListener("click", async () => {
  setMsg(createSaveMsg, "");

  try {
    // Reserv/ta bort ID från poolen
    const newId = await reservePalletId();

    createPallIdInput.value = newId;
    createContentsInput.value = "";
    createSaveBtn.disabled = true;
    createSaveBtn.classList.add("disabled");
    createPalletForm.style.display = "block";
    createContentsInput.focus();

  } catch (err) {
    console.error(err);
    setMsg(createSaveMsg, "❌ Kunde inte reservera pall-ID.", "muted err");
  }
});

createContentsInput?.addEventListener("input", () => {
  const hasContent = createContentsInput.value.trim().length >= 2;
  createSaveBtn.disabled = !hasContent;
  createSaveBtn.classList.toggle("disabled", !hasContent);
});

createSaveBtn?.addEventListener("click", async () => {
  setMsg(createSaveMsg, "");

  const id = createPallIdInput.value.trim();
  const contents = createContentsInput.value.trim();
  const who = auth.currentUser?.displayName || "okänd";

  if (!contents || contents.length < 2) {
    return setMsg(createSaveMsg, "❌ Du måste skriva vad som finns i pallen.", "muted err");
  }

  try {
    // Skapa pallen i Firestore
    await createPalletInFirestore(id, {
      contents,
      who,
      createdAt: serverTimestamp()
    });

    await logAction("Skapade pall", { pallId: id, contents });
    setMsg(createSaveMsg, `✅ Pall ${id} skapad.`, "ok");

  } catch (err) {
    console.error(err);
    setMsg(createSaveMsg, "❌ Kunde inte spara pallen.", "muted err");
  }
});


// ================================
// 2. TILLDELA PALL TILL PLATS
// ================================
async function assignPalletToPlace(pallId, placeId) {
  const ref = doc(db, "locations", placeId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  if (data.pallId) throw new Error("Platsen är redan upptagen");

  await setDoc(ref, {
    pallId,
    who: auth.currentUser?.displayName || "okänd",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

assignSaveBtn?.addEventListener("click", async () => {
  setMsg(assignSaveMsg, "");

  const pallId = assignPallIdInput.value.trim();
  const placeId = assignPlaceSelect.value;

  if (!pallId) {
    return setMsg(assignSaveMsg, "❌ Ange Pall-ID.", "muted err");
  }

  const pSnap = await getDoc(doc(db, "pallets", pallId));
  if (!pSnap.exists()) {
    return setMsg(assignSaveMsg, "❌ Det Pall-ID:t finns inte. Skapa pallen först.", "muted err");
  }

  try {
    await assignPalletToPlace(pallId, placeId);
    await logAction("Tilldelade pall till plats", { pallId, placeId });
    setMsg(assignSaveMsg, `✅ Plats ${placeId} har nu pall ${pallId}.`, "ok");
  } catch (err) {
    setMsg(assignSaveMsg, "❌ " + err.message, "muted err");
  }
});


// ================================
// 3. FLYTTA PALL
// ================================
moveBtn?.addEventListener("click", async () => {
  setMsg(moveMsg, "");

  const fromId = moveFromSelect?.value;
  const toId = moveToSelect?.value;
  const who = auth.currentUser?.displayName || "okänd";

  if (!fromId || !toId) return setMsg(moveMsg, "❌ Välj både 'Från' och 'Till'.", "muted err");
  if (fromId === toId) return setMsg(moveMsg, "❌ Samma plats.", "muted err");

  try {
    await runTransaction(db, async (tx) => {
      const fromRef = doc(db, "locations", fromId);
      const toRef = doc(db, "locations", toId);

      const fromSnap = await tx.get(fromRef);
      const toSnap = await tx.get(toRef);

      const fromData = fromSnap.data() || {};
      const toData = toSnap.data() || {};

      if (!fromData.pallId) throw new Error(`Ingen pall på ${fromId}.`);
      if (toData.pallId) throw new Error(`Till-platsen ${toId} är upptagen (${toData.pallId}).`);

      tx.set(fromRef, { pallId: "", who, updatedAt: serverTimestamp() });
      tx.set(toRef, { pallId: fromData.pallId, who, updatedAt: serverTimestamp() });
    });

    await logAction("Flyttade pall", { from: fromId, to: toId });
    setMsg(moveMsg, `✅ Flytt klar: ${fromId} → ${toId}`, "ok");

  } catch (e) {
    setMsg(moveMsg, `❌ ${e.message}`, "muted err");
  }
});


// ================================
// 4. TÖM PLATS
// ================================
clearFromBtn?.addEventListener("click", async () => {
  setMsg(moveMsg, "");

  const fromId = moveFromSelect.value;

  if (!fromId) return setMsg(moveMsg, "❌ Välj 'Från'-plats.", "muted err");

  const ref = doc(db, "locations", fromId);
  const snap = await getDoc(ref);
  const had = snap.exists() && snap.data().pallId;

  await setDoc(ref, {
    pallId: "",
    who: auth.currentUser?.displayName || "okänd",
    updatedAt: serverTimestamp()
  }, { merge: true });

  await logAction("Tömde plats", { placeId: fromId });

  setMsg(moveMsg, had ? `🧹 Tömde ${fromId}.` : `ℹ️ ${fromId} var redan tom.`, "muted");
});


// ================================
// 5. INSPEKTERA
// ================================
inspectBtn?.addEventListener("click", async () => {
  const placeId = inspectSelect.value;
  const loc = locations[placeId];

  if (!loc || !loc.pallId) {
    inspectResult.innerHTML = `
      <div class="result-item">
        <strong>${placeId}</strong>
        <div class="muted">Ingen pall registrerad här.</div>
      </div>`;
    return;
  }

  const p = pallets[loc.pallId] || {};

  inspectResult.innerHTML = `
    <div class="result-item">
      <strong>${placeId}</strong>
      <div>Pall-ID: ${loc.pallId}</div>
      <div>Innehåll: ${p.contents || "-"}</div>
      <div class="muted">
        Packad av ${p.who} den ${formatTimestamp(p.createdAt)}<br/>
        Flyttad av ${loc.who} den ${formatTimestamp(loc.updatedAt)}
      </div>
    </div>`;
});


// ================================
// 6. SÖK
// ================================
searchBtn?.addEventListener("click", () => {
  const q = (searchInput.value || "").trim().toLowerCase();
  if (!q) {
    searchResults.innerHTML = `<div class="muted">Skriv något att söka på.</div>`;
    return;
  }

  const matching = Object.entries(pallets)
    .filter(([id, info]) => (info?.contents || "").toLowerCase().includes(q))
    .map(([id]) => id);

  const hits = [];
  for (const [placeId, loc] of Object.entries(locations)) {
    if (matching.includes(loc.pallId)) {
      const p = pallets[loc.pallId] || {};
      hits.push({
        placeId,
        pallId: loc.pallId,
        contents: p.contents,
        packedBy: p.who,
        createdAt: p.createdAt,
        storedBy: loc.who,
        updatedAt: loc.updatedAt
      });
    }
  }

  if (!hits.length) {
    searchResults.innerHTML = `<div class="muted">Inget hittades för "${q}".</div>`;
    return;
  }

  searchResults.innerHTML = hits.map(h => `
    <div class="result-item">
      <strong>${h.placeId}</strong>
      <div>Pall-ID: ${h.pallId}</div>
      <div>Innehåll: ${h.contents}</div>
      <div class="muted">
        Packad av ${h.packedBy} den ${formatTimestamp(h.createdAt)}<br/>
        FLyttad av ${h.storedBy} den ${formatTimestamp(h.updatedAt)}
      </div>
    </div>
  `).join("");
});


// ================================
// Redigera pall
// ================================
editSearchBtn?.addEventListener("click", async () => {
  setMsg(editMsg, "");

  const id = editPallIdInput.value.trim();
  if (!id) return setMsg(editMsg, "❌ Ange ett pall-ID.", "muted err");

  try {
    const ref = doc(db, "pallets", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      editArea.style.display = "none";
      return setMsg(editMsg, "❌ Det pall-ID:t finns inte.", "muted err");
    }

    editContentsInput.value = snap.data().contents || "";
    editArea.style.display = "block";
    editContentsInput.focus();

  } catch (err) {
    console.error(err);
    setMsg(editMsg, "❌ Kunde inte läsa pall.", "muted err");
  }
});

editSaveBtn?.addEventListener("click", async () => {
  setMsg(editMsg, "");

  const id = editPallIdInput.value.trim();
  const contents = editContentsInput.value.trim();
  const who = auth.currentUser?.displayName || "okänd";

  if (!contents || contents.length < 2) {
    return setMsg(editMsg, "❌ Innehållet är för kort.", "muted err");
  }

  try {
    await setDoc(doc(db, "pallets", id), {
      contents,
      who,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await logAction("Redigerade pall", { pallId: id, contents });
    setMsg(editMsg, `✅ Pall ${id} uppdaterad!`, "ok");

  } catch (err) {
    console.error(err);
    setMsg(editMsg, "❌ Kunde inte spara ändringarna.", "muted err");
  }
});


// ================================
// Select-fyllare (ingen ändring behövs här)
// ================================
function fillAssignPlaceSelect(placeObjects) {
  assignPlaceSelect.innerHTML = "";
  placeObjects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    if (p.pallId) {
      opt.textContent = p.id;
      opt.disabled = true;
      opt.classList.add("place-occupied");
    } else {
      opt.textContent = p.id;
    }
    assignPlaceSelect.appendChild(opt);
  });
}

function fillMoveFromSelect(placeObjects) {
  moveFromSelect.innerHTML = "";
  placeObjects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    if (!p.pallId) {
      opt.textContent = p.id;
      opt.disabled = true;
      opt.classList.add("place-empty");
    } else {
      opt.textContent = `${p.id} (${p.pallId})`;
    }
    moveFromSelect.appendChild(opt);
  });
}

function fillMoveToSelect(placeObjects) {
  moveToSelect.innerHTML = "";
  placeObjects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    if (p.pallId) {
      opt.textContent = p.id;
      opt.disabled = true;
      opt.classList.add("place-occupied");
    } else {
      opt.textContent = p.id;
    }
    moveToSelect.appendChild(opt);
  });
}

function fillInspectSelect(placeObjects) {
  inspectSelect.innerHTML = "";
  placeObjects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;

    if (p.pallId) {
      opt.textContent = `${p.id} (${p.pallId})`;
      opt.classList.add("place-occupied");
    } else {
      opt.textContent = p.id;
      opt.classList.add("place-empty");
    }

    inspectSelect.appendChild(opt);
  });
}
