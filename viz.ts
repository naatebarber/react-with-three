import * as t from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import Child from "./child";

class Scene {
  canvas: HTMLCanvasElement;
  tooltip?: HTMLDivElement;
  renderer: t.WebGLRenderer;
  scene: t.Scene;
  camera: t.PerspectiveCamera;
  light: t.Light;
  composer: EffectComposer;
  raycaster: t.Raycaster;
  mouse: t.Vector2;

  children: Child[];
  shapes: t.Mesh[];

  drift?: {
    from: t.Vector3;
    to: t.Vector3;
    ease: (t: number) => number;
    start?: number;
  };

  controls: OrbitControls;
  last_time: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.tooltip = document.getElementById("tooltip") as any;

    this.children = [];
    this.shapes = [];

    this.init();
    this.mouse = new t.Vector2();
  }

  init() {
    this.scene = new t.Scene();
    this.renderer = new t.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      logarithmicDepthBuffer: true,
    });

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = t.ReinhardToneMapping;
    this.renderer.setSize(w, h);

    this.camera = new t.PerspectiveCamera(
      50,
      this.canvas.width / this.canvas.height,
      0.1,
      2000,
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(0, 25, 5);
    this.controls.update();
    this.controls.enableDamping = true;

    // do shit when the user does shit like a tooltip
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const p = new t.Vector2(
        (x / rect.width) * 2 - 1,
        -((y / rect.height) * 2 - 1),
      );

      this.raycaster.setFromCamera(p, this.camera);
      const intersects = this.raycaster.intersectObjects(
        this.scene.children,
        true,
      );

      for (const intersect of intersects) {
        const tooltip = intersect?.object?.userData?.tooltip;
        if (tooltip) {
          this.tooltip.innerHTML = `
            <div>
              ${Array.isArray(tooltip) ? tooltip.join("<br>") : tooltip}
            </div>
          `;
          this.tooltip.style.display = "block";
          this.tooltip.style.top = y + 2 + "px";
          this.tooltip.style.left = x + 2 + "px";

          return;
        }
      }

      this.tooltip.style.display = "none";
    });

    this.raycaster = new t.Raycaster();

    this.light = new t.HemisphereLight(0xffffff, 0xaaaaaa, 1);
    this.light.position.set(0, 1, 1).normalize();
    this.scene.add(this.light);

    const params = {
      threshold: 0.0,
      strength: 0.05,
      radius: 0.3,
      exposure: 0.2,
    };

    const renderScene = new RenderPass(this.scene, this.camera);

    // Throw in some fun shaders, like bloom effect
    const bloomPass = new UnrealBloomPass(new t.Vector2(w, h), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;

    const outputPass = new OutputPass();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    this.composer.addPass(outputPass);
    this.composer.setSize(w, h);
  }

  resize() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.render();
  }

  async child(child: Child) {
    this.children.push(child);
    await child.apply(this.scene);
  }

  driftTo(to: t.Vector3) {
    const from = this.camera.position.clone();

    const currentL = from.lengthSq();
    const toL = to.lengthSq();
    const ratio = Math.sqrt(currentL / toL);

    this.drift = {
      from: this.camera.position.clone(),
      to: to.clone().multiplyScalar(ratio),
      ease: (t) => 1 - Math.pow(1 - t, 3),
    };
  }

  renderControl(delta: number) {
    this.controls.update(delta);
  }

  renderDrift(ts: number) {
    if (this.drift) {
      if (!this.drift.start) this.drift.start = ts;

      if (ts - this.drift.start > 2000) {
        this.drift = undefined;
        return;
      }

      this.camera.position.lerpVectors(
        this.drift.from,
        this.drift.to,
        this.drift.ease((ts - this.drift.start) / 2000),
      );
      this.controls.update();
    }
  }

  render(t: number) {
    const delta = this.last_time ? (t - this.last_time) / 1000 : 0;
    this.last_time = t;

    this.renderControl(delta);
    // this.renderRaycaster();
    this.renderDrift(t);

    Promise.all(this.children.map((e) => e.render(this.scene))).catch(
      console.log,
    );

    this.composer.render();
  }
}

export default Scene;
