// Rendert alle Ansichten (Aufgaben, Notizen, Stundenplan, Fächer/Projekte),
// den Mini-Kalender im Header und alle generischen Modals.

const Views = (() => {
  const WEEKDAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const HOUR_START = 7, HOUR_END = 21, HOUR_HEIGHT = 48;

  let currentNoteId = null;
  let calMonth = startOfMonth(new Date());
  let currentWeekStart = mondayOf(new Date());

  // ---------- Helpers ----------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
  function isoDate(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function mondayOf(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function openModal(title, bodyHtml, onMount) {
    const backdrop = document.getElementById("modalBackdrop");
    const modal = document.getElementById("modal");
    modal.innerHTML = `<h2>${title}</h2>${bodyHtml}`;
    backdrop.classList.remove("hidden");
    if (onMount) onMount(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
  }
  function closeModal() { document.getElementById("modalBackdrop").classList.add("hidden"); }

  function subjectOptionsHtml(selectedId, includeAddNew) {
    let html = `<option value="">Kein Fach / Projekt</option>`;
    for (const s of State.data.subjects) {
      html += `<option value="${s.id}" ${s.id === selectedId ? "selected" : ""}>${escapeHtml(s.name)}</option>`;
    }
    if (includeAddNew) html += `<option value="__new__">+ Neues Fach / Projekt …</option>`;
    return html;
  }
  function wireInlineSubjectAdd(selectEl, newFieldsEl) {
    selectEl.addEventListener("change", () => {
      newFieldsEl.classList.toggle("hidden", selectEl.value !== "__new__");
    });
  }
  function resolveSubjectSelection(selectEl, newNameEl, newColorEl) {
    if (selectEl.value === "__new__") {
      const name = newNameEl.value.trim();
      if (!name) return null;
      return State.addSubject(name, newColorEl.value).id;
    }
    return selectEl.value || null;
  }

  // ================= MINI-KALENDER (Kopfzeile) =================
  function renderMiniCalendar() {
    const pop = document.getElementById("miniCalPopover");
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayIso = isoDate(new Date());

    let cells = "";
    for (let i = 0; i < startOffset; i++) cells += `<div class="mc-cell mc-empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = isoDate(new Date(y, m, day));
      const dueTasks = State.data.tasks.filter((t) => t.dueDate === iso);
      let dot = "";
      if (dueTasks.length > 0) {
        const subj = dueTasks[0].subjectId ? State.subjectById(dueTasks[0].subjectId) : null;
        dot = `<i class="mc-dot" style="background:${subj ? subj.colorHex : "#999"}"></i>`;
      }
      cells += `<div class="mc-cell ${iso === todayIso ? "mc-today" : ""}" data-date="${iso}"><span>${day}</span>${dot}</div>`;
    }

    pop.innerHTML = `
      <div class="mc-header">
        <button id="mcPrev">‹</button>
        <span>${MONTH_NAMES[m]} ${y}</span>
        <button id="mcNext">›</button>
      </div>
      <div class="mc-weekdays">${WEEKDAY_NAMES.map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="mc-grid">${cells}</div>
    `;
    pop.querySelector("#mcPrev").addEventListener("click", () => { calMonth = new Date(y, m - 1, 1); renderMiniCalendar(); });
    pop.querySelector("#mcNext").addEventListener("click", () => { calMonth = new Date(y, m + 1, 1); renderMiniCalendar(); });
    pop.querySelectorAll(".mc-cell[data-date]").forEach((cell) => {
      cell.addEventListener("click", () => showDayTasksPopup(cell.dataset.date));
    });
  }

  function showDayTasksPopup(dateIso) {
    const tasks = State.data.tasks.filter((t) => t.dueDate === dateIso);
    const label = new Date(dateIso + "T00:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    const itemsHtml = tasks.length
      ? tasks.map((t) => {
          const subj = t.subjectId ? State.subjectById(t.subjectId) : null;
          return `<div class="day-popup-item">
            <input type="checkbox" ${t.done ? "checked" : ""} data-task="${t.id}">
            <span class="${t.done ? "done-text" : ""}">${escapeHtml(t.title)}</span>
            ${subj ? `<span class="subject-pill" style="background:${subj.colorHex}">${escapeHtml(subj.name)}</span>` : ""}
          </div>`;
        }).join("")
      : `<p class="empty-hint">Keine Aufgaben an diesem Tag.</p>`;

    openModal(label, `<div class="day-popup">${itemsHtml}</div><div class="modal-actions"><button class="btn btn-ghost" id="dayPopupClose">Schliessen</button></div>`, (modal) => {
      modal.querySelectorAll('input[type="checkbox"][data-task]').forEach((cb) => {
        cb.addEventListener("change", (e) => State.updateTask(cb.dataset.task, { done: e.target.checked }));
      });
      modal.querySelector("#dayPopupClose").onclick = closeModal;
    });
    document.getElementById("miniCalPopover").classList.add("hidden");
  }

  // ================= AUFGABEN =================
  function renderTasks() {
    const tbody = document.getElementById("taskTableBody");
    const emptyHint = document.getElementById("taskEmptyHint");
    const tasks = State.sortedTasks();
    tbody.innerHTML = "";
    emptyHint.classList.toggle("hidden", tasks.length > 0);
    const todayStr = isoDate(new Date());

    for (const task of tasks) {
      const subject = task.subjectId ? State.subjectById(task.subjectId) : null;
      const tr = document.createElement("tr");
      if (task.done) tr.classList.add("done");
      const dueClass = task.dueDate && task.dueDate <= todayStr && !task.done ? "due-soon" : "";

      const attachmentHtml = task.attachment
        ? `<a href="${task.attachment.url}" target="_blank" rel="noopener" class="attachment-link">📎 ${escapeHtml(task.attachment.name)}</a>`
        : "";

      tr.innerHTML = `
        <td class="col-subject">${subject ? `<span class="subject-pill" style="background:${subject.colorHex}">${escapeHtml(subject.name)}</span>` : ""}</td>
        <td class="col-title">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-attachment-row">
            ${attachmentHtml}
            <button class="icon-btn attachment-add-btn" title="Anhang hinzufügen/ändern">🔗</button>
          </div>
        </td>
        <td class="col-assignee">${escapeHtml(task.assignee || "")}</td>
        <td class="col-date ${dueClass}">${task.dueDate ? formatDate(task.dueDate) : ""}</td>
        <td class="col-done"><input type="checkbox" ${task.done ? "checked" : ""}></td>
        <td class="col-actions"><button class="icon-btn" title="Löschen">✕</button></td>
      `;
      tr.querySelector(".col-done input").addEventListener("change", (e) => State.updateTask(task.id, { done: e.target.checked }));
      tr.querySelector(".col-actions .icon-btn").addEventListener("click", () => { if (confirm("Aufgabe löschen?")) State.deleteTask(task.id); });
      tr.querySelector(".attachment-add-btn").addEventListener("click", () => openAttachmentModal(task));
      tbody.appendChild(tr);
    }
  }

  function openAttachmentModal(task) {
    openModal("Anhang für Aufgabe", `
      <label>Option 1: Link einfügen</label>
      <input type="text" id="attLinkInput" placeholder="https://..." value="${task.attachment && task.attachment.type === "link" ? escapeHtml(task.attachment.url) : ""}">
      <label>Option 2: Datei hochladen (max. 4 MB, landet in deinem OneDrive-App-Ordner)</label>
      <input type="file" id="attFileInput">
      <p id="attStatus" style="font-size:0.8rem;color:var(--text-secondary);"></p>
      <div class="modal-actions">
        ${task.attachment ? `<button class="btn btn-danger" id="attRemove">Anhang entfernen</button>` : ""}
        <button class="btn btn-ghost" id="attCancel">Abbrechen</button>
        <button class="btn btn-primary" id="attSave">Speichern</button>
      </div>
    `, (modal) => {
      modal.querySelector("#attCancel").onclick = closeModal;
      const removeBtn = modal.querySelector("#attRemove");
      if (removeBtn) removeBtn.onclick = () => { State.updateTask(task.id, { attachment: null }); closeModal(); };
      modal.querySelector("#attSave").onclick = async () => {
        const fileInput = modal.querySelector("#attFileInput");
        const linkInput = modal.querySelector("#attLinkInput");
        const statusEl = modal.querySelector("#attStatus");
        if (fileInput.files && fileInput.files[0]) {
          statusEl.textContent = "Lade hoch …";
          try {
            const result = await Storage.uploadFile(fileInput.files[0]);
            State.updateTask(task.id, { attachment: result });
            closeModal();
          } catch (err) {
            statusEl.textContent = err.message;
          }
        } else if (linkInput.value.trim()) {
          State.updateTask(task.id, { attachment: { type: "link", url: linkInput.value.trim(), name: linkInput.value.trim() } });
          closeModal();
        } else {
          closeModal();
        }
      };
    });
  }

  function openAddTaskModal() {
    openModal("Neue Aufgabe", `
      <label>Fach / Projekt</label>
      <select id="taskSubject">${subjectOptionsHtml(null, true)}</select>
      <div id="taskNewSubjectFields" class="hidden">
        <label>Name des neuen Fachs / Projekts</label>
        <input type="text" id="taskNewSubjectName">
        <label>Farbe</label>
        <input type="color" id="taskNewSubjectColor" value="#4A90D9">
      </div>
      <label>Auftrag</label>
      <input type="text" id="taskTitle" placeholder="z. B. Übungsblatt 3 lösen">
      <label>Zuständige Person (optional)</label>
      <input type="text" id="taskAssignee" placeholder="z. B. du selbst, Teampartner ...">
      <label>Deadline</label>
      <input type="date" id="taskDate">
      <div class="modal-actions">
        <button class="btn btn-ghost" id="taskCancel">Abbrechen</button>
        <button class="btn btn-primary" id="taskSave">Speichern</button>
      </div>
    `, (modal) => {
      const select = modal.querySelector("#taskSubject");
      wireInlineSubjectAdd(select, modal.querySelector("#taskNewSubjectFields"));
      modal.querySelector("#taskCancel").onclick = closeModal;
      modal.querySelector("#taskSave").onclick = () => {
        const title = modal.querySelector("#taskTitle").value.trim();
        if (!title) return;
        const subjectId = resolveSubjectSelection(select, modal.querySelector("#taskNewSubjectName"), modal.querySelector("#taskNewSubjectColor"));
        State.addTask({
          title,
          subjectId,
          assignee: modal.querySelector("#taskAssignee").value.trim(),
          dueDate: modal.querySelector("#taskDate").value || null
        });
        closeModal();
      };
      modal.querySelector("#taskTitle").focus();
    });
  }

  // ================= NOTIZEN =================
  function renderNotesList() {
    const list = document.getElementById("notesList");
    const emptyHint = document.getElementById("notesEmptyHint");
    const notes = [...State.data.notes].sort((a, b) => b.updatedAt - a.updatedAt);
    list.innerHTML = "";
    emptyHint.classList.toggle("hidden", notes.length > 0);
    for (const note of notes) {
      const subject = note.subjectId ? State.subjectById(note.subjectId) : null;
      const li = document.createElement("li");
      li.className = "note-card";
      if (subject) li.style.borderLeftColor = subject.colorHex;
      li.innerHTML = `
        <div class="note-card-title">${escapeHtml(note.title) || "Ohne Titel"}</div>
        <div class="note-card-meta">${subject ? escapeHtml(subject.name) + " · " : ""}${new Date(note.updatedAt).toLocaleDateString("de-CH")}</div>
      `;
      li.addEventListener("click", () => openNoteFullscreen(note.id));
      list.appendChild(li);
    }
  }

  function openNoteFullscreen(id) {
    currentNoteId = id;
    const note = State.data.notes.find((n) => n.id === id);
    if (!note) return;
    document.getElementById("noteFullscreen").classList.remove("hidden");
    document.getElementById("noteTitleInput").value = note.title;
    document.getElementById("noteSubjectSelect").innerHTML = subjectOptionsHtml(note.subjectId, false);
    const container = document.getElementById("noteCanvasContainer");
    createNoteCanvas(container, note, (elements) => State.updateNote(note.id, { elements }));
  }
  function closeNoteFullscreen() {
    document.getElementById("noteFullscreen").classList.add("hidden");
    currentNoteId = null;
    renderNotesList();
  }
  function addNoteAndOpen() {
    const note = State.addNote("", null);
    renderNotesList();
    openNoteFullscreen(note.id);
  }

  // ================= STUNDENPLAN (Wochenraster) =================
  function renderTimetable() {
    const grid = document.getElementById("weekGrid");
    const label = document.getElementById("weekLabel");
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
    label.textContent = `${fmt(currentWeekStart)} – ${fmt(weekEnd)} ${weekEnd.getFullYear()}`;

    let headerHtml = `<div class="wg-gutter-cell"></div>`;
    let deadlineHtml = `<div class="wg-gutter-cell"></div>`;
    let columnsHtml = "";
    const todayIso = isoDate(new Date());

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      const iso = isoDate(date);
      const weekdayNum = i + 1;

      headerHtml += `<div class="wg-day-header ${iso === todayIso ? "wg-today" : ""}">${WEEKDAY_NAMES[i]}<span class="wg-date">${fmt(date)}</span></div>`;

      const dueTasks = State.data.tasks.filter((t) => t.dueDate === iso);
      const chips = dueTasks.map((t) => {
        const subj = t.subjectId ? State.subjectById(t.subjectId) : null;
        return `<span class="wg-deadline-chip" style="background:${subj ? subj.colorHex : "#999"}" data-date="${iso}" title="${escapeHtml(t.title)}">${escapeHtml(t.title.slice(0, 14))}</span>`;
      }).join("");
      deadlineHtml += `<div class="wg-deadline-cell">${chips}</div>`;

      const entries = State.data.timetable.filter((e) => e.weekday === weekdayNum);
      let blocksHtml = "";
      for (const entry of entries) {
        const subj = entry.subjectId ? State.subjectById(entry.subjectId) : null;
        const startMin = toMinutes(entry.startTime), endMin = toMinutes(entry.endTime);
        const top = (startMin - HOUR_START * 60) * (HOUR_HEIGHT / 60);
        const height = Math.max(18, (endMin - startMin) * (HOUR_HEIGHT / 60));
        blocksHtml += `<div class="wg-entry" data-id="${entry.id}" style="top:${top}px;height:${height}px;background:${subj ? subj.colorHex : "#999"}">
          <div class="wg-entry-title">${subj ? escapeHtml(subj.name) : "Ohne Fach"}</div>
          <div class="wg-entry-meta">${entry.startTime}–${entry.endTime}${entry.room ? " · " + escapeHtml(entry.room) : ""}</div>
        </div>`;
      }
      columnsHtml += `<div class="wg-day-col">${blocksHtml}</div>`;
    }

    let gutterHtml = "";
    for (let h = HOUR_START; h < HOUR_END; h++) {
      gutterHtml += `<div class="wg-hour-label" style="height:${HOUR_HEIGHT}px">${String(h).padStart(2, "0")}:00</div>`;
    }

    grid.innerHTML = `
      <div class="wg-header-row">${headerHtml}</div>
      <div class="wg-deadline-row">${deadlineHtml}</div>
      <div class="wg-body">
        <div class="wg-gutter">${gutterHtml}</div>
        <div class="wg-columns" style="height:${(HOUR_END - HOUR_START) * HOUR_HEIGHT}px">${columnsHtml}</div>
      </div>
    `;

    grid.querySelectorAll(".wg-deadline-chip").forEach((chip) => chip.addEventListener("click", () => showDayTasksPopup(chip.dataset.date)));
    grid.querySelectorAll(".wg-entry").forEach((block) => {
      block.addEventListener("click", () => {
        const entry = State.data.timetable.find((e) => e.id === block.dataset.id);
        if (!entry) return;
        const subj = entry.subjectId ? State.subjectById(entry.subjectId) : null;
        if (confirm(`"${subj ? subj.name : "Termin"}" (${entry.startTime}–${entry.endTime}) löschen?`)) State.deleteTimetableEntry(entry.id);
      });
    });
  }

  function openAddTimetableModal() {
    openModal("Neuer Termin (wöchentlich wiederkehrend)", `
      <label>Fach / Projekt</label>
      <select id="ttSubject">${subjectOptionsHtml(null, true)}</select>
      <div id="ttNewSubjectFields" class="hidden">
        <label>Name</label>
        <input type="text" id="ttNewSubjectName">
        <label>Farbe</label>
        <input type="color" id="ttNewSubjectColor" value="#4A90D9">
      </div>
      <label>Wochentag</label>
      <select id="ttWeekday">
        <option value="1">Montag</option><option value="2">Dienstag</option><option value="3">Mittwoch</option>
        <option value="4">Donnerstag</option><option value="5">Freitag</option><option value="6">Samstag</option><option value="7">Sonntag</option>
      </select>
      <label>Start</label>
      <input type="time" id="ttStart" value="08:00">
      <label>Ende</label>
      <input type="time" id="ttEnd" value="09:00">
      <label>Raum (optional)</label>
      <input type="text" id="ttRoom">
      <div class="modal-actions">
        <button class="btn btn-ghost" id="ttCancel">Abbrechen</button>
        <button class="btn btn-primary" id="ttSave">Speichern</button>
      </div>
    `, (modal) => {
      const select = modal.querySelector("#ttSubject");
      wireInlineSubjectAdd(select, modal.querySelector("#ttNewSubjectFields"));
      modal.querySelector("#ttCancel").onclick = closeModal;
      modal.querySelector("#ttSave").onclick = () => {
        const subjectId = resolveSubjectSelection(select, modal.querySelector("#ttNewSubjectName"), modal.querySelector("#ttNewSubjectColor"));
        State.addTimetableEntry({
          subjectId,
          weekday: Number(modal.querySelector("#ttWeekday").value),
          startTime: modal.querySelector("#ttStart").value,
          endTime: modal.querySelector("#ttEnd").value,
          room: modal.querySelector("#ttRoom").value.trim()
        });
        closeModal();
      };
    });
  }

  // ================= FÄCHER / PROJEKTE (Gesamtübersicht) =================
  function renderSubjectsOverview() {
    const container = document.getElementById("subjectOverview");
    const filterSelect = document.getElementById("subjectFilter");
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = `<option value="">Alle Fächer</option>` + State.data.subjects.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
    filterSelect.value = currentFilter;

    const subjectsToShow = currentFilter ? State.data.subjects.filter((s) => s.id === currentFilter) : State.data.subjects;
    container.innerHTML = "";
    if (subjectsToShow.length === 0) {
      container.innerHTML = `<p class="empty-hint">Noch keine Fächer. Leg mit "+ Neu" los.</p>`;
      return;
    }

    for (const subject of subjectsToShow) {
      const notes = State.data.notes.filter((n) => n.subjectId === subject.id);
      const tasks = State.data.tasks.filter((t) => t.subjectId === subject.id);
      const entries = State.data.timetable.filter((e) => e.subjectId === subject.id);

      const card = document.createElement("div");
      card.className = "subject-card";
      card.style.borderLeftColor = subject.colorHex;
      card.innerHTML = `
        <div class="subject-card-header">
          <span class="dot" style="background:${subject.colorHex}"></span>
          <span class="subject-card-name">${escapeHtml(subject.name)}</span>
          <input type="color" value="${subject.colorHex}" title="Farbe ändern">
          <button class="icon-btn" title="Fach löschen">✕</button>
        </div>
        <div class="subject-card-body">
          <div class="subject-col">
            <h4>Notizen (${notes.length})</h4>
            ${notes.length ? notes.map((n) => `<div class="subject-item" data-note="${n.id}">${escapeHtml(n.title) || "Ohne Titel"}</div>`).join("") : `<p class="empty-hint-sm">–</p>`}
          </div>
          <div class="subject-col">
            <h4>Aufgaben (${tasks.length})</h4>
            ${tasks.length ? tasks.map((t) => `<div class="subject-item ${t.done ? "done" : ""}">${escapeHtml(t.title)}${t.dueDate ? " · " + formatDate(t.dueDate) : ""}${t.attachment ? ` · <a href="${t.attachment.url}" target="_blank" rel="noopener">📎</a>` : ""}</div>`).join("") : `<p class="empty-hint-sm">–</p>`}
          </div>
          <div class="subject-col">
            <h4>Stundenplan (${entries.length})</h4>
            ${entries.length ? entries.map((e) => `<div class="subject-item">${WEEKDAY_NAMES[e.weekday - 1]} ${e.startTime}–${e.endTime}${e.room ? " · " + escapeHtml(e.room) : ""}</div>`).join("") : `<p class="empty-hint-sm">–</p>`}
          </div>
        </div>
      `;
      card.querySelector('input[type="color"]').addEventListener("input", (e) => State.updateSubject(subject.id, { colorHex: e.target.value }));
      card.querySelector(".subject-card-header .icon-btn").addEventListener("click", () => {
        if (confirm(`"${subject.name}" löschen? (Aufgaben/Notizen/Termine bleiben erhalten, nur ohne Fach)`)) State.deleteSubject(subject.id);
      });
      card.querySelectorAll(".subject-item[data-note]").forEach((el) => el.addEventListener("click", () => openNoteFullscreen(el.dataset.note)));
      container.appendChild(card);
    }
  }

  function openAddSubjectModal() {
    openModal("Neues Fach / Projekt", `
      <label>Name</label>
      <input type="text" id="subjName" placeholder="z. B. Analysis I">
      <label>Farbe</label>
      <input type="color" id="subjColor" value="#4A90D9">
      <div class="modal-actions">
        <button class="btn btn-ghost" id="subjCancel">Abbrechen</button>
        <button class="btn btn-primary" id="subjSave">Speichern</button>
      </div>
    `, (modal) => {
      modal.querySelector("#subjCancel").onclick = closeModal;
      modal.querySelector("#subjSave").onclick = () => {
        const name = modal.querySelector("#subjName").value.trim();
        if (!name) return;
        State.addSubject(name, modal.querySelector("#subjColor").value);
        closeModal();
      };
      modal.querySelector("#subjName").focus();
    });
  }

  // ================= Einmalige Verdrahtung statischer Elemente =================
  document.getElementById("noteTitleInput").addEventListener("input", (e) => {
    if (currentNoteId) State.updateNote(currentNoteId, { title: e.target.value });
  });
  document.getElementById("noteSubjectSelect").addEventListener("change", (e) => {
    if (currentNoteId) State.updateNote(currentNoteId, { subjectId: e.target.value || null });
  });
  document.getElementById("noteBackBtn").addEventListener("click", closeNoteFullscreen);
  document.getElementById("noteDeleteBtn").addEventListener("click", () => {
    if (!currentNoteId) return;
    if (confirm("Notiz löschen?")) { State.deleteNote(currentNoteId); closeNoteFullscreen(); }
  });

  document.getElementById("weekPrevBtn").addEventListener("click", () => { currentWeekStart.setDate(currentWeekStart.getDate() - 7); renderTimetable(); });
  document.getElementById("weekNextBtn").addEventListener("click", () => { currentWeekStart.setDate(currentWeekStart.getDate() + 7); renderTimetable(); });
  document.getElementById("weekTodayBtn").addEventListener("click", () => { currentWeekStart = mondayOf(new Date()); renderTimetable(); });

  document.getElementById("subjectFilter").addEventListener("change", renderSubjectsOverview);

  const miniCalToggle = document.getElementById("miniCalToggle");
  const miniCalPopover = document.getElementById("miniCalPopover");
  miniCalToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    miniCalPopover.classList.toggle("hidden");
    if (!miniCalPopover.classList.contains("hidden")) renderMiniCalendar();
  });
  document.addEventListener("click", (e) => {
    if (!miniCalPopover.classList.contains("hidden") && !miniCalPopover.contains(e.target) && e.target !== miniCalToggle) {
      miniCalPopover.classList.add("hidden");
    }
  });

  function renderAll() {
    renderTasks();
    renderNotesList();
    renderTimetable();
    renderSubjectsOverview();
    if (!miniCalPopover.classList.contains("hidden")) renderMiniCalendar();
  }

  return {
    renderAll, openAddTaskModal, openAddTimetableModal, openAddSubjectModal, addNoteAndOpen, closeModal
  };
})();
