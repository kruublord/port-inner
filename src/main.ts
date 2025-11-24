// src/main.ts
import "./style.css";
import { initDesktop } from "./desktop";

const root = document.getElementById("desktop-root");

if (root instanceof HTMLElement) {
  initDesktop(root);
} else {
  console.error("desktop-root element not found");
}
