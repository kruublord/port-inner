// src/main.ts
import "./style.css";
import { FireplaceBackground } from "./background";

function initDesktop() {
  const root = document.querySelector<HTMLDivElement>("#desktop-root");
  if (!root) {
    throw new Error("Could not find #desktop-root element");
  }

  // Clear anything existing
  root.innerHTML = "";

  // Icons layer (desktop shortcuts)
  const iconsLayer = document.createElement("div");
  iconsLayer.className = "desktop-icons";

  // Windows layer (all app windows live here)
  const windowsLayer = document.createElement("div");
  windowsLayer.className = "desktop-windows";

  // Taskbar (bottom bar)
  const taskbar = document.createElement("div");
  taskbar.className = "desktop-taskbar";

  const taskbarLeft = document.createElement("div");
  taskbarLeft.className = "taskbar-left";
  taskbarLeft.textContent = "portOS";

  const taskbarRight = document.createElement("div");
  taskbarRight.className = "taskbar-right";
  taskbarRight.textContent = "00:00";

  taskbar.appendChild(taskbarLeft);
  taskbar.appendChild(taskbarRight);

  // Append layers in order:
  // FireplaceBackground will prepend its canvas to root
  root.appendChild(iconsLayer);
  root.appendChild(windowsLayer);
  root.appendChild(taskbar);

  // 3D campfire background
  const bg = new FireplaceBackground(root);

  const handleResize = () => {
    const rect = root.getBoundingClientRect();
    bg.resize(rect.width, rect.height);
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  // Optional: expose for debugging / tweaking from console
  (window as any).portOsBg = bg;
}

initDesktop();
