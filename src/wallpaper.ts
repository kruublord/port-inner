// src/wallpaper.ts

export type WallpaperType = "birds" | "waves" | "fog";

export class WallpaperManager {
  private root: HTMLElement;
  private container: HTMLDivElement;
  private vantaEffect?: any;

  constructor(desktopRoot: HTMLElement) {
    this.root = desktopRoot;

    const existing = this.root.querySelector<HTMLDivElement>(
      ".desktop-wallpaper-layer"
    );
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement("div");
      this.container.className = "desktop-wallpaper-layer";
      this.root.prepend(this.container);
    }
  }

  /** Public API: choose which wallpaper to show */
  setWallpaper(type: WallpaperType) {
    this.destroy();

    if (!window.VANTA) {
      console.error("VANTA not available on window");
      return;
    }

    if (type === "birds") {
      this.initBirds();
    } else if (type === "waves") {
      this.initWaves();
    } else if (type === "fog") {
      this.initFog();
    }
  }

  // ---------- BIRDS ----------

  private initBirds() {
    if (!window.VANTA.BIRDS) {
      console.error("VANTA.BIRDS not loaded (check script tag)");
      return;
    }

    this.vantaEffect = window.VANTA.BIRDS({
      el: this.container,

      mouseControls: true,
      touchControls: true,
      gyroControls: false,

      backgroundAlpha: 0.0,
      backgroundColor: 0x050609,

      color1: 0x6ea8ff,
      color2: 0xffffff,

      birdSize: 0.9,
      wingSpan: 22.0,
      speedLimit: 3.0,

      // more spread out
      quantity: 4,
      separation: 80.0,
      cohesion: 6,
      alignment: 18.0,

      scale: 1.5,
      scaleMobile: 1.5,
    });
  }

  // ---------- WAVES ----------

  private initWaves() {
    if (!window.VANTA.WAVES) {
      console.error("VANTA.WAVES not loaded (check script tag)");
      return;
    }

    this.vantaEffect = window.VANTA.WAVES({
      el: this.container,

      mouseControls: true,
      touchControls: true,
      gyroControls: false,

      backgroundAlpha: 0.0, // keep your own desktop gradient
      backgroundColor: 0x050609, // fallback

      color: 0x45679b, // wave color
      shininess: 10,
      waveHeight: 10,
      waveSpeed: 0.3,
      zoom: 1.25,
    });
  }

  // ---------- FOG ----------

  private initFog() {
    if (!window.VANTA.FOG) {
      console.error("VANTA.FOG not loaded (check script tag)");
      return;
    }

    this.vantaEffect = window.VANTA.FOG({
      el: this.container,

      mouseControls: false, // fog is nicer as a calm background
      touchControls: false,
      gyroControls: false,

      backgroundAlpha: 0.0,
      baseColor: 0x050609, // underneath
      highlightColor: 0x6ea8ff, // bright edges
      midtoneColor: 0x2b4c7e,
      lowlightColor: 0x050609,

      blurFactor: 0.55,
      speed: 0.7,
      zoom: 0.9,
    });
  }

  // ---------- CLEANUP ----------

  destroy() {
    if (this.vantaEffect) {
      this.vantaEffect.destroy();
      this.vantaEffect = undefined;
    }
  }
}
