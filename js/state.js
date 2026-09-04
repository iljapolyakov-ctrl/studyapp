// Zentraler Datenspeicher im Speicher (RAM) + einfacher Event-Bus, damit Views
// sich neu zeichnen, sobald sich Daten ändern.

const State = (() => {
  let data = {
    subjects: [],   // { id, name, colorHex }
    tasks: [],      // { id, title, subjectId, assignee, dueDate:'YYYY-MM-DD'|null, done, attachment:{type:'link'|'file',url,name}|null, createdAt }
    notes: [],      // { id, title, subjectId, elements:[{id,kind:'stroke'|'text',...}], updatedAt }
    timetable: [],  // { id, subjectId, weekday:1-7, startTime:'HH:MM', endTime:'HH:MM', room }
    settings: { tabOrder: ["tasks", "notes", "timetable", "subjects"] }
  };

  const listeners = [];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function onChange(fn) { listeners.push(fn); }
  function emitChange() {
    listeners.forEach((fn) => fn(data));
    Storage.scheduleSave(data);
  }

  function replaceAll(newData) {
    data = {
      subjects: newData.subjects || [],
      tasks: newData.tasks || [],
      notes: newData.notes || [],
      timetable: newData.timetable || [],
      settings: Object.assign({ tabOrder: ["tasks", "notes", "timetable", "subjects"] }, newData.settings || {})
    };
    listeners.forEach((fn) => fn(data));
  }

  // ---------- Subjects ----------
  function addSubject(name, colorHex) {
    const subject = { id: uid(), name, colorHex: colorHex || randomColor() };
    data.subjects.push(subject);
    emitChange();
    return subject;
  }
  function updateSubject(id, patch) {
    const s = data.subjects.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    emitChange();
  }
  function deleteSubject(id) {
    data.subjects = data.subjects.filter((x) => x.id !== id);
    emitChange();
  }

  // ---------- Tasks ----------
  function addTask(fields) {
    const task = {
      id: uid(),
      title: fields.title || "",
      subjectId: fields.subjectId || null,
      assignee: fields.assignee || "",
      dueDate: fields.dueDate || null,
      done: false,
      attachment: fields.attachment || null,
      createdAt: Date.now()
    };
    data.tasks.push(task);
    emitChange();
    return task;
  }
  function updateTask(id, patch) {
    const t = data.tasks.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
    emitChange();
  }
  function deleteTask(id) {
    data.tasks = data.tasks.filter((x) => x.id !== id);
    emitChange();
  }
  function sortedTasks() {
    return [...data.tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1; // erledigte ans Ende
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return a.createdAt - b.createdAt;
    });
  }
  function tasksByDate(isoDate) {
    return data.tasks.filter((t) => t.dueDate === isoDate);
  }

  // ---------- Notes (vereinheitlichtes Canvas: Freihand + Text gemischt) ----------
  function addNote(title, subjectId) {
    const note = { id: uid(), title: title || "", subjectId: subjectId || null, elements: [], updatedAt: Date.now() };
    data.notes.push(note);
    emitChange();
    return note;
  }
  function updateNote(id, patch) {
    const n = data.notes.find((x) => x.id === id);
    if (n) { Object.assign(n, patch); n.updatedAt = Date.now(); }
    emitChange();
  }
  function deleteNote(id) {
    data.notes = data.notes.filter((x) => x.id !== id);
    emitChange();
  }

  // ---------- Timetable ----------
  function addTimetableEntry(entry) {
    const e = { id: uid(), ...entry };
    data.timetable.push(e);
    emitChange();
    return e;
  }
  function updateTimetableEntry(id, patch) {
    const e = data.timetable.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
    emitChange();
  }
  function deleteTimetableEntry(id) {
    data.timetable = data.timetable.filter((x) => x.id !== id);
    emitChange();
  }

  // ---------- Settings ----------
  function setTabOrder(order) {
    data.settings.tabOrder = order;
    emitChange();
  }

  function subjectById(id) {
    return data.subjects.find((s) => s.id === id) || null;
  }

  function randomColor() {
    const palette = ["#4A90D9", "#E4572E", "#2E933C", "#9C51B6", "#E0A100", "#0EA5A5", "#D6417B"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  return {
    get data() { return data; },
    onChange, emitChange, replaceAll,
    addSubject, updateSubject, deleteSubject,
    addTask, updateTask, deleteTask, sortedTasks, tasksByDate,
    addNote, updateNote, deleteNote,
    addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
    setTabOrder, subjectById, uid
  };
})();
