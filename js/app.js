// Startet die App: Auth initialisieren, Daten laden, Navigation (inkl. verschiebbarer
// Reihenfolge der Reiter) & Buttons verdrahten.

(async function init() {
  const TAB_DEFS = {
    tasks: "Aufgaben",
    notes: "Notizen",
    timetable: "Stundenplan",
    subjects: "Fächer / Projekte"
  };

  const tabbar = document.getElementById("tabbar");

  function renderTabs() {
    const order = State.data.settings.tabOrder.filter((k) => TAB_DEFS[k]);
    // Falls neue Tab-Keys dazukommen, die noch nicht in gespeicherten Settings stehen:
    for (const key of Object.keys(TAB_DEFS)) if (!order.includes(key)) order.push(key);

    const currentActive = tabbar.querySelector(".tab.active")?.dataset.view || order[0];
    tabbar.innerHTML = "";
    order.forEach((key) => {
      const btn = document.createElement("button");
      btn.className = "tab" + (key === currentActive ? " active" : "");
      btn.dataset.view = key;
      btn.textContent = TAB_DEFS[key];
      tabbar.appendChild(btn);
    });
  }

  function switchToView(viewKey) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === viewKey));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${viewKey}`));
  }

  // ---------- Reiter per Ziehen neu anordnen (Pointer Events, funktioniert mit Maus & Touch) ----------
  function setupTabDragging() {
    let draggedEl = null, startX = 0, moved = false;

    tabbar.addEventListener("pointerdown", (e) => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      draggedEl = tab;
      startX = e.clientX;
      moved = false;
      tab.setPointerCapture(e.pointerId);
    });

    tabbar.addEventListener("pointermove", (e) => {
      if (!draggedEl) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (!moved) return;
      draggedEl.style.position = "relative";
      draggedEl.style.zIndex = "10";
      draggedEl.style.transform = `translateX(${dx}px)`;

      const siblings = [...tabbar.children];
      const draggedIndex = siblings.indexOf(draggedEl);
      const draggedRect = draggedEl.getBoundingClientRect();
      const draggedCenter = draggedRect.left + draggedRect.width / 2;

      for (const sib of siblings) {
        if (sib === draggedEl) continue;
        const rect = sib.getBoundingClientRect();
        const sibCenter = rect.left + rect.width / 2;
        const sibIndex = siblings.indexOf(sib);
        if (draggedIndex < sibIndex && draggedCenter > sibCenter) {
          tabbar.insertBefore(draggedEl, sib.nextSibling);
          startX = e.clientX;
          draggedEl.style.transform = "translateX(0px)";
          break;
        } else if (draggedIndex > sibIndex && draggedCenter < sibCenter) {
          tabbar.insertBefore(draggedEl, sib);
          startX = e.clientX;
          draggedEl.style.transform = "translateX(0px)";
          break;
        }
      }
    });

    function endDrag() {
      if (!draggedEl) return;
      draggedEl.style.transform = "";
      draggedEl.style.position = "";
      draggedEl.style.zIndex = "";
      if (moved) {
        const newOrder = [...tabbar.children].map((el) => el.dataset.view);
        State.setTabOrder(newOrder);
      } else {
        switchToView(draggedEl.dataset.view);
      }
      draggedEl = null;
      moved = false;
    }
    tabbar.addEventListener("pointerup", endDrag);
    tabbar.addEventListener("pointercancel", endDrag);
  }

  // ---------- Backup: Export/Import als JSON-Datei (eigene Idee, unabhängig von OneDrive) ----------
  document.getElementById("backupExportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(State.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studyapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  const backupImportInput = document.getElementById("backupImportInput");
  document.getElementById("backupImportBtn").addEventListener("click", () => backupImportInput.click());
  backupImportInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Achtung: Dies ersetzt alle aktuellen Daten in der App durch den Inhalt dieser Backup-Datei. Fortfahren?")) {
      backupImportInput.value = "";
      return;
    }
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      State.replaceAll(imported);
      renderTabs();
      Views.renderAll();
      alert("Backup erfolgreich wiederhergestellt.");
    } catch (err) {
      alert("Diese Datei konnte nicht gelesen werden (ungültiges JSON).");
    }
    backupImportInput.value = "";
  });

  // ---------- Escape schliesst Modal / Notiz-Vollbild ----------
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("modalBackdrop").classList.contains("hidden")) { Views.closeModal(); return; }
    const noteFullscreen = document.getElementById("noteFullscreen");
    if (!noteFullscreen.classList.contains("hidden")) document.getElementById("noteBackBtn").click();
  });

  // ---------- Buttons ----------
  document.getElementById("addTaskBtn").addEventListener("click", Views.openAddTaskModal);
  document.getElementById("addTimetableBtn").addEventListener("click", Views.openAddTimetableModal);
  document.getElementById("addSubjectBtn").addEventListener("click", Views.openAddSubjectModal);
  document.getElementById("addNoteBtn").addEventListener("click", Views.addNoteAndOpen);

  // ---------- State -> Views ----------
  State.onChange(() => Views.renderAll());

  // ---------- Sync-Status-Anzeige ----------
  Storage.setStatusEl(document.getElementById("syncStatus"));

  // ---------- Auth ----------
  const signInBtn = document.getElementById("signInBtn");
  const signOutBtn = document.getElementById("signOutBtn");

  function refreshAuthUI() {
    const signedIn = Auth.isSignedIn();
    signInBtn.classList.toggle("hidden", signedIn);
    signOutBtn.classList.toggle("hidden", !signedIn);
    if (signedIn) Storage.setStatus(`Angemeldet als ${Auth.getAccount().username}`);
  }

  signInBtn.addEventListener("click", async () => {
    try {
      await Auth.signIn();
      refreshAuthUI();
      await loadAndRender();
    } catch (err) {
      console.error(err);
      alert("Anmeldung fehlgeschlagen. Prüfe die Client-ID in js/config.js (siehe README).");
    }
  });
  signOutBtn.addEventListener("click", () => { Auth.signOut(); refreshAuthUI(); });

  async function loadAndRender() {
    const data = await Storage.loadInitialData();
    if (data) State.replaceAll(data);
    renderTabs();
    Views.renderAll();
  }

  renderTabs();
  setupTabDragging();

  try {
    await Auth.init();
  } catch (err) {
    console.error("MSAL-Initialisierung fehlgeschlagen — prüfe js/config.js", err);
    Storage.setStatus("Konfigurationsfehler (siehe Konsole / README)");
  }
  refreshAuthUI();
  await loadAndRender();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Service Worker nicht registriert:", e));
  }
})();
