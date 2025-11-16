// src/background.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class FireplaceBackground {
  private root: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private clock: THREE.Clock;
  private animationId: number | null = null;

  private islandRoot: THREE.Object3D | null = null;

  constructor(root: HTMLElement) {
    this.root = root;

    const rect = this.root.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    // Canvas + renderer
    const canvas = document.createElement("canvas");
    canvas.className = "bg-canvas";
    this.root.prepend(canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    // Base background (will be covered by skybox sphere)
    this.renderer.setClearColor(0x87ceff, 1); // bright sky blue

    // Scene
    this.scene = new THREE.Scene();

    // Bright daylight skybox (big inverted sphere)
    this.setupSky();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    this.camera.position.set(10, 4, 0);
    this.camera.lookAt(0, 2, 0);

    // Lights – simple sunny setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const sun = new THREE.DirectionalLight(0xfff2cc, 1.0);
    sun.position.set(10, 15, 5);

    const coolFill = new THREE.DirectionalLight(0x6ba7ff, 0.3);
    coolFill.position.set(-8, 5, -6);

    this.scene.add(ambient, sun, coolFill);

    // Optional: soft “shadow/halo” disc under the island
    this.setupHalo();

    // Load your floating island model
    this.loadIsland("/models/island.glb");

    this.clock = new THREE.Clock();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  // ──────────────────────────────────────────────
  // Scene setup helpers
  // ──────────────────────────────────────────────

  private setupSky() {
    const skyGeom = new THREE.SphereGeometry(80, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceff, // bright blue sky
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(sky);
  }

  private setupHalo() {
    const haloGeom = new THREE.CircleGeometry(6, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4b5563,
      transparent: true,
      opacity: 0.18,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.01;
    this.scene.add(halo);
  }

  private loadIsland(url: string) {
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        this.islandRoot = gltf.scene;

        // Flatten shading if materials support it (for low-poly look)
        this.islandRoot.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;

            const mat = mesh.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) {
              mat.forEach((m) => {
                if ("flatShading" in m) {
                  (m as THREE.MeshStandardMaterial).flatShading = true;
                  (m as THREE.MeshStandardMaterial).needsUpdate = true;
                }
              });
            } else if (mat && "flatShading" in mat) {
              (mat as THREE.MeshStandardMaterial).flatShading = true;
              (mat as THREE.MeshStandardMaterial).needsUpdate = true;
            }
          }
        });

        // Center & scale nicely
        this.normalizeIsland(this.islandRoot);

        this.scene.add(this.islandRoot);
        console.log("Island model loaded:", gltf);
      },
      undefined,
      (error) => {
        console.error("Error loading island GLB:", error);
      }
    );
  }

  /**
   * Center the island so its bottom is at y = 0 and its center is at (0,0,0),
   * then scale so its height is reasonable.
   */
  private normalizeIsland(root: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Bottom-center point
    const center = new THREE.Vector3(
      (box.min.x + box.max.x) / 2,
      box.min.y, // bottom
      (box.min.z + box.max.z) / 2
    );

    // Move the model so bottom-center is at origin
    root.position.sub(center);

    // Scale based on height so the island fits nicely
    const targetHeight = 6; // tweak this if island feels too big/small
    if (size.y > 0) {
      const s = targetHeight / size.y;
      root.scale.setScalar(s);
    }

    // Lift slightly so it feels like floating
    root.position.y += 0.5;
  }

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.renderer.dispose();
  }

  // ──────────────────────────────────────────────
  // Animation loop
  // ──────────────────────────────────────────────

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();

    // Determine the orbit center: island position in world space
    const target = new THREE.Vector3(0, 0, 0);
    if (this.islandRoot) {
      this.islandRoot.getWorldPosition(target);
    }

    // Camera orbit parameters
    const radius = 10; // distance from island
    const orbitSpeed = 0.18; // radians per second
    const angle = elapsed * orbitSpeed;

    // Gentle vertical bob of the camera
    const camHeight = target.y + 4 + Math.sin(elapsed * 0.4) * 0.4;

    // Camera moves around island, island stays centered in view
    this.camera.position.set(
      target.x + Math.cos(angle) * radius,
      camHeight,
      target.z + Math.sin(angle) * radius
    );
    this.camera.lookAt(target.x, target.y + 2, target.z);

    this.renderer.render(this.scene, this.camera);
  }
}
