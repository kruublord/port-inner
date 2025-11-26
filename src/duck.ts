// src/duck.ts

export class Duck {
  private container: HTMLElement;
  private duckBody: HTMLElement;
  private x: number = 0;
  private y: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private speed: number = 0.08;
  private angle: number = 0;
  private targetAngle: number = 0;
  private animationFrame: number | null = null;
  private isWalking: boolean = false;

  constructor(parent: HTMLElement) {
    const { container, body } = this.createDuckElement();
    this.container = container;
    this.duckBody = body;
    parent.appendChild(this.container);

    // Start in center
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.targetX = this.x;
    this.targetY = this.y;

    this.setupEventListeners();
    this.animate();
  }

  private createDuckElement(): { container: HTMLElement; body: HTMLElement } {
    const container = document.createElement("div");
    container.className = "desktop-duck";

    const body = document.createElement("div");
    body.className = "duck-body";
    body.innerHTML = `
      <svg width="80" height="80" viewBox="0 0 80 80" class="duck-svg">
        <!-- Shadow (draw first, underneath) -->
        <ellipse cx="40" cy="64" rx="18" ry="4" fill="rgba(0,0,0,0.1)"/>
        
        <!-- Body (round/oval) -->
        <ellipse cx="35" cy="45" rx="20" ry="16" fill="white"/>
        
        <!-- Neck (elongated, better connected to body) -->
        <ellipse cx="50" cy="35" rx="6" ry="13" fill="white"/>
        
        <!-- Head (small round) -->
        <circle cx="54" cy="24" r="9" fill="white"/>
        
        <!-- Beak (orange, longer and lower) -->
        <ellipse cx="61" cy="25" rx="7" ry="3" fill="#FFA500"/>
        
        <!-- Eye -->
        <circle cx="53" cy="23" r="2.5" fill="#000"/>
        
        <!-- Feet (lower and more centered under body) -->
        <g class="duck-feet">
          <!-- Left foot -->
          <ellipse cx="32" cy="60" rx="4.5" ry="3" fill="#FFA500"/>
          <!-- Right foot -->
          <ellipse cx="42" cy="60" rx="4.5" ry="3" fill="#FFA500"/>
        </g>
      </svg>
    `;

    container.appendChild(body);
    return { container, body };
  }

  private setupEventListeners(): void {
    window.addEventListener("mousemove", (e) => {
      this.targetX = e.clientX;
      this.targetY = e.clientY;
    });
  }

  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  private updateTransform(): void {
    // Use the angle directly from atan2
    // 0° = right, 90° = down, 180° = left, -90° = up

    // Normalize to 0-360 for flipping logic
    let normalizedAngle = this.angle % 360;
    if (normalizedAngle < 0) normalizedAngle += 360;

    // Flip horizontally when facing left (90-270 degrees)
    const facingLeft = normalizedAngle > 90 && normalizedAngle < 270;

    if (facingLeft) {
      // Flip horizontally and adjust rotation to compensate
      const adjustedAngle = 180 - normalizedAngle;
      this.duckBody.style.transform = `scaleX(-1) rotate(${adjustedAngle}deg)`;
    } else {
      // Normal orientation - just rotate
      this.duckBody.style.transform = `rotate(${this.angle}deg)`;
    }
  }

  private animate = (): void => {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Always calculate target angle when there's any movement
    if (distance > 0.1) {
      this.targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    }

    // Update position with easing if far enough
    if (distance > 1) {
      this.x += dx * this.speed;
      this.y += dy * this.speed;
      this.isWalking = true;
    } else {
      this.isWalking = false;
    }

    // Always smooth the angle toward target - SLOWER for smoother turning
    const angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
    this.angle += angleDiff * 0.05; // Reduced from 0.15 to 0.05 for smoother rotation

    // Normalize the current angle to prevent crazy values
    this.angle = this.normalizeAngle(this.angle);

    // Update container position
    this.container.style.left = `${this.x}px`;
    this.container.style.top = `${this.y}px`;

    // Always update transform
    this.updateTransform();

    // Add walking animation class
    if (this.isWalking) {
      this.container.classList.add("duck-walking");
    } else {
      this.container.classList.remove("duck-walking");
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.container.remove();
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }
}

export function initDuck(root: HTMLElement): Duck {
  return new Duck(root);
}
