// Denna fil hanterar användargränssnitt som knapptryckningar osv //
  
// 1️⃣ Importera det du behöver
import { auth, db } from "./firebase-setup.js";
import { setMsg, today, fillSelect, refreshPlaceOptionLabels } from "./ui-helpers.js";
import { 
  doc, getDoc, setDoc, onSnapshot, writeBatch, runTransaction 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { logAction } from "./logger.js";



// 2️⃣ Hämta DOM-referenser
const moveWhoInput      = document.getElementById("moveWhoInput");
const moveBtn           = document.getElementById("moveBtn");
const clearFromBtn      = document.getElementById("clearFromBtn");
const moveMsg           = document.getElementById("moveMsg");

const createPallIdInput = document.getElementById("createPallIdInput");
const createContentsInput = document.getElementById("createContentsInput");
const createWhoInput    = document.getElementById("createWhoInput");
const createSaveBtn     = document.getElementById("createSaveBtn");
const createSaveMsg     = document.getElementById("createSaveMsg");

const assignPallIdInput = document.getElementById("assignPallIdInput");
const assignWhoInput    = document.getElementById("assignWhoInput");
const assignSaveBtn     = document.getElementById("assignSaveBtn");
const assignSaveMsg     = document.getElementById("assignSaveMsg");

const inspectBtn        = document.getElementById("inspectBtn");
const inspectResult     = document.getElementById("inspectResult");

const searchBtn         = document.getElementById("searchBtn");
const searchInput       = document.getElementById("searchInput");
const searchResults     = document.getElementById("searchResults");

const exportBtn         = document.getElementById("exportBtn");
const importInput       = document.getElementById("importInput");

const assignPlaceSelect = document.getElementById("assignPlaceSelect");
const inspectSelect     = document.getElementById("inspectSelect");
const moveFromSelect    = document.getElementById("moveFromSelect");
const moveToSelect      = document.getElementById("moveToSelect");

// 3️⃣ Efter detta kan du börja skriva funktioner och logik
// t.ex. skapa pall, tilldela plats, flytta pall osv


// Skapa platser
const places = [];
(function gen() {
  const S = ["L", "R"];
  for (const side of S)
    for (let r = 1; r <= 4; r++)
      for (let c = 1; c <= 3; c++)
        for (let h = 1; h <= 3; h++)
          places.push(`${side}-R${r}-C${c}-H${h}`);
})();

// Hjälpfunktion för att fylla select-menyer
function fillSelect(el, arr) {
  if (!el) return;
  const current = el.value;
  el.innerHTML = "";
  arr.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    el.appendChild(o);
  });
  if (current) el.value = current; // försök behålla tidigare val
}

// Realtidsuppdatering
onSnapshot(collection(db, "pallets"), (snap) => {
  snap.docChanges().forEach(ch => {
    if (ch.type === "removed") delete pallets[ch.doc.id];
    else pallets[ch.doc.id] = ch.doc.data();
  });
});

onSnapshot(collection(db, "locations"), (snap) => {
  snap.docChanges().forEach(ch => {
    if (ch.type === "removed") delete locations[ch.doc.id];
    else locations[ch.doc.id] = ch.doc.data();
  });

  // ✅ Fyll dropdowns EFTER att locations laddats in
  fillSelect(assignPlaceSelect, places);
  fillSelect(inspectSelect, places);
  fillSelect(moveFromSelect, places);
  fillSelect(moveToSelect, places);
});
  
  // === Funktioner ===
  
  // 1. Skapa ny pall
  createSaveBtn?.addEventListener("click", async () => {
    setMsg(createSaveMsg, "");
    const id = createPallIdInput.value.trim();
    const contents = createContentsInput.value.trim();
    const who = auth.currentUser?.displayName || "okänd";
    if (!id) return setMsg(createSaveMsg, "❌ Du måste ange Pall-ID.", "muted err");
    if (!contents) return setMsg(createSaveMsg, "❌ Du måste ange innehåll.", "muted err");
    const ref = doc(db, "pallets", id);
    if ((await getDoc(ref)).exists()) return setMsg(createSaveMsg, "❌ Pall-ID finns redan.", "muted err");
    await setDoc(ref, { contents, who, createdDate: today() });
    await logAction("Skapade pall", { pallId: id, contents });

    setMsg(createSaveMsg, `✅ Pall ${id} skapad.`, "ok");
  });
  
  // 2. Tilldela pall till plats
  assignSaveBtn?.addEventListener("click", async () => {
    setMsg(assignSaveMsg, "");
    const pallId = assignPallIdInput.value.trim();
    const placeId = assignPlaceSelect.value;
    const who = auth.currentUser?.displayName || "okänd";
    if (!pallId) return setMsg(assignSaveMsg, "❌ Du måste ange Pall-ID.", "muted err");
    const pSnap = await getDoc(doc(db, "pallets", pallId));
    if (!pSnap.exists()) return setMsg(assignSaveMsg, "❌ Det Pall-ID:t finns inte. Skapa pallen först.", "muted err");
    const old = await getDoc(doc(db, "locations", placeId));
    const replaced = old.exists() && old.data().pallId ? ` (ersatte ${old.data().pallId})` : "";
    await setDoc(doc(db, "locations", placeId), { pallId, who, updated: today() });
    await logAction("Tilldelade pall till plats", { pallId, placeId });
    setMsg(assignSaveMsg, `✅ Plats ${placeId} har nu pall ${pallId}.${replaced}`, "ok");
  });
  
  // 3. Flytta pall
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
        tx.set(fromRef, { pallId: "", who: who || fromData.who || "", updated: today() });
        tx.set(toRef, { pallId: fromData.pallId, who: who || toData.who || "", updated: today() });
      });
      await logAction("Flyttade pall", { from: fromId, to: toId });
      setMsg(moveMsg, `✅ Flytt klar: ${fromId} → ${toId}`, "ok");
    } catch (e) {
      setMsg(moveMsg, `❌ ${e.message}`, "muted err");
    }
  });
  
  // 4. Töm från-plats
  clearFromBtn?.addEventListener("click", async () => {
    setMsg(moveMsg, "");
    const fromId = moveFromSelect?.value;
    const who = moveWhoInput?.value.trim();
    if (!fromId) return setMsg(moveMsg, "❌ Välj 'Från'-plats.", "muted err");
    const ref = doc(db, "locations", fromId);
    const snap = await getDoc(ref);
    const had = snap.exists() && snap.data().pallId;
    await setDoc(ref, { pallId: "", who: who || (snap.data()?.who || ""), updated: today() });
    await logAction("Tömde plats", { placeId: fromId });
    setMsg(moveMsg, had ? `🧹 Tömde ${fromId}.` : `ℹ️ ${fromId} var redan tom.`, "muted");
  });
  
  // 5. Inspektera plats
  inspectBtn?.addEventListener("click", async () => {
    const placeId = inspectSelect.value;
    const loc = locations[placeId];
    if (!loc || !loc.pallId) {
      inspectResult.innerHTML = `<div class="result-item"><strong>${placeId}</strong><div class="muted">Ingen pall registrerad här.</div></div>`;
      return;
    }
    const p = pallets[loc.pallId] || {};
    inspectResult.innerHTML = `
      <div class="result-item">
        <strong>${placeId}</strong>
        <div>Pall-ID: ${loc.pallId}</div>
        <div>Innehåll: ${p.contents || "-"}</div>
        <div class="muted">
          Packad av ${p.who || "okänd"} ${p.createdDate ? "den " + p.createdDate : ""}<br/>
          Inkörd av ${loc.who || "okänd"} ${loc.updated ? "den " + loc.updated : ""}
        </div>
      </div>`;
  });
  
  // 6. Sök
  searchBtn?.addEventListener("click", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) { searchResults.innerHTML = `<div class="muted">Skriv något att söka på.</div>`; return; }
  
    const matching = Object.entries(pallets)
      .filter(([id, info]) => (info?.contents || "").toLowerCase().includes(q))
      .map(([id]) => id);
  
    const hits = [];
    for (const [placeId, loc] of Object.entries(locations)) {
      if (matching.includes(loc.pallId)) {
        const p = pallets[loc.pallId] || {};
        hits.push({ placeId, pallId: loc.pallId, contents: p.contents, packedBy: p.who, packedDate: p.createdDate, storedBy: loc.who, storedDate: loc.updated });
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
          Packad av ${h.packedBy || "okänd"} ${h.packedDate ? "den " + h.packedDate : ""}<br/>
          Inkörd av ${h.storedBy || "okänd"} ${h.storedDate ? "den " + h.storedDate : ""}
        </div>
      </div>`).join("");
  });
  
  // 7. Exportera data
  exportBtn?.removeAttribute("disabled");
  exportBtn?.addEventListener("click", async () => {
    setMsg(moveMsg, "");
    try {
      const [palSnap, locSnap] = await Promise.all([
        getDocs(collection(db, "pallets")),
        getDocs(collection(db, "locations"))
      ]);
      const palletsOut = {};
      palSnap.forEach(d => palletsOut[d.id] = d.data());
      const locationsOut = {};
      locSnap.forEach(d => locationsOut[d.id] = d.data());
      const payload = { exportedAt: new Date().toISOString(), pallets: palletsOut, locations: locationsOut };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lagerapp-backup-${today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setMsg(moveMsg, `❌ Export misslyckades: ${e.message}`, "muted err");
    }
  });
  
  // 8. Importera data
  importInput?.removeAttribute("disabled");
  importInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(moveMsg, "⏳ Importerar…");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const palletsIn = data.pallets || {};
      const locationsIn = data.locations || {};
      const chunks = [];
      const writes = [];
  
      for (const [id, val] of Object.entries(palletsIn)) writes.push({ col: "pallets", id, val });
      for (const [id, val] of Object.entries(locationsIn)) writes.push({ col: "locations", id, val });
  
      const BATCH_LIMIT = 400;
      for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        chunks.push(writes.slice(i, i + BATCH_LIMIT));
      }
  
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(w => batch.set(doc(db, w.col, w.id), w.val));
        await batch.commit();
      }
  
      setMsg(moveMsg, `✅ Import klar: ${Object.keys(palletsIn).length} pallar, ${Object.keys(locationsIn).length} platser.`, "ok");
      e.target.value = ""; // nollställ input
    } catch (err) {
      setMsg(moveMsg, `❌ Import misslyckades: ${err.message}`, "muted err");
    }
  });