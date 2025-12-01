// src/windows.ts
import type { DesktopIcon } from "./desktop";

type AppInstance = {
  win: HTMLDivElement;
  minimized: boolean;
  maximized: boolean;
  taskbarButton?: HTMLButtonElement;
  prevBounds?: { left: number; top: number; width: number; height: number };
};

const runningApps = new Map<string, AppInstance>();
let zCounter = 1;

export function createWindowsLayer(): HTMLElement {
  const layer = document.createElement("div");
  layer.className = "desktop-windows-layer";
  return layer;
}

function bringToFront(win: HTMLDivElement) {
  zCounter += 1;
  win.style.zIndex = String(zCounter);
}

// ---- Resize handles ----

function attachResizeHandles(
  win: HTMLDivElement,
  windowsLayer: HTMLElement
): void {
  const directions: ResizeDirection[] = [
    "top",
    "bottom",
    "left",
    "right",
    "tl",
    "tr",
    "bl",
    "br",
  ];

  directions.forEach((dir) => {
    const handle = document.createElement("div");
    handle.className = `desktop-window__resize-handle desktop-window__resize-handle--${dir}`;

    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startResize(win, dir, event, windowsLayer);
    });

    win.appendChild(handle);
  });
}
type ResizeDirection =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "tl"
  | "tr"
  | "bl"
  | "br";

function startResize(
  win: HTMLDivElement,
  dir: ResizeDirection,
  event: MouseEvent,
  windowsLayer: HTMLElement
): void {
  const startX = event.clientX;
  const startY = event.clientY;

  const containerRect = windowsLayer.getBoundingClientRect();
  const rect = win.getBoundingClientRect();

  const startLeft = rect.left - containerRect.left;
  const startTop = rect.top - containerRect.top;
  const startWidth = rect.width;
  const startHeight = rect.height;

  // Right / bottom edges at the start – we keep these as reference
  const startRight = startLeft + startWidth;
  const startBottom = startTop + startHeight;

  const minWidth = 320;
  const minHeight = 200;

  const onMouseMove = (moveEvent: MouseEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;

    let newLeft = startLeft;
    let newTop = startTop;
    let newWidth = startWidth;
    let newHeight = startHeight;

    const affectsLeft = dir === "left" || dir === "tl" || dir === "bl";
    const affectsRight = dir === "right" || dir === "tr" || dir === "br";
    const affectsTop = dir === "top" || dir === "tl" || dir === "tr";
    const affectsBottom = dir === "bottom" || dir === "bl" || dir === "br";

    // ---- Horizontal resize ----
    if (affectsLeft) {
      // Move the left edge, keep the right edge anchored (startRight)
      const tentativeLeft = startLeft + dx;

      // Left cannot go past the desktop, and cannot cross right - minWidth
      const minLeft = 0;
      const maxLeft = startRight - minWidth;

      newLeft = Math.max(minLeft, Math.min(tentativeLeft, maxLeft));
      newWidth = startRight - newLeft;
    } else if (affectsRight) {
      // Move right edge, keep left anchored
      const tentativeWidth = startWidth + dx;

      const maxWidth = containerRect.width - startLeft;
      newWidth = Math.max(minWidth, Math.min(tentativeWidth, maxWidth));
      newLeft = startLeft;
    }

    // ---- Vertical resize ----
    if (affectsTop) {
      const tentativeTop = startTop + dy;

      const minTop = 0;
      const maxTop = startBottom - minHeight;

      newTop = Math.max(minTop, Math.min(tentativeTop, maxTop));
      newHeight = startBottom - newTop;
    } else if (affectsBottom) {
      const tentativeHeight = startHeight + dy;

      const maxHeight = containerRect.height - startTop;
      newHeight = Math.max(minHeight, Math.min(tentativeHeight, maxHeight));
      newTop = startTop;
    }

    // Final safety clamp so window never leaves the container
    const maxLeft = containerRect.width - newWidth;
    const maxTop = containerRect.height - newHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    win.style.left = `${newLeft}px`;
    win.style.top = `${newTop}px`;
    win.style.width = `${newWidth}px`;
    win.style.height = `${newHeight}px`;
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}
function startDrag(
  win: HTMLDivElement,
  event: MouseEvent,
  windowsLayer: HTMLElement
): void {
  const startX = event.clientX;
  const startY = event.clientY;

  const containerRect = windowsLayer.getBoundingClientRect();
  const rect = win.getBoundingClientRect();

  const startLeft = rect.left - containerRect.left;
  const startTop = rect.top - containerRect.top;

  const onMouseMove = (moveEvent: MouseEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;

    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    const maxLeft = containerRect.width - win.offsetWidth;
    const maxTop = containerRect.height - win.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    win.style.left = `${newLeft}px`;
    win.style.top = `${newTop}px`;
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

// ---- Window shell (frame + titlebar + buttons) ----

function createWindowShell(
  windowsLayer: HTMLElement,
  appId: string,
  title: string,
  taskbarButton?: HTMLButtonElement
): { win: HTMLDivElement; content: HTMLDivElement } {
  const win = document.createElement("div");
  win.className = "desktop-window";

  // some default size/position
  win.style.width = "720px";
  win.style.height = "460px";
  win.style.left = "160px";
  win.style.top = "80px";

  bringToFront(win);

  const titlebar = document.createElement("div");
  titlebar.className = "desktop-window__titlebar";

  const titleSpan = document.createElement("span");
  titleSpan.className = "desktop-window__title";
  titleSpan.textContent = title;

  const controls = document.createElement("div");
  controls.className = "desktop-window__controls";

  const minimizeBtn = document.createElement("button");
  minimizeBtn.className =
    "desktop-window__button desktop-window__button--minimize";
  const minIcon = document.createElement("i");
  minIcon.className = "fa-solid fa-minus";
  minimizeBtn.appendChild(minIcon);

  const maximizeBtn = document.createElement("button");
  maximizeBtn.className =
    "desktop-window__button desktop-window__button--maximize";

  const maxIcon = document.createElement("i");
  // outlined square
  maxIcon.className = "fa-regular fa-square";
  maximizeBtn.appendChild(maxIcon);

  const closeBtn = document.createElement("button");
  closeBtn.className = "desktop-window__button desktop-window__button--close";
  const closeIcon = document.createElement("i");
  closeIcon.className = "fa-solid fa-xmark";
  closeBtn.appendChild(closeIcon);

  controls.appendChild(minimizeBtn);
  controls.appendChild(maximizeBtn);
  controls.appendChild(closeBtn);

  titlebar.appendChild(titleSpan);
  titlebar.appendChild(controls);

  const content = document.createElement("div");
  content.className = "desktop-window__content";

  win.appendChild(titlebar);
  win.appendChild(content);

  windowsLayer.appendChild(win);
  // 🔹 Make window draggable via titlebar
  titlebar.addEventListener("mousedown", (event) => {
    // Don't start drag when clicking control buttons
    const target = event.target as HTMLElement;
    if (target.closest(".desktop-window__button")) {
      return;
    }

    event.preventDefault();
    bringToFront(win);

    // If maximized, ignore drag (you can later add "unmaximize then drag" if you want)
    if (win.classList.contains("desktop-window--maximized")) {
      return;
    }

    startDrag(win, event, windowsLayer);
  });

  attachResizeHandles(win, windowsLayer);

  const instance: AppInstance = {
    win,
    minimized: false,
    maximized: false,
    taskbarButton,
  };
  runningApps.set(appId, instance);

  if (taskbarButton) {
    taskbarButton.classList.add("taskbar__app-icon--active");
    taskbarButton.classList.remove("taskbar__app-icon--minimized");
  }

  win.addEventListener("mousedown", () => {
    bringToFront(win);
  });

  // Minimize
  minimizeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const inst = runningApps.get(appId);
    if (!inst) return;
    inst.minimized = true;
    win.style.display = "none";
    inst.taskbarButton?.classList.add("taskbar__app-icon--minimized");
  });

  // Maximize / restore
  maximizeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const inst = runningApps.get(appId);
    if (!inst) return;

    const containerRect = windowsLayer.getBoundingClientRect();

    if (!inst.maximized) {
      inst.prevBounds = {
        left: win.offsetLeft,
        top: win.offsetTop,
        width: win.offsetWidth,
        height: win.offsetHeight,
      };

      win.style.left = "16px";
      win.style.top = "16px";
      win.style.width = `${containerRect.width - 32}px`;
      win.style.height = `${containerRect.height - 32}px`;
      win.classList.add("desktop-window--maximized");
      inst.maximized = true;
    } else if (inst.prevBounds) {
      win.style.left = `${inst.prevBounds.left}px`;
      win.style.top = `${inst.prevBounds.top}px`;
      win.style.width = `${inst.prevBounds.width}px`;
      win.style.height = `${inst.prevBounds.height}px`;
      win.classList.remove("desktop-window--maximized");
      inst.maximized = false;
    }
  });

  // Close
  closeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    win.remove();
    const inst = runningApps.get(appId);
    runningApps.delete(appId);
    if (inst?.taskbarButton) {
      inst.taskbarButton.classList.remove(
        "taskbar__app-icon--active",
        "taskbar__app-icon--minimized"
      );
    }
  });

  return { win, content };
}

// ---- Content helpers ----

export function openWebsiteWindow(
  windowsLayer: HTMLElement,
  appId: string,
  url: string,
  title: string,
  taskbarButton?: HTMLButtonElement
): void {
  const { content } = createWindowShell(
    windowsLayer,
    appId,
    title,
    taskbarButton
  );

  const iframe = document.createElement("iframe");
  iframe.className = "desktop-window__iframe";
  iframe.src = url;

  content.appendChild(iframe);
}

export function openTextWindow(
  windowsLayer: HTMLElement,
  appId: string,
  title: string,
  bodyHtml: string,
  taskbarButton?: HTMLButtonElement
): void {
  const { content } = createWindowShell(
    windowsLayer,
    appId,
    title,
    taskbarButton
  );
  content.classList.add("desktop-window__content--text");
  content.innerHTML = bodyHtml;
}

// ---- App router + taskbar behaviour ----

export function openApp(
  windowsLayer: HTMLElement,
  icon: DesktopIcon,
  taskbarButton?: HTMLButtonElement
): void {
  const existing = runningApps.get(icon.appId);

  // If already running → toggle minimize / restore
  if (existing) {
    const win = existing.win;
    if (existing.minimized) {
      win.style.display = "block";
      existing.minimized = false;
      existing.taskbarButton?.classList.remove("taskbar__app-icon--minimized");
      bringToFront(win);
    } else {
      win.style.display = "none";
      existing.minimized = true;
      existing.taskbarButton?.classList.add("taskbar__app-icon--minimized");
    }
    return;
  }

  // Not running → open new window
  switch (icon.appId) {
    case "about":
      openTextWindow(
        windowsLayer,
        icon.appId,
        "About",
        `
          <h1>About me</h1>
          <p>
            This is a placeholder about window.
            Replace this with your real intro / role / vibe.
          </p>
        `,
        taskbarButton
      );
      break;

    case "projects":
      openTextWindow(
        windowsLayer,
        icon.appId,
        "Projects",
        `
          <h1>Projects</h1>
          <p>Highlight a few things you're proud of:</p>
          <ul>
            <li><strong>Project 1</strong> – short one-liner.</li>
            <li><strong>Project 2</strong> – tech / purpose.</li>
            <li><strong>Project 3</strong> – anything fun or weird.</li>
          </ul>
        `,
        taskbarButton
      );
      break;

    case "contact":
      openTextWindow(
        windowsLayer,
        icon.appId,
        "Contact",
        `
          <h1>Contact</h1>
          <ul>
            <li>Email: <a href="mailto:you@example.com">you@example.com</a></li>
            <li>GitHub: <a href="https://github.com/your-handle" target="_blank" rel="noreferrer">github.com/your-handle</a></li>
            <li>LinkedIn: <a href="https://linkedin.com/in/your-handle" target="_blank" rel="noreferrer">linkedin.com/in/your-handle</a></li>
          </ul>
        `,
        taskbarButton
      );
      break;

    case "playground":
      openWebsiteWindow(
        windowsLayer,
        icon.appId,
        "https://inner-portfolio-js.vercel.app/",
        icon.label,
        taskbarButton
      );
      break;

    default:
      openTextWindow(
        windowsLayer,
        icon.appId,
        icon.label,
        `<p>This app isn't wired up yet.</p>`,
        taskbarButton
      );
  }
}
