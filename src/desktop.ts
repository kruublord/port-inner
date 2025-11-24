// src/desktop.ts

const CELL_WIDTH = 104;
const CELL_HEIGHT = 104;
const DESKTOP_PADDING = 16;
const TASKBAR_HEIGHT = 52;

interface DesktopIcon {
  id: string;
  appId: string;
  label: string;
  gridCol: number;
  gridRow: number;
}

interface GridLayout {
  columns: number;
  rows: number;
}

let selectedIconId: string | null = null;
let currentLayout: GridLayout | null = null;

const PLACEHOLDER_ICONS: DesktopIcon[] = [
  { id: "icon-about", appId: "about", label: "About", gridCol: 0, gridRow: 0 },
  {
    id: "icon-projects",
    appId: "projects",
    label: "Projects",
    gridCol: 0,
    gridRow: 1,
  },
  {
    id: "icon-contact",
    appId: "contact",
    label: "Contact",
    gridCol: 0,
    gridRow: 2,
  },
  {
    id: "icon-playground",
    appId: "playground",
    label: "Playground",
    gridCol: 1,
    gridRow: 0,
  },
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
function isCellOccupied(
  col: number,
  row: number,
  icons: DesktopIcon[],
  ignoreIconId?: string
): boolean {
  return icons.some(
    (icon) =>
      icon.gridCol === col && icon.gridRow === row && icon.id !== ignoreIconId
  );
}

function createIconElement(
  icon: DesktopIcon,
  root: HTMLElement,
  iconsLayer: HTMLElement
): HTMLElement {
  const container = document.createElement("div");
  container.className = "desktop-icon";
  container.dataset.iconId = icon.id;

  const glyph = document.createElement("div");
  glyph.className = "desktop-icon__glyph";
  glyph.textContent = "★";

  const label = document.createElement("div");
  label.className = "desktop-icon__label";
  label.textContent = icon.label;

  container.appendChild(glyph);
  container.appendChild(label);

  // --- Click = select ---
  container.addEventListener("click", (event) => {
    event.stopPropagation();
    setSelectedIcon(root, icon.id);
  });

  // --- Double-click = "open app" (stub) ---
  container.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    setSelectedIcon(root, icon.id);
    console.log(`Open app: ${icon.appId}`);
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
  const DRAG_THRESHOLD = 4; // px

  container.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return; // only left mouse
    // do NOT preventDefault, so click can still fire if we don't drag

    isDragging = true;
    hasMoved = false;
    startMouseX = event.clientX;
    startMouseY = event.clientY;
    startLeft = parseFloat(container.style.left || "0");
    startTop = parseFloat(container.style.top || "0");

    // remember where this icon was in grid terms
    startGridCol = icon.gridCol;
    startGridRow = icon.gridRow;
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging) return;

      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      // Don't treat tiny jitters as dragging
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

      // 🔹 LOG WHILE DRAGGING
      console.log(
        `[drag] icon=${icon.label} dx=${dx.toFixed(1)} dy=${dy.toFixed(
          1
        )} left=${newLeft.toFixed(1)} top=${newTop.toFixed(1)}`
      );

      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      container.classList.remove("desktop-icon--dragging");

      // If we never really moved, let the click/dblclick events handle selection/opening
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

      console.log(
        `[drop] icon=${icon.label} center=(${centerX.toFixed(
          1
        )}, ${centerY.toFixed(
          1
        )}) -> target cell col=${targetCol} row=${targetRow}`
      );

      // Build occupancy map for this column (excluding the icon we're dragging)
      const occupancy: { [row: number]: DesktopIcon } = {};
      for (const other of PLACEHOLDER_ICONS) {
        if (other.id === icon.id) continue;
        if (other.gridCol === targetCol) {
          occupancy[other.gridRow] = other;
        }
      }

      // Check if there is at least one free row at or below the target row
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
        // Column is "full" from targetRow down – revert to where we started
        console.log(
          `[collision] column ${targetCol} full from row ${targetRow}, reverting ${icon.label} to (${startGridCol}, ${startGridRow})`
        );
        finalCol = startGridCol;
        finalRow = startGridRow;
      } else {
        // Shift icons down in this column from bottom up, starting above the last row
        for (let r = currentLayout.rows - 2; r >= targetRow; r--) {
          const occ = occupancy[r];
          if (occ && !occupancy[r + 1]) {
            console.log(
              `[shift] moving ${occ.label} from row ${r} -> row ${
                r + 1
              } in col ${targetCol}`
            );
            occupancy[r + 1] = occ;
            delete occupancy[r];
            occ.gridRow = r + 1; // update data for that icon
            // occ.gridCol already == targetCol
          }
        }

        // After shifting, if somehow targetRow is still occupied, revert
        if (occupancy[targetRow]) {
          console.log(
            `[unexpected] target cell still occupied after shift, reverting ${icon.label} to (${startGridCol}, ${startGridRow})`
          );
          finalCol = startGridCol;
          finalRow = startGridRow;
        } else {
          // We can place the dragged icon at the target cell
          finalCol = targetCol;
          finalRow = targetRow;
        }
      }

      // Update dragged icon's logical position
      icon.gridCol = finalCol;
      icon.gridRow = finalRow;

      console.log(
        `[snap] icon=${icon.label} final cell=(${finalCol}, ${finalRow})`
      );

      // 🔑 Re-render ALL icons so their DOM matches the updated grid data
      renderIcons(iconsLayer, PLACEHOLDER_ICONS, currentLayout, root);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  return container;
}

function renderIcons(
  container: HTMLElement,
  icons: DesktopIcon[],
  layout: GridLayout,
  root: HTMLElement
): void {
  container.innerHTML = "";

  for (const icon of icons) {
    const { x, y } = gridToPixel(icon.gridCol, icon.gridRow);
    const el = createIconElement(icon, root, container);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    container.appendChild(el);
  }

  if (selectedIconId) {
    setSelectedIcon(root, selectedIconId);
  }
}

function createTaskbar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "taskbar";

  const left = document.createElement("div");
  left.className = "taskbar__section taskbar__section--left";

  const center = document.createElement("div");
  center.className = "taskbar__section taskbar__section--center";

  const right = document.createElement("div");
  right.className = "taskbar__section taskbar__section--right";

  const startButton = document.createElement("button");
  startButton.className = "taskbar__start";
  const startIcon = document.createElement("span");
  startIcon.className = "taskbar__start-icon";
  startIcon.textContent = "❖";
  startButton.appendChild(startIcon);
  left.appendChild(startButton);

  for (const icon of PLACEHOLDER_ICONS) {
    const appBtn = document.createElement("button");
    appBtn.className = "taskbar__app-icon";
    appBtn.title = icon.label;

    const glyph = document.createElement("span");
    glyph.className = "taskbar__app-icon-glyph";
    glyph.textContent = icon.label.charAt(0).toUpperCase();

    appBtn.appendChild(glyph);
    center.appendChild(appBtn);
  }

  const clock = document.createElement("div");
  clock.className = "taskbar__clock";
  clock.textContent = "12:34";
  right.appendChild(clock);

  bar.appendChild(left);
  bar.appendChild(center);
  bar.appendChild(right);

  return bar;
}

export function initDesktop(root: HTMLElement): void {
  root.classList.add("desktop");

  const iconsLayer = document.createElement("div");
  iconsLayer.className = "desktop-icons-layer desktop-icons-layer--show-grid";
  iconsLayer.style.top = "0";
  iconsLayer.style.left = "0";
  iconsLayer.style.right = "0";
  iconsLayer.style.bottom = `${TASKBAR_HEIGHT}px`; // stop above taskbar

  const taskbar = createTaskbar();

  root.appendChild(iconsLayer);
  root.appendChild(taskbar);

  const layout = computeGridLayout(root);
  currentLayout = layout;
  renderIcons(iconsLayer, PLACEHOLDER_ICONS, layout, root);

  iconsLayer.addEventListener("click", () => {
    setSelectedIcon(root, null);
  });

  window.addEventListener("resize", () => {
    const newLayout = computeGridLayout(root);
    currentLayout = newLayout;
    renderIcons(iconsLayer, PLACEHOLDER_ICONS, newLayout, root);
  });
}
