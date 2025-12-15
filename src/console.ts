// src/console.ts
// CMD-style console (single buffer + prompt + commands like cls/help/echo)

export type ConsoleContext = {
  openAppById?: (appId: string) => void;
  listAppIds?: () => string[];
  // optional: override the prompt label (if you want it to reflect something dynamic later)
  promptPath?: string; // e.g. "C:\\Users\\curtl"
};

export const CONSOLE_APP_HTML = `
  <section class="window-app window-app--console" aria-label="Console">
    <div class="cmd" data-role="cmd">
      <div class="cmd__buffer" data-role="buffer" aria-label="Command Prompt output"></div>

      <div class="cmd__entry" data-role="entry">
        <span class="cmd__prompt" data-role="prompt"></span>
        <input
          class="cmd__input"
          data-role="input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          aria-label="Command input"
        />
      </div>
    </div>
  </section>
`;

export function initConsoleApp(
  windowContentRoot: HTMLElement,
  ctx: ConsoleContext = {}
): void {
  const root = windowContentRoot.querySelector<HTMLElement>(
    ".window-app--console"
  );
  if (!root) return;

  const cmdRoot = root.querySelector<HTMLElement>('[data-role="cmd"]');
  const buffer = root.querySelector<HTMLDivElement>('[data-role="buffer"]');
  const entry = root.querySelector<HTMLDivElement>('[data-role="entry"]');
  const promptEl = root.querySelector<HTMLSpanElement>('[data-role="prompt"]');
  const input = root.querySelector<HTMLInputElement>('[data-role="input"]');

  if (!cmdRoot || !buffer || !entry || !promptEl || !input) return;

  // --- prompt ---
  const promptPath = ctx.promptPath ?? "C:\\Users\\curtl";
  const promptText = () => `${promptPath}>`;

  promptEl.textContent = promptText();

  // --- state ---
  const history: string[] = [];
  let historyIndex = -1;

  const scrollToBottom = () => {
    cmdRoot.scrollTop = cmdRoot.scrollHeight;
  };

  const appendLine = (text: string) => {
    const line = document.createElement("div");
    line.className = "cmd__line";
    line.textContent = text;
    buffer.appendChild(line);
    scrollToBottom();
  };

  const appendBlank = () => {
    const line = document.createElement("div");
    line.className = "cmd__line";
    line.innerHTML = "&nbsp;";
    buffer.appendChild(line);
    scrollToBottom();
  };

  const appendCommandEcho = (raw: string) => {
    appendLine(`${promptText()}${raw}`);
  };

  const clearScreen = () => {
    buffer.innerHTML = "";
  };

  const unknown = (cmd: string) => {
    appendLine(
      `'${cmd}' is not recognized as an internal or external command,`
    );
    appendLine("operable program or batch file.");
  };

  // --- command handlers (CMD-ish) ---
  const run = (raw: string) => {
    const trimmed = raw.trim();

    // Always echo prompt line (CMD shows prompt even for empty input)
    appendCommandEcho(trimmed);

    if (!trimmed) {
      // just prints a new prompt line; do nothing else
      return;
    }

    // history
    history.unshift(trimmed);
    historyIndex = -1;

    const [cmdRaw, ...args] = splitArgs(trimmed);
    const cmd = (cmdRaw || "").toLowerCase();

    switch (cmd) {
      case "help": {
        appendLine(
          "For more information on a specific command, type HELP command-name"
        );
        appendBlank();
        appendLine("CLS        Clears the screen.");
        appendLine(
          "ECHO       Displays messages, or turns command echoing on or off."
        );
        appendLine(
          "HELP       Provides Help information for Windows commands."
        );
        appendLine("TIME       Displays the system time.");
        appendLine("WHOAMI     Displays a fake identity string.");
        appendLine("APPS       Lists PortOS apps.");
        appendLine("OPEN       Opens a PortOS app. Usage: OPEN <appId>");
        appendBlank();
        break;
      }

      case "cls": {
        clearScreen();
        break;
      }

      case "echo": {
        appendLine(args.join(" "));
        break;
      }

      case "time": {
        appendLine(new Date().toLocaleTimeString());
        break;
      }

      case "whoami": {
        appendLine("portos\\curtl");
        break;
      }

      // PortOS extras (still feel “cmd-like”)
      case "apps": {
        const ids = ctx.listAppIds?.() ?? [];
        if (!ids.length) {
          appendLine("No app list available.");
        } else {
          appendLine(ids.join("  "));
        }
        break;
      }

      case "open": {
        const target = args[0];
        if (!target) {
          appendLine("Usage: OPEN <appId>");
          break;
        }
        if (!ctx.openAppById) {
          appendLine("OPEN is not wired (missing openAppById).");
          break;
        }
        ctx.openAppById(target);
        break;
      }

      default: {
        unknown(cmdRaw);
        break;
      }
    }
  };

  // --- boot banner (Windows-ish) ---
  appendLine("Microsoft Windows [Version 10.0.26200.7171]");
  appendLine("(c) Microsoft Corporation. All rights reserved.");
  appendBlank();

  // NOTE: that last appendLine prints a prompt line in buffer; we also have a live prompt+input at bottom.
  // If you want it EXACTLY like CMD, keep the buffer prompt line. If you prefer cleaner, remove that line.

  // --- events ---
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = input.value;
      input.value = "";
      run(value);
      return;
    }

    // history
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      input.value = history[historyIndex] ?? "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!history.length) return;
      historyIndex = Math.max(historyIndex - 1, -1);
      input.value = historyIndex === -1 ? "" : history[historyIndex] ?? "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }
  });

  // Click anywhere focuses input
  cmdRoot.addEventListener("mousedown", () => {
    queueMicrotask(() => input.focus());
  });

  queueMicrotask(() => input.focus());
}

// ---- parsing helpers ----
function splitArgs(s: string): string[] {
  // supports quoted args: echo "hello world"
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && /\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  if (cur) out.push(cur);
  return out;
}
