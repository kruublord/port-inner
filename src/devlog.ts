// src/devlog.ts
// Simple Dev Log feed (seed posts only, scrollable, no edits/persistence)
//
// Wiring in window.ts:
// 1) import { DEVLOG_APP_HTML, initDevLogApp } from "./devlog";
// 2) APP_REGISTRY.devlog = { kind:"text", title:"Dev Log", bodyHtml: DEVLOG_APP_HTML }
// 3) inside openTextWindow(): if (appId === "devlog") initDevLogApp(content);

export interface DevLogPost {
  id: string;
  title: string;
  dateISO: string; // ISO string (used for display)
  bodyHtml: string; // trusted HTML you wrote (h2, ul, p, etc.)
}

export const DEVLOG_APP_HTML = `
  <section class="window-app window-app--devlog" aria-label="Dev Log">
    <header class="window-app__header">
      <h1>Dev Log</h1>
      <p>Patch notes & progress updates.</p>
    </header>

    <div class="devlog-feed" data-role="feed" aria-label="Dev log feed"></div>
  </section>
`;

// Order = display order. No sorting.
const POSTS: DevLogPost[] = [
  {
    id: "2025-12-13-devlog",
    title: "Dev Log app shipped",
    dateISO: "2025-12-13T01:00:00.000Z",
    bodyHtml: `
      <h2>Dev Log</h2>
      <p>Added a Steam-style dev log viewer inside PortOS.</p>
      <ul>
        <li>Scroll feed of posts</li>
        <li>Date pinned to bottom-right of each entry</li>
      </ul>
    `,
  },
  {
    id: "2025-12-10-windows",
    title: "Window shell improvements",
    dateISO: "2025-12-10T10:00:00.000Z",
    bodyHtml: `
      <h2>Window shell</h2>  
      <ul>
        <li>Draggable via titlebar</li>
        <li>Resize handles on all edges + corners</li>
      </ul>
      <p>Next: snapping + better constraints on small viewports.</p>
    `,
  },
];

export function initDevLogApp(windowContentRoot: HTMLElement): void {
  const appRoot = windowContentRoot.querySelector<HTMLElement>(
    ".window-app--devlog"
  );
  if (!appRoot) return;

  const feedEl = appRoot.querySelector<HTMLElement>('[data-role="feed"]');
  if (!feedEl) return;

  feedEl.innerHTML = "";

  for (const post of POSTS) {
    const entry = document.createElement("article");
    entry.className = "devlog-entry";
    entry.dataset.postId = post.id;

    // Title is escaped; bodyHtml is assumed trusted (you authored it)
    entry.innerHTML = `
      <div class="devlog-entry__inner">
        <h2 class="devlog-entry__title">${escapeHtml(post.title)}</h2>
        <div class="devlog-entry__body">${post.bodyHtml}</div>
        <div class="devlog-entry__date">${formatDate(post.dateISO)}</div>
      </div>
    `;

    feedEl.appendChild(entry);
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
