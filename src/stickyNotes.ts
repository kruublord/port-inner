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
const CREDITS_NOTE_ID = "credits-note";
const TODO_NOTE_ID = "todo-note";

let notes: StickyNoteData[] = [];
const noteWindows = new Map<string, HTMLDivElement>();

let noteZ = 200;

// list window + list body ref so we can re-render
let notesListWindow: HTMLDivElement | null = null;
let notesListBody: HTMLElement | null = null;

// ---- Persistence ----
function textToNoteHtml(text: string, boldFirstLine = true): string {
  // Escape HTML so user text can't break your markup
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split(/\r?\n/);

  if (lines.length === 0) return "";

  const [first, ...rest] = lines;

  let html = boldFirstLine ? `<strong>${first}</strong>` : first;

  if (rest.length) {
    html += "<br />" + rest.join("<br />");
  }

  return html;
}

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

const TODO_DEFAULT_TEXT = `To-Do List
• About window (layout + copy)
• "Windows" button / start menu
• Taskbar (active / minimized states)
• Add and style Projects window
• Add Contact / Resume app
• Add projects
• Right-click desktop context menu
• Theme / wallpaper picker
`;

const CREDITS_DEFAULT_TEXT = `Credits and Inspirations

ThreeJS room inspired by:
• https://www.sooahs-room-folio.com/
• https://my-room-in-3d.vercel.app/
• https://www.joanramosrefusta.com/
• https://room.bokoko33.me/
• https://www.andriibabintsev.com/
• https://at010303.vercel.app/

Desktop OS inspired by other portfolios:
• https://dustinbrett.com/
• https://joan-os.vercel.app/
• https://henryheffernan.com/

Wallpaper created using Vanta.js:
• https://www.vantajs.com/

Most icons taken and edited from:
• https://www.flaticon.com/
• https://fontawesome.com/icons

3D Assets built in Blender and sourced from:
• https://poly.pizza/
• https://sketchfab.com/


Built with:
• HTML + CSS
• TypeScript

`;

function createCreditsNote() {
  const existing = notes.find((n) => n.id === CREDITS_NOTE_ID);
  if (existing) return;

  const creditsNote: StickyNoteData = {
    id: CREDITS_NOTE_ID,
    content: textToNoteHtml(CREDITS_DEFAULT_TEXT, true),
    left: 140,
    top: 140,
    width: 260,
    height: 220,
    color: "#FFE58A",
    isOpen: false,
  };

  notes.push(creditsNote);
  saveNotes();
}

function createTodoNote() {
  let todo = notes.find((n) => n.id === TODO_NOTE_ID);

  if (!todo) {
    todo = {
      id: TODO_NOTE_ID,
      content: textToNoteHtml(TODO_DEFAULT_TEXT, true),
      left: 420,
      top: 140,
      width: 260,
      height: 220,
      color: "#D7F0FF",
      isOpen: true,
    };
    notes.push(todo);
  }

  todo.isOpen = true;
  saveNotes();
}
const NOTE_COLORS = ["#D7F0FF", "#FFE58A", "#FFD6E7", "#E0FFE0"];

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

  // Empty title just to keep layout so controls stay on the right
  const title = document.createElement("div");
  title.className = "desktop-window__title";
  title.innerHTML = "&nbsp;"; // visually blank

  const controls = document.createElement("div");
  controls.className = "desktop-window__controls";

  const closeBtn = document.createElement("button");
  closeBtn.className = "desktop-window__button desktop-window__button--close";

  // Font Awesome "x" icon
  const noteCloseIcon = document.createElement("i");
  noteCloseIcon.className = "fa-solid fa-xmark";
  closeBtn.appendChild(noteCloseIcon);

  controls.appendChild(closeBtn);
  titlebar.appendChild(title);
  titlebar.appendChild(controls);

  // Content
  const content = document.createElement("div");
  content.className = "desktop-window__content desktop-window__content--note";
  content.style.background = note.color;

  const editor = document.createElement("div");
  editor.className = "sticky-note__editor";
  editor.contentEditable = "true";
  editor.innerHTML = note.content || "";

  const toolbar = document.createElement("div");
  toolbar.className = "sticky-note__toolbar";

  // Bold
  const boldBtn = document.createElement("button");
  boldBtn.className = "sticky-note__btn sticky-note__btn--bold";
  boldBtn.setAttribute("aria-label", "Bold");
  const boldIcon = document.createElement("i");
  boldIcon.className = "fa-solid fa-bold";
  boldBtn.appendChild(boldIcon);

  // Italic
  const italicBtn = document.createElement("button");
  italicBtn.className = "sticky-note__btn sticky-note__btn--italic";
  italicBtn.setAttribute("aria-label", "Italic");
  const italicIcon = document.createElement("i");
  italicIcon.className = "fa-solid fa-italic";
  italicBtn.appendChild(italicIcon);

  // Underline
  const underlineBtn = document.createElement("button");
  underlineBtn.className = "sticky-note__btn sticky-note__btn--underline";
  underlineBtn.setAttribute("aria-label", "Underline");
  const underlineIcon = document.createElement("i");
  underlineIcon.className = "fa-solid fa-underline";
  underlineBtn.appendChild(underlineIcon);

  // Strikethrough
  const strikeBtn = document.createElement("button");
  strikeBtn.className = "sticky-note__btn sticky-note__btn--strike";
  strikeBtn.setAttribute("aria-label", "Strikethrough");
  const strikeIcon = document.createElement("i");
  strikeIcon.className = "fa-solid fa-strikethrough";
  strikeBtn.appendChild(strikeIcon);

  // Bullets (toggle unordered list)
  const bulletBtn = document.createElement("button");
  bulletBtn.className = "sticky-note__btn sticky-note__btn--list";
  bulletBtn.setAttribute("aria-label", "Toggle bullets");
  const bulletIcon = document.createElement("i");
  bulletIcon.className = "fa-solid fa-list-ul";
  bulletBtn.appendChild(bulletIcon);

  // Colour button
  const colorBtn = document.createElement("button");
  colorBtn.className = "sticky-note__btn sticky-note__btn--color";
  colorBtn.setAttribute("aria-label", "Change note colour");
  const colorIcon = document.createElement("i");
  colorIcon.className = "fa-solid fa-palette";
  colorBtn.appendChild(colorIcon);

  // Resize handle in bottom-right
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "sticky-note__resize-handle";

  // Order similar to Windows: B I U S • 🎨
  toolbar.appendChild(boldBtn);
  toolbar.appendChild(italicBtn);
  toolbar.appendChild(underlineBtn);
  toolbar.appendChild(strikeBtn);
  toolbar.appendChild(bulletBtn);
  toolbar.appendChild(colorBtn);

  content.appendChild(editor);
  content.appendChild(toolbar);
  content.appendChild(resizeHandle);

  win.appendChild(titlebar);
  win.appendChild(content);
  windowsLayer.appendChild(win);

  // --- Editing state: show/hide toolbar based on focus inside this window ---

  win.addEventListener("focusin", () => {
    win.classList.add("desktop-window--note-editing");
  });

  win.addEventListener("focusout", () => {
    // Wait a tick so document.activeElement is updated
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !win.contains(active)) {
        win.classList.remove("desktop-window--note-editing");
      }
    }, 0);
  });

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

  // Resizing via bottom-right handle
  let resizing = false;
  let startResizeMouseX = 0;
  let startResizeMouseY = 0;
  let startWidth = 0;
  let startHeight = 0;

  resizeHandle.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation(); // don't start drag

    resizing = true;
    bringNoteToFront(win);

    const rect = win.getBoundingClientRect();
    startResizeMouseX = ev.clientX;
    startResizeMouseY = ev.clientY;
    startWidth = rect.width;
    startHeight = rect.height;

    const onResizeMove = (moveEv: MouseEvent) => {
      if (!resizing) return;

      const dx = moveEv.clientX - startResizeMouseX;
      const dy = moveEv.clientY - startResizeMouseY;

      const newWidth = Math.max(180, startWidth + dx);
      const newHeight = Math.max(140, startHeight + dy);

      win.style.width = `${newWidth}px`;
      win.style.height = `${newHeight}px`;
    };

    const onResizeUp = () => {
      if (!resizing) return;
      resizing = false;
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeUp);

      const rect = win.getBoundingClientRect();
      note.width = rect.width;
      note.height = rect.height;
      saveNotes();
      refreshNotesList(windowsLayer);
    };

    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeUp);
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

  // Italic button
  italicBtn.addEventListener("click", (e) => {
    e.preventDefault();
    editor.focus();
    document.execCommand("italic");
  });

  // Underline button
  underlineBtn.addEventListener("click", (e) => {
    e.preventDefault();
    editor.focus();
    document.execCommand("underline");
  });

  // Strikethrough button
  strikeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    editor.focus();
    document.execCommand("strikeThrough");
  });

  // Bullets button – toggles unordered list
  bulletBtn.addEventListener("click", (e) => {
    e.preventDefault();
    editor.focus();
    document.execCommand("insertUnorderedList");
  });

  // Colour button: cycle through preset colours
  colorBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const currentIndex = NOTE_COLORS.indexOf(note.color);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % NOTE_COLORS.length;

    const nextColor = NOTE_COLORS[nextIndex];
    note.color = nextColor;

    win.style.background = nextColor;
    titlebar.style.background = nextColor;
    content.style.background = nextColor;

    saveNotes();
    refreshNotesList(windowsLayer);
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

  // Make sure the Credits note exists in the array
  createCreditsNote();
  createTodoNote();
  // Restore any open notes (including Credits if isOpen === true)
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
