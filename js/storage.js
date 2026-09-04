// Speichert / lädt die App-Daten:
//  1. Primär in OneDrive über Microsoft Graph, im isolierten App-Ordner
//     (Berechtigung "Files.ReadWrite.AppFolder" -> Ordner "/Apps/StudyApp/")
//  2. Zusätzlich immer sofort in localStorage als Offline-Zwischenspeicher.
//  3. Datei-Uploads (Aufgaben-Anhänge) landen im Unterordner "files/" desselben App-Ordners.

const Storage = (() => {
  const LOCAL_KEY = "studyapp-local-cache";
  const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
  let saveTimer = null;
  let statusEl = null;

  function setStatusEl(el) { statusEl = el; }
  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function saveLocal(data) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); }
    catch (e) { console.error("Lokales Speichern fehlgeschlagen", e); }
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function scheduleSave(data) {
    saveLocal(data);
    if (!Auth.isSignedIn()) { setStatus("Lokal gespeichert (nicht angemeldet)"); return; }
    clearTimeout(saveTimer);
    setStatus("Änderungen werden gespeichert …");
    saveTimer = setTimeout(() => saveToOneDrive(data), 1200);
  }

  async function saveToOneDrive(data) {
    try {
      const token = await Auth.getAccessToken();
      const url = `${GRAPH_BASE}/me/drive/special/approot:/${APP_CONFIG.dataFileName}:/content`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`OneDrive-Speichern fehlgeschlagen: ${res.status}`);
      setStatus("In OneDrive gespeichert · " + new Date().toLocaleTimeString("de-CH"));
    } catch (err) {
      console.error(err);
      setStatus("Konnte nicht mit OneDrive synchronisieren (lokal gesichert)");
    }
  }

  async function loadFromOneDrive() {
    const token = await Auth.getAccessToken();
    const url = `${GRAPH_BASE}/me/drive/special/approot:/${APP_CONFIG.dataFileName}:/content`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`OneDrive-Laden fehlgeschlagen: ${res.status}`);
    return res.json();
  }

  async function loadInitialData() {
    const local = loadLocal();
    if (Auth.isSignedIn()) {
      try {
        setStatus("Lade aus OneDrive …");
        const remote = await loadFromOneDrive();
        if (remote) { setStatus("Synchronisiert mit OneDrive"); return remote; }
        if (local) { await saveToOneDrive(local); return local; }
        return null;
      } catch (err) {
        console.error(err);
        setStatus("Offline – zeige lokal gespeicherten Stand");
        return local;
      }
    }
    return local;
  }

  // ---------- Datei-Anhänge für Aufgaben ----------
  // Einfacher Upload (Graph "PUT content"): geeignet für Dateien bis ca. 4 MB.
  // Für grössere Dateien: Datei stattdessen normal in OneDrive ablegen und den
  // Freigabe-Link über die "Link"-Option bei der Aufgabe eintragen.
  async function uploadFile(file) {
    if (!Auth.isSignedIn()) throw new Error("Bitte zuerst mit Microsoft anmelden.");
    if (file.size > 4 * 1024 * 1024) {
      throw new Error("Datei ist grösser als 4 MB. Bitte die Datei stattdessen in OneDrive ablegen und den Freigabe-Link einfügen.");
    }
    const token = await Auth.getAccessToken();
    const safeName = file.name.replace(/[#%&{}\\<>*?/$!'":@+`|=]/g, "_");
    const path = `files/${Date.now()}_${safeName}`;
    const url = `${GRAPH_BASE}/me/drive/special/approot:/${path}:/content`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream" },
      body: file
    });
    if (!res.ok) throw new Error(`Datei-Upload fehlgeschlagen: ${res.status}`);
    const json = await res.json();
    return { type: "file", url: json.webUrl, name: file.name };
  }

  return { scheduleSave, loadInitialData, setStatusEl, setStatus, saveToOneDrive, uploadFile };
})();
