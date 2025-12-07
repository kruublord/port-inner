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
// ---- App registry types ----

type TextAppConfig = {
  kind: "text";
  title: string;
  bodyHtml: string;
};

type WebsiteAppConfig = {
  kind: "website";
  title: string;
  url: string;
};

type PdfAppConfig = {
  kind: "pdf";
  title: string;
  url: string; // path to pdf
};

type AppConfig = TextAppConfig | WebsiteAppConfig | PdfAppConfig;

// ---- App HTML content ----

const ABOUT_APP_HTML = `
  <section class="window-app window-app--about">
    <header class="window-app__header window-app__header--about">
      <h1>About Me</h1>
      <p>
        Curious person who likes making small, playful things people enjoy using.
      </p>
    </header>

    <div class="window-app__about-layout">
      <div class="about-text">
        <h2 class="about-text__name">Curtis Low</h2>
        <p class="about-text__role">Interactive Developer</p>

        <p>
          Hello, I'm Curtis. I like building little experiences that feel
          smooth, friendly, and fun to interact with. I enjoy the moment when
          something simple on a screen suddenly “clicks” and feels right.
        </p>

        <p>
          Most of my time goes into learning, experimenting, and slowly shaping
          my own style of creating things. 
        </p>

        <p>
          Away from the screen, I’m usually recharging with music, games, or
          slow walks with a coffee and a wandering mind.
        </p>
      </div>

      <div class="about-photo">
        <img
          src="/images/photo.webp"
          alt="its me"
        />
      </div>
    </div>
  </section>
`;

const PROJECTS_APP_HTML = `
  <section class="window-app window-app--projects">
    <header class="window-app__header">
      <h1>Projects</h1>
      <p>A simple overview of some things I’ve worked on or might add here later.</p>
    </header>

    <div class="window-app__grid">
      <article class="project-card">
        <h2>Project One</h2>
        <p class="project-card__meta">Short project tagline</p>
        <p>
          A brief description of a project can go here. You might mention what it does,
          why you built it, or what part you enjoyed working on the most.
        </p>
        <ul class="project-card__tags">
          <li>Tech A</li>
          <li>Tech B</li>
          <li>Keyword</li>
        </ul>
      </article>

      <article class="project-card">
        <h2>Project Two</h2>
        <p class="project-card__meta">Another small experiment</p>
        <p>
          Use this space to describe another idea, prototype, or experiment.
          Keep it to a couple of sentences so it’s easy to skim.
        </p>
        <ul class="project-card__tags">
          <li>Framework</li>
          <li>UI</li>
          <li>Experiment</li>
        </ul>
      </article>

      <article class="project-card">
        <h2>Project Three</h2>
        <p class="project-card__meta">Work in progress</p>
        <p>
          This card can be a placeholder for something you’re still exploring.
          You can update the copy later once the idea becomes more concrete.
        </p>
        <ul class="project-card__tags">
          <li>Concept</li>
          <li>Prototype</li>
          <li>WIP</li>
        </ul>
      </article>
    </div>
  </section>
`;
const CONTACT_APP_HTML = `
  <section class="window-app window-app--contact-simple">
    <header class="window-app__header window-app__header--contact">
      <h1>Get in touch</h1>
      <p>
        HELLO!
      </p>
    </header>

    <div class="contact-body">
      <div class="contact-center">
        <form class="contact-form" autocomplete="off">
          <div class="contact-form__row">
            <label for="contact-name">Name</label>
            <input
              id="contact-name"
              name="name"
              type="text"
              placeholder="Your name"
              required
            />
          </div>

          <div class="contact-form__row">
            <label for="contact-email">Your email</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              placeholder="example@mail.com"
              required
            />
          </div>

          <div class="contact-form__row">
            <label for="contact-message">Message</label>
            <textarea
              id="contact-message"
              name="message"
              rows="4"
              placeholder="Write your message..."
              required
            ></textarea>
          </div>

          <div class="contact-form__actions">
            <button type="submit">Send Message</button>
          </div>
        </form>



        <div class="contact-socials">
          <a href="#" aria-label="LinkedIn">
            <i class="fa-brands fa-linkedin"></i>
          </a>
          <a href="https://github.com/kruublord" target="_blank" rel="noreferrer" aria-label="GitHub">
            <i class="fa-brands fa-github"></i>
          </a>

          <a href="mailto:you@example.com" aria-label="Email">
            <i class="fa-regular fa-envelope"></i>
          </a>
        </div>
      </div>

      <p class="contact-footer">PortOS </p>
    </div>
  </section>
`;

// ---- App registry ----

const APP_REGISTRY: Record<string, AppConfig> = {
  about: {
    kind: "text",
    title: "About",
    bodyHtml: ABOUT_APP_HTML,
  },
  projects: {
    kind: "text",
    title: "Projects",
    bodyHtml: PROJECTS_APP_HTML,
  },
  contact: {
    kind: "text",
    title: "Contact",
    bodyHtml: CONTACT_APP_HTML,
  },
  playground: {
    kind: "website",
    title: "Browser",
    url: "https://inner-portfolio-js.vercel.app/",
  },

  resume: {
    kind: "pdf",
    title: "Resume",
    url: "/Resume.pdf",
  },
};

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
  // default size/position: almost full screen
  // default size/position: large but not full screen
  // default size/position: large but not full screen
  const containerRect = windowsLayer.getBoundingClientRect();

  // slightly skinnier
  const widthFactor = 0.65; // was 0.75
  const heightFactor = 0.7; // keep this the same

  const defaultWidth = containerRect.width * widthFactor;
  const defaultHeight = containerRect.height * heightFactor;

  const left = (containerRect.width - defaultWidth) / 2;
  const top = (containerRect.height - defaultHeight) / 2;

  win.style.width = `${defaultWidth}px`;
  win.style.height = `${defaultHeight}px`;
  win.style.left = `${left}px`;
  win.style.top = `${top}px`;

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
export function openPdfWindow(
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

  // Optional nice-to-have attributes
  iframe.setAttribute("title", title);
  iframe.setAttribute("loading", "lazy");

  content.appendChild(iframe);
}

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

  // Not running yet → look up config
  const config = APP_REGISTRY[icon.appId];

  if (!config) {
    // Fallback for unknown apps
    openTextWindow(
      windowsLayer,
      icon.appId,
      icon.label,
      `<p>This app isn't wired up yet.</p>`,
      taskbarButton
    );
    return;
  }

  if (config.kind === "text") {
    openTextWindow(
      windowsLayer,
      icon.appId,
      config.title,
      config.bodyHtml,
      taskbarButton
    );
  } else if (config.kind === "website") {
    openWebsiteWindow(
      windowsLayer,
      icon.appId,
      config.url,
      config.title,
      taskbarButton
    );
  } else if (config.kind === "pdf") {
    openPdfWindow(
      windowsLayer,
      icon.appId,
      config.url,
      config.title,
      taskbarButton
    );
  }
}
