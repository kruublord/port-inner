// src/duckController.ts

export class DuckController {
  private root: HTMLElement;
  private el: HTMLDivElement;

  // visual size of the goose container
  private readonly size = 72; // px

  // movement
  private duckX = 0;
  private duckY = 0;
  private targetX = 0;
  private targetY = 0;
  private readonly followFactor = 0.12; // how “sticky” to the cursor

  // orientation / squash
  private facing: 1 | -1 = 1; // 1 = right, -1 = left
  private currentAngleDeg = 0;

  // for velocity
  private prevX = 0;
  private prevY = 0;

  // loop timing
  private lastTime: number | null = null;
  private rafId: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;

    this.el = this.createDuckElement();
    this.root.appendChild(this.el);

    // start somewhere near bottom-left-ish
    const rect = this.root.getBoundingClientRect();
    this.duckX = rect.width * 0.2;
    this.duckY = rect.height * 0.7;
    this.targetX = this.duckX;
    this.targetY = this.duckY;
    this.prevX = this.duckX;
    this.prevY = this.duckY;

    this.applyTransform();

    this.setupMouseTracking();
    this.startLoop();
  }

  // Call this if you ever need to remove the duck/clean up
  public destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.root.removeEventListener("mousemove", this.handleMouseMove);
    if (this.el.parentElement) {
      this.el.parentElement.removeChild(this.el);
    }
  }

  // ---------- internal helpers ----------

  private createDuckElement(): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "desktop-duck";
    el.style.position = "absolute";
    el.style.width = `${this.size}px`;
    el.style.height = `${this.size}px`;
    el.style.pointerEvents = "none";
    el.style.zIndex = "9999";
    // rotate around feet-ish
    el.style.transformOrigin = "50% 80%";

    // build the goose out of simple shapes
    const body = document.createElement("div");
    body.className = "duck-body";

    const neck = document.createElement("div");
    neck.className = "duck-neck";

    const head = document.createElement("div");
    head.className = "duck-head";

    const eye = document.createElement("div");
    eye.className = "duck-eye";

    const beak = document.createElement("div");
    beak.className = "duck-beak";

    const foot = document.createElement("div");
    foot.className = "duck-foot";

    head.appendChild(eye);
    head.appendChild(beak);
    neck.appendChild(head);
    body.appendChild(neck);
    body.appendChild(foot);
    el.appendChild(body);

    return el;
  }

  private setupMouseTracking() {
    // bind once to keep same reference for add/removeEventListener
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.root.addEventListener("mousemove", this.handleMouseMove);
  }

  private handleMouseMove(event: MouseEvent) {
    const rect = this.root.getBoundingClientRect();

    // cursor in root coordinates
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    const size = this.size;

    // offset so duck follows slightly behind cursor, not directly under
    const offsetX = size * 0.3;
    const offsetY = size * 0.1;

    x -= offsetX;
    y -= offsetY;

    // clamp inside the desktop area
    const maxX = rect.width - size;
    const maxY = rect.height - size;

    this.targetX = Math.max(0, Math.min(x, maxX));
    this.targetY = Math.max(0, Math.min(y, maxY));
  }

  private startLoop() {
    const loop = (timestamp: number) => {
      if (this.lastTime === null) {
        this.lastTime = timestamp;
      }
      const dt = timestamp - this.lastTime; // ms
      this.lastTime = timestamp;

      this.update(dt);

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private update(_dtMs: number) {
    // previous position for velocity
    const prevX = this.duckX;
    const prevY = this.duckY;

    // --- movement towards target ---
    const dxToTarget = this.targetX - this.duckX;
    const dyToTarget = this.targetY - this.duckY;

    this.duckX += dxToTarget * this.followFactor;
    this.duckY += dyToTarget * this.followFactor;

    // velocity this frame
    const vx = this.duckX - prevX;
    const vy = this.duckY - prevY;
    const speed = Math.hypot(vx, vy);

    // facing direction (left / right)
    if (vx > 0.4) {
      this.facing = 1;
    } else if (vx < -0.4) {
      this.facing = -1;
    }

    // -------- body dynamics: lean & squash --------

    // normalize speed to [0, 1] for visual effects
    const maxUsefulSpeed = 8; // tweak
    const normSpeed = Math.min(speed / maxUsefulSpeed, 1);

    // lean into movement: more speed = more lean
    const maxLeanDeg = 22; // tweak
    const leanDirection = this.facing; // lean forward relative to facing
    const leanDeg = maxLeanDeg * normSpeed * leanDirection;

    // squash / stretch: tiny bit wider & shorter when moving
    const baseScale = 1.0;
    const stretchX = 1 + normSpeed * 0.2;
    const squashY = 1 - normSpeed * 0.12;

    const scaleX = baseScale * stretchX;
    const scaleY = baseScale * squashY;

    this.currentAngleDeg = leanDeg;

    this.applyTransform(scaleX, scaleY);
  }

  private applyTransform(scaleX = 1, scaleY = 1) {
    // translate so (duckX, duckY) is top-left of the element
    const signedScaleX = scaleX * this.facing;

    this.el.style.transform = `
      translate(${this.duckX}px, ${this.duckY}px)
      rotate(${this.currentAngleDeg}deg)
      scale(${signedScaleX}, ${scaleY})
    `;
  }
}
