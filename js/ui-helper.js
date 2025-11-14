// Denna fil hanterar hjälpfunktioner som inte direkt samarbetar med någon annan del i någon annan fil - de är självständiga //

/** Sätter en status- eller feltext i UI:t */
export function setMsg(el, text, cls = "muted") {
    if (el) {
      el.textContent = text;
      el.className = cls;
    }
  }
  
  /** Returnerar dagens datum i ISO-format (yyyy-mm-dd) */
export function today() {
    return new Date().toISOString().split("T")[0];
  }
  
/** Uppdaterar dropdowns med aktuell status (ledig/pall-ID) */
export function refreshPlaceOptionLabels(assignPlaceSelect, inspectSelect, moveFromSelect, moveToSelect, places, locations) {
    const label = (pid) => {
      const loc = locations[pid];
      const suffix = (loc && loc.pallId) ? `— ${loc.pallId}` : "— (ledig)";
      return `${pid} ${suffix}`;
    };
  
    const rebuild = (selectEl) => {
      if (!selectEl) return;
      const current = selectEl.value;
      selectEl.innerHTML = "";
      places.forEach(pid => {
        const o = document.createElement("option");
        o.value = pid;
        o.textContent = label(pid);
        selectEl.appendChild(o);
      });
      if (current) selectEl.value = current;
    };
  
    rebuild(assignPlaceSelect);
    rebuild(inspectSelect);
    rebuild(moveFromSelect);
    rebuild(moveToSelect);
  }
  