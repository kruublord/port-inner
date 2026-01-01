// src/desktop.ts
import { createWindowsLayer, openApp, getRunningAppIds } from "./window";
import { initStickyNotes, openNotesListWindow } from "./stickyNotes";

const CELL_WIDTH = 104;
const CELL_HEIGHT = 104;
const DESKTOP_PADDING = 16;
const TASKBAR_HEIGHT = 52;

export interface DesktopIcon {
  id: string;
  appId: string;
  label: string;
  gridCol: number;
  gridRow: number;
  iconSrc?: string;
  pinned?: boolean; // NEW: whether app is pinned to taskbar
}

interface GridLayout {
  columns: number;
  rows: number;
}

let selectedIconId: string | null = null;
let currentLayout: GridLayout | null = null;
const PLACEHOLDER_ICONS: DesktopIcon[] = [
  {
    id: "icon-about",
    appId: "about",
    label: "About",
    gridCol: 0,
    gridRow: 0,
    iconSrc: "/icons/about.png",
    pinned: true, // Pinned to taskbar
  },
  {
    id: "icon-projects",
    appId: "projects",
    label: "Projects",
    gridCol: 0,
    gridRow: 1,
    iconSrc: "/icons/projects.png",
    pinned: true, // Pinned to taskbar
  },
  {
    id: "icon-contact",
    appId: "contact",
    label: "Contact",
    gridCol: 0,
    gridRow: 2,
    iconSrc: "/icons/contact.png",
    pinned: false, // NOT pinned - only shows when open
  },

  {
    id: "icon-resume",
    appId: "resume",
    label: "Resume",
    gridCol: 0,
    gridRow: 3,
    iconSrc: "/icons/resume.png",
    pinned: false, // Pinned to taskbar
  },

  {
    id: "icon-playground",
    appId: "playground",
    label: "Browser",
    gridCol: 1,
    gridRow: 0,
    iconSrc: "/icons/browser.png",
    pinned: true, // Pinned to taskbar
  },
  {
    id: "icon-credits",
    appId: "credits",
    label: "Credits",
    gridCol: 1,
    gridRow: 1,
    iconSrc: "/icons/credits.png",
    pinned: true, // Pinned to taskbar
  },
  // {
  //   id: "icon-photos",
  //   appId: "photos",
  //   label: "Photos",
  //   gridCol: 1,
  //   gridRow: 2,
  //   iconSrc: "/icons/photos.png", // add this asset
  //   pinned: false,
  // },
  // {
  //   id: "icon-devlog",
  //   appId: "devlog",
  //   label: "Dev Log",
  //   gridCol: 2,
  //   gridRow: 0,
  //   iconSrc: "/icons/devlog.png",
  //   pinned: false,
  // },
  // {
  //   id: "icon-console",
  //   appId: "console",
  //   label: "Console",
  //   gridCol: 2,
  //   gridRow: 1,
  //   iconSrc: "/icons/console.png",
  //   pinned: false,
  // },
];

function computeGridLayout(root: HTMLElement): GridLayout {
  const width = root.clientWidth;
  const height = root.clientHeight - TASKBAR_HEIGHT;

  const usableWidth = Math.max(width - DESKTOP_PADDING * 2, CELL_WIDTH);
  const usableHeight = Math.max(height - DESKTOP_PADDING * 2, CELL_HEIGHT);

  const columns = Math.max(1, Math.floor(usableWidth / CELL_WIDTH));
  const rows = Math.max(1, Math.floor(usableHeight / CELL_HEIGHT));

  return { columns, rows };
}

function gridToPixel(col: number, row: number): { x: number; y: number } {
  const x = DESKTOP_PADDING + col * CELL_WIDTH;
  const y = DESKTOP_PADDING + row * CELL_HEIGHT;
  return { x, y };
}

function pixelToGrid(
  x: number,
  y: number,
  layout: GridLayout
): { col: number; row: number } {
  let col = Math.floor((x - DESKTOP_PADDING) / CELL_WIDTH);
  let row = Math.floor((y - DESKTOP_PADDING) / CELL_HEIGHT);

  col = Math.min(Math.max(col, 0), layout.columns - 1);
  row = Math.min(Math.max(row, 0), layout.rows - 1);

  return { col, row };
}

function setSelectedIcon(root: HTMLElement, iconId: string | null) {
  selectedIconId = iconId;

  const iconElements = root.querySelectorAll<HTMLElement>(".desktop-icon");
  iconElements.forEach((el) => {
    const id = el.dataset.iconId;
    if (id && id === iconId) {
      el.classList.add("desktop-icon--selected");
    } else {
      el.classList.remove("desktop-icon--selected");
    }
  });
}

function createIconElement(
  icon: DesktopIcon,
  root: HTMLElement,
  iconsLayer: HTMLElement,
  windowsLayer: HTMLElement,
  appButtonsById: Record<string, HTMLButtonElement>
): HTMLElement {
  const container = document.createElement("div");
  container.className = "desktop-icon";
  container.dataset.iconId = icon.id;

  const glyph = document.createElement("div");
  glyph.className = "desktop-icon__glyph";

  if (icon.iconSrc) {
    const img = document.createElement("img");
    img.src = icon.iconSrc;
    img.alt = icon.label;
    img.className = "desktop-icon__image";
    img.draggable = false;
    glyph.appendChild(img);
  }

  const label = document.createElement("div");
  label.className = "desktop-icon__label";
  label.textContent = icon.label;

  container.appendChild(glyph);
  container.appendChild(label);

  // Click = select
  container.addEventListener("click", (event) => {
    event.stopPropagation();
    setSelectedIcon(root, icon.id);
  });

  // Double-click = open app
  container.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    setSelectedIcon(root, icon.id);

    if (icon.appId === "credits") {
      // Open / focus the Sticky Notes list window
      openNotesListWindow(windowsLayer);
      return;
    }

    const taskbarButton = appButtonsById[icon.appId];
    openApp(windowsLayer, icon, taskbarButton);
  });

  // --- Drag handling ---
  let isDragging = false;
  let hasMoved = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let startLeft = 0;
  let startTop = 0;
  let startGridCol = icon.gridCol;
  let startGridRow = icon.gridRow;
  const DRAG_THRESHOLD = 4;

  container.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;

    isDragging = true;
    hasMoved = false;
    startMouseX = event.clientX;
    startMouseY = event.clientY;
    startLeft = parseFloat(container.style.left || "0");
    startTop = parseFloat(container.style.top || "0");

    startGridCol = icon.gridCol;
    startGridRow = icon.gridRow;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging) return;

      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      if (
        !hasMoved &&
        Math.abs(dx) < DRAG_THRESHOLD &&
        Math.abs(dy) < DRAG_THRESHOLD
      ) {
        return;
      }

      hasMoved = true;
      container.classList.add("desktop-icon--dragging");

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      const rect = iconsLayer.getBoundingClientRect();
      const maxLeft = rect.width - CELL_WIDTH - DESKTOP_PADDING;
      const maxTop = rect.height - CELL_HEIGHT - DESKTOP_PADDING;

      newLeft = Math.min(Math.max(newLeft, DESKTOP_PADDING), maxLeft);
      newTop = Math.min(Math.max(newTop, DESKTOP_PADDING), maxTop);

      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      container.classList.remove("desktop-icon--dragging");

      if (!hasMoved) {
        return;
      }

      if (!currentLayout) return;

      const left = parseFloat(container.style.left || "0");
      const top = parseFloat(container.style.top || "0");
      const centerX = left + CELL_WIDTH / 2;
      const centerY = top + CELL_HEIGHT / 2;

      const { col: targetCol, row: targetRow } = pixelToGrid(
        centerX,
        centerY,
        currentLayout
      );

      // If dropped back where it started, don't shift column
      if (targetCol === startGridCol && targetRow === startGridRow) {
        icon.gridCol = startGridCol;
        icon.gridRow = startGridRow;
        renderIcons(
          iconsLayer,
          PLACEHOLDER_ICONS,
          root,
          windowsLayer,
          appButtonsById
        );
        return;
      }

      const occupancy: { [row: number]: DesktopIcon } = {};
      for (const other of PLACEHOLDER_ICONS) {
        if (other.id === icon.id) continue;
        if (other.gridCol === targetCol) {
          occupancy[other.gridRow] = other;
        }
      }

      let hasFreeBelow = false;
      for (let r = targetRow; r < currentLayout.rows; r++) {
        if (!occupancy[r]) {
          hasFreeBelow = true;
          break;
        }
      }

      let finalCol = targetCol;
      let finalRow = targetRow;

      if (!hasFreeBelow) {
        finalCol = startGridCol;
        finalRow = startGridRow;
      } else {
        for (let r = currentLayout.rows - 2; r >= targetRow; r--) {
          const occ = occupancy[r];
          if (occ && !occupancy[r + 1]) {
            occupancy[r + 1] = occ;
            delete occupancy[r];
            occ.gridRow = r + 1;
          }
        }

        if (occupancy[targetRow]) {
          finalCol = startGridCol;
          finalRow = startGridRow;
        } else {
          finalCol = targetCol;
          finalRow = targetRow;
        }
      }

      icon.gridCol = finalCol;
      icon.gridRow = finalRow;

      renderIcons(
        iconsLayer,
        PLACEHOLDER_ICONS,
        root,
        windowsLayer,
        appButtonsById
      );
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  return container;
}

function renderIcons(
  container: HTMLElement,
  icons: DesktopIcon[],
  root: HTMLElement,
  windowsLayer: HTMLElement,
  appButtonsById: Record<string, HTMLButtonElement>
): void {
  container.innerHTML = "";

  for (const icon of icons) {
    const { x, y } = gridToPixel(icon.gridCol, icon.gridRow);
    const el = createIconElement(
      icon,
      root,
      container,
      windowsLayer,
      appButtonsById
    );

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    container.appendChild(el);
  }

  if (selectedIconId) {
    setSelectedIcon(root, selectedIconId);
  }
}

// NEW: Export function to get running apps from window.ts
// This will be called by window.ts when apps open/close
let updateTaskbarCallback: (() => void) | null = null;

export function setTaskbarUpdateCallback(callback: () => void) {
  updateTaskbarCallback = callback;
}

export function notifyTaskbarUpdate() {
  if (updateTaskbarCallback) {
    updateTaskbarCallback();
  }
}

function createTaskbar(
  windowsLayer: HTMLElement,
  getRunningAppIds: () => string[]
): {
  bar: HTMLElement;
  appButtonsById: Record<string, HTMLButtonElement>;
  updateTaskbar: () => void;
} {
  const bar = document.createElement("div");
  bar.className = "taskbar";

  const left = document.createElement("div");
  left.className = "taskbar__section taskbar__section--left";

  const center = document.createElement("div");
  center.className = "taskbar__section taskbar__section--center";

  const right = document.createElement("div");
  right.className = "taskbar__section taskbar__section--right";

  // Start button
  const startButton = document.createElement("button");
  startButton.className = "taskbar__start";
  const startIcon = document.createElement("span");
  startIcon.className = "taskbar__start-icon";
  startIcon.textContent = "❖";
  startButton.appendChild(startIcon);
  left.appendChild(startButton);

  const appButtonsById: Record<string, HTMLButtonElement> = {};

  // Function to update taskbar based on pinned + running apps
  const updateTaskbar = () => {
    center.innerHTML = ""; // Clear existing buttons

    const runningAppIds = getRunningAppIds();
    const appsToShow = new Set<string>();

    // Add all pinned apps
    for (const icon of PLACEHOLDER_ICONS) {
      if (icon.pinned) {
        appsToShow.add(icon.appId);
      }
    }

    // Add all running apps
    for (const appId of runningAppIds) {
      appsToShow.add(appId);
    }

    // Create buttons for apps to show
    for (const icon of PLACEHOLDER_ICONS) {
      if (!appsToShow.has(icon.appId)) continue;

      const appBtn = document.createElement("button");
      appBtn.className = "taskbar__app-icon";
      appBtn.title = icon.label;
      appBtn.dataset.appId = icon.appId;

      if (icon.iconSrc) {
        const img = document.createElement("img");
        img.src = icon.iconSrc;
        img.alt = icon.label;
        img.className = "taskbar__app-icon-img";
        img.draggable = false;
        appBtn.appendChild(img);
      }

      // Add indicator for open apps (Windows-style underline)
      const indicator = document.createElement("div");
      indicator.className = "taskbar__app-indicator";
      appBtn.appendChild(indicator);

      // Mark as active if app is currently running
      if (runningAppIds.includes(icon.appId)) {
        appBtn.classList.add("taskbar__app-icon--active");
      }

      center.appendChild(appBtn);
      appButtonsById[icon.appId] = appBtn;

      appBtn.addEventListener("click", (event) => {
        event.stopPropagation();

        if (icon.appId === "credits") {
          openNotesListWindow(windowsLayer);
          return;
        }

        openApp(windowsLayer, icon, appBtn);
      });
    }
  };

  // Initial render
  updateTaskbar();

  const clock = document.createElement("div");
  clock.className = "taskbar__clock";
  clock.textContent = "12:34";
  right.appendChild(clock);

  bar.appendChild(left);
  bar.appendChild(center);
  bar.appendChild(right);

  return { bar, appButtonsById, updateTaskbar };
}

export function initDesktop(root: HTMLElement): void {
  root.classList.add("desktop");

  const iconsLayer = document.createElement("div");
  iconsLayer.className = "desktop-icons-layer desktop-icons-layer--show-grid";
  iconsLayer.style.top = "0";
  iconsLayer.style.left = "0";
  iconsLayer.style.right = "0";
  iconsLayer.style.bottom = `${TASKBAR_HEIGHT}px`;

  const windowsLayer = createWindowsLayer();

  const {
    bar: taskbar,
    appButtonsById,
    updateTaskbar,
  } = createTaskbar(windowsLayer, getRunningAppIds);

  // Set the callback so window.ts can notify us
  setTaskbarUpdateCallback(updateTaskbar);

  root.appendChild(iconsLayer);
  root.appendChild(windowsLayer);
  root.appendChild(taskbar);
  initStickyNotes(windowsLayer);

  currentLayout = computeGridLayout(root);
  renderIcons(
    iconsLayer,
    PLACEHOLDER_ICONS,
    root,
    windowsLayer,
    appButtonsById
  );

  iconsLayer.addEventListener("click", () => {
    setSelectedIcon(root, null);
  });

  window.addEventListener("resize", () => {
    const newLayout = computeGridLayout(root);
    currentLayout = newLayout;
    renderIcons(
      iconsLayer,
      PLACEHOLDER_ICONS,
      root,
      windowsLayer,
      appButtonsById
    );
  });
}
