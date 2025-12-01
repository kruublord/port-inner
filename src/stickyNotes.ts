// src/stickyNotes.ts

export interface StickyNoteData {
  id: string;
  content: string; // HTML string
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  isOpen: boolean;
}

const STORAGE_KEY = "stickyNotes.v2";

let notes: StickyNoteData[] = [];
const noteWindows = new Map<string, HTMLDivElement>();

let noteZ = 200;

// list window + list body ref so we can re-render
let notesListWindow: HTMLDivElement | null = null;
let notesListBody: HTMLElement | null = null;

// ---- Persistence ----

function loadNotes(): StickyNoteData[] {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StickyNoteData>[];

    return parsed.map((n, index) => ({
      id: n.id || `note-${index}-${Math.random().toString(16).slice(2)}`,
      content: n.content ?? "",
      left: typeof n.left === "number" ? n.left : 120,
      top: typeof n.top === "number" ? n.top : 120,
      width: typeof n.width === "number" ? n.width : 260,
      height: typeof n.height === "number" ? n.height : 220,
      color: n.color || "#FFE58A",
      isOpen: typeof n.isOpen === "boolean" ? n.isOpen : true,
    }));
  } catch {
    return [];
  }
}

function saveNotes() {
  if (typeof window === "undefined" || !("localStorage" in window)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore errors
  }
}

function bringNoteToFront(win: HTMLDivElement) {
  noteZ += 1;
  win.style.zIndex = String(noteZ);
}

// Helper: re-render the list UI if it's open
function refreshNotesList(windowsLayer: HTMLElement) {
  if (!notesListBody) return;
  renderNotesList(notesListBody, windowsLayer);
}

// ---- Note window creation ----

function createStickyWindowElement(
  note: StickyNoteData,
  windowsLayer: HTMLElement
): HTMLDivElement {
  const win = document.createElement("div");
  win.className = "desktop-window desktop-window--note";

  win.style.left = `${note.left}px`;
  win.style.top = `${note.top}px`;
  win.style.width = `${note.width}px`;
  win.style.height = `${note.height}px`;
  win.style.background = note.color;
  bringNoteToFront(win);

  // Titlebar
  const titlebar = document.createElement("div");
  titlebar.className =
    "desktop-window__titlebar desktop-window__titlebar--note";
  titlebar.style.background = note.color;

  const title = document.createElement("div");
  title.className = "desktop-window__title";
  title.textContent = "Note";

  const controls = document.createElement("div");
  controls.className = "desktop-window__controls";

  const closeBtn = document.createElement("button");
  closeBtn.className = "desktop-window__button desktop-window__button--close";

  // Font Awesome "x" icon
  const noteCloseIcon = document.createElement("i");
  noteCloseIcon.className = "fa-solid fa-xmark"; // FA6 name. For FA5 use "fa fa-times"
  closeBtn.appendChild(noteCloseIcon);

  controls.appendChild(closeBtn);
  titlebar.appendChild(title);
  titlebar.appendChild(controls);

  // Content
  const content = document.createElement("div");
  content.className = "desktop-window__content desktop-window__content--note";
  content.style.background = note.color;

  // Editor + toolbar wrapper
  const editor = document.createElement("div");
  editor.className = "sticky-note__editor";
  editor.contentEditable = "true";
  // treat existing plain text nicely
  editor.innerHTML = note.content || "";

  const toolbar = document.createElement("div");
  toolbar.className = "sticky-note__toolbar";

  const boldBtn = document.createElement("button");
  boldBtn.className = "sticky-note__btn sticky-note__btn--bold";
  boldBtn.textContent = "B";

  toolbar.appendChild(boldBtn);

  content.appendChild(editor);
  content.appendChild(toolbar);

  win.appendChild(titlebar);
  win.appendChild(content);
  windowsLayer.appendChild(win);

  // ---- Interactions ----

  win.addEventListener("mousedown", () => bringNoteToFront(win));

  // Dragging via titlebar
  let dragging = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let startLeft = 0;
  let startTop = 0;

  titlebar.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    dragging = true;
    bringNoteToFront(win);

    const rect = win.getBoundingClientRect();
    startMouseX = ev.clientX;
    startMouseY = ev.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    const onMove = (moveEv: MouseEvent) => {
      if (!dragging) return;

      const dx = moveEv.clientX - startMouseX;
      const dy = moveEv.clientY - startMouseY;

      const newLeft = startLeft + dx;
      const newTop = startTop + dy;

      win.style.left = `${newLeft}px`;
      win.style.top = `${newTop}px`;
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      const left = parseFloat(win.style.left || "0");
      const top = parseFloat(win.style.top || "0");
      note.left = left;
      note.top = top;
      saveNotes();
      refreshNotesList(windowsLayer);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  // Rich-text editing
  editor.addEventListener("input", () => {
    note.content = editor.innerHTML;
    saveNotes();
    refreshNotesList(windowsLayer);
  });

  // Bold button
  boldBtn.addEventListener("click", (e) => {
    e.preventDefault();
    editor.focus();
    document.execCommand("bold");
  });

  // Close (just hide the note, don't delete)
  closeBtn.addEventListener("click", () => {
    win.remove();
    noteWindows.delete(note.id);
    note.isOpen = false;
    saveNotes();
    refreshNotesList(windowsLayer);
  });

  return win;
}

// ---- Notes list window ----

function renderNotesList(listEl: HTMLElement, windowsLayer: HTMLElement) {
  listEl.innerHTML = "";

  notes.forEach((note) => {
    // row container (now a div, not a button)
    const row = document.createElement("div");
    row.className = "sticky-notes-list__row";

    if (!note.isOpen) {
      row.classList.add("is-closed");
    }

    // preview text
    const preview = document.createElement("div");
    preview.className = "sticky-notes-list__preview";

    const plain = note.content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "");

    preview.textContent = (plain || "Empty note").slice(0, 80);

    // delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "sticky-notes-list__delete";
    deleteBtn.setAttribute("aria-label", "Delete note");

    // Font Awesome trash icon
    const trashIcon = document.createElement("i");
    trashIcon.className = "fa-solid fa-trash"; // or "fa-regular fa-trash-can"
    deleteBtn.appendChild(trashIcon);

    // colour indicator on left
    row.style.borderLeftColor = note.color;

    // clicking the row toggles open/closed
    row.addEventListener("click", () => {
      if (note.isOpen) {
        const existing = noteWindows.get(note.id);
        if (existing) existing.remove();
        noteWindows.delete(note.id);
        note.isOpen = false;
      } else {
        const win = createStickyWindowElement(note, windowsLayer);
        noteWindows.set(note.id, win);
        note.isOpen = true;
      }

      saveNotes();
      renderNotesList(listEl, windowsLayer);
    });

    // clicking delete removes the note entirely
    deleteBtn.addEventListener("click", (ev) => {
      ev.stopPropagation(); // don't trigger open/close

      // close window if it's open
      const existing = noteWindows.get(note.id);
      if (existing) {
        existing.remove();
        noteWindows.delete(note.id);
      }

      // remove from array + persist
      notes = notes.filter((n) => n.id !== note.id);
      saveNotes();

      // rerender list
      renderNotesList(listEl, windowsLayer);
    });

    row.appendChild(preview);
    row.appendChild(deleteBtn);
    listEl.appendChild(row);
  });
}

export function openNotesListWindow(windowsLayer: HTMLElement) {
  // if already open, just bring to front
  if (notesListWindow && document.body.contains(notesListWindow)) {
    bringNoteToFront(notesListWindow);
    return;
  }

  const win = document.createElement("div");
  win.className = "desktop-window desktop-window--note-list";
  win.style.width = "320px";
  win.style.height = "420px";
  win.style.left = "40px";
  win.style.top = "40px";

  bringNoteToFront(win);

  const titlebar = document.createElement("div");
  titlebar.className =
    "desktop-window__titlebar desktop-window__titlebar--note-list";

  const title = document.createElement("div");
  title.className = "desktop-window__title";
  title.textContent = "Sticky Notes";

  const controls = document.createElement("div");
  controls.className = "desktop-window__controls";

  const addBtn = document.createElement("button");
  addBtn.className = "desktop-window__button";

  const addIcon = document.createElement("i");
  addIcon.className = "fa-solid fa-plus";
  addBtn.appendChild(addIcon);

  const closeBtn = document.createElement("button");
  closeBtn.className = "desktop-window__button desktop-window__button--close";

  // use FA “x” or minus here
  const closeIcon = document.createElement("i");
  closeIcon.className = "fa-solid fa-xmark"; // or "fa-solid fa-minus"
  closeBtn.appendChild(closeIcon);

  controls.appendChild(addBtn);
  controls.appendChild(closeBtn);
  titlebar.appendChild(title);
  titlebar.appendChild(controls);

  const body = document.createElement("div");
  body.className = "desktop-window__content desktop-window__content--note-list";

  const list = document.createElement("div");
  list.className = "sticky-notes-list";
  body.appendChild(list);

  win.appendChild(titlebar);
  win.appendChild(body);
  windowsLayer.appendChild(win);

  notesListWindow = win;
  notesListBody = list;

  renderNotesList(list, windowsLayer);

  // Drag list window
  let dragging = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let startLeft = 0;
  let startTop = 0;

  titlebar.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    dragging = true;
    bringNoteToFront(win);

    const rect = win.getBoundingClientRect();
    startMouseX = ev.clientX;
    startMouseY = ev.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    const onMove = (moveEv: MouseEvent) => {
      if (!dragging) return;
      const dx = moveEv.clientX - startMouseX;
      const dy = moveEv.clientY - startMouseY;
      win.style.left = `${startLeft + dx}px`;
      win.style.top = `${startTop + dy}px`;
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  // Add new note from list
  addBtn.addEventListener("click", () => {
    createNewStickyNote(windowsLayer);
    renderNotesList(list, windowsLayer);
  });

  // Close list window (notes themselves stay)
  closeBtn.addEventListener("click", () => {
    win.remove();
    notesListWindow = null;
    notesListBody = null;
  });
}

// ---- Public API ----

// Restore any open notes on startup
export function initStickyNotes(windowsLayer: HTMLElement) {
  notes = loadNotes();
  for (const note of notes) {
    if (!note.isOpen) continue;
    const win = createStickyWindowElement(note, windowsLayer);
    noteWindows.set(note.id, win);
  }
}

// Create a brand-new note window and mark it open
export function createNewStickyNote(windowsLayer: HTMLElement) {
  const id = `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const note: StickyNoteData = {
    id,
    content: "",
    left: 120 + Math.random() * 80,
    top: 120 + Math.random() * 80,
    width: 260,
    height: 220,
    color: "#FFE58A",
    isOpen: true,
  };

  notes.push(note);
  saveNotes();

  const win = createStickyWindowElement(note, windowsLayer);
  noteWindows.set(id, win);
}
