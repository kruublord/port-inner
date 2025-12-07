import "./style.css";
import { initDesktop } from "./desktop";
import { WallpaperManager } from "./wallpaper";
import type { WallpaperType } from "./wallpaper";
//import { initDuck } from "./duck";

const root = document.getElementById("desktop-root");

if (root instanceof HTMLElement) {
  initDesktop(root);

  const wallpaper = new WallpaperManager(root);

  // pick one: "birds" | "waves" | "fog"
  const current: WallpaperType = "waves";
  wallpaper.setWallpaper(current);

  // Initialize the cursor-following duck!
  //  initDuck(root);

  // Optional: You can adjust duck speed
  // duck.setSpeed(0.1); // Higher = faster (default is 0.08)
} else {
  console.error("desktop-root element not found");
}
