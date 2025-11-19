// Fil till datum- och tidsstamps

export function nowDate() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }
  
  function nowTime() {
    return new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  }
  