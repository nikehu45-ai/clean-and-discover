import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TOOLS } from '../data/levels';
import type { LevelDefinition, ObjectKind, ToolId } from '../types';
import { GRID_HEIGHT, GRID_WIDTH, type CleaningState } from './mask';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  OBJECT_RECT,
  type Particle,
  type PointerVisual,
} from './render';

interface UvPoint {
  u: number;
  v: number;
}

interface SurfaceSize {
  width: number;
  height: number;
}

const SURFACE_SIZES: Record<ObjectKind, SurfaceSize> = {
  rug: { width: 4.65, height: 6.2 },
  sneaker: { width: 5.1, height: 5.5 },
  sofa: { width: 5.2, height: 5.8 },
  window: { width: 4.85, height: 6.35 },
  'large-rug': { width: 5.3, height: 7.05 },
};

const dirtColors = {
  mud: new THREE.Color('#4b3020'),
  dust: new THREE.Color('#66706d'),
  oil: new THREE.Color('#2e261b'),
  hair: new THREE.Color('#282421'),
};

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function addCanvasGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opacity = 0.07,
): void {
  const image = ctx.getImageData(0, 0, width, height);
  for (let index = 0; index < image.data.length; index += 4) {
    const noise = (Math.random() - 0.5) * 260 * opacity;
    image.data[index] = Math.max(0, Math.min(255, image.data[index] + noise));
    image.data[index + 1] = Math.max(0, Math.min(255, image.data[index + 1] + noise));
    image.data[index + 2] = Math.max(0, Math.min(255, image.data[index + 2] + noise));
  }
  ctx.putImageData(image, 0, 0);
}

function createObjectTexture(level: LevelDefinition): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Texture canvas is unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (level.objectKind === 'rug' || level.objectKind === 'large-rug') {
    const margin = level.objectKind === 'large-rug' ? 22 : 30;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, level.palette.base);
    gradient.addColorStop(0.52, '#f0e8d4');
    gradient.addColorStop(1, level.palette.base);
    roundedPath(ctx, margin, 18, canvas.width - margin * 2, canvas.height - 36, 28);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = level.palette.accent;
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.strokeStyle = level.palette.pattern;
    ctx.lineWidth = 7;
    ctx.strokeRect(margin + 36, 64, canvas.width - margin * 2 - 72, canvas.height - 128);

    ctx.save();
    ctx.translate(256, 338);
    ctx.fillStyle = level.palette.accent;
    ctx.beginPath();
    const points = level.objectKind === 'large-rug' ? 20 : 16;
    for (let point = 0; point < points; point += 1) {
      const angle = (point / points) * Math.PI * 2;
      const radius = point % 2 === 0 ? 118 : 88;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = level.palette.pattern;
    ctx.lineWidth = 10;
    ctx.stroke();

    if (level.objectKind === 'large-rug') {
      ctx.fillStyle = '#d5b96d';
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#735b36';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.fillStyle = '#735b36';
      ctx.font = '700 46px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('旧', 0, 4);
    } else {
      ctx.fillStyle = level.palette.base;
      ctx.beginPath();
      ctx.ellipse(0, 8, 59, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-42, -29);
      ctx.lineTo(-60, -78);
      ctx.lineTo(-13, -51);
      ctx.moveTo(42, -29);
      ctx.lineTo(60, -78);
      ctx.lineTo(13, -51);
      ctx.fill();
      ctx.strokeStyle = level.palette.pattern;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-29, 0);
      ctx.lineTo(-16, 7);
      ctx.moveTo(29, 0);
      ctx.lineTo(16, 7);
      ctx.moveTo(-8, 30);
      ctx.quadraticCurveTo(0, 39, 8, 30);
      ctx.stroke();
    }

    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      ctx.save();
      ctx.translate(Math.cos(angle) * 176, Math.sin(angle) * 250);
      ctx.rotate(angle);
      ctx.fillStyle = index % 2 ? level.palette.pattern : level.palette.accent;
      ctx.fillRect(-10, -16, 20, 32);
      ctx.restore();
    }
    ctx.restore();
    addCanvasGrain(ctx, canvas.width, canvas.height, 0.035);
    return canvas;
  }

  if (level.objectKind === 'sneaker') {
    ctx.save();
    ctx.translate(256, 345);
    ctx.rotate(-0.13);
    const sole = ctx.createLinearGradient(0, 140, 0, 220);
    sole.addColorStop(0, '#e5e8e5');
    sole.addColorStop(1, '#aab2ae');
    roundedPath(ctx, -210, 88, 420, 112, 50);
    ctx.fillStyle = sole;
    ctx.fill();
    ctx.strokeStyle = '#737e7c';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-182, 86);
    ctx.lineTo(-148, -88);
    ctx.quadraticCurveTo(-72, -154, 5, -62);
    ctx.quadraticCurveTo(86, -6, 178, 20);
    ctx.quadraticCurveTo(224, 50, 204, 105);
    ctx.closePath();
    ctx.fillStyle = level.palette.base;
    ctx.fill();
    ctx.strokeStyle = level.palette.accent;
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.fillStyle = level.palette.pattern;
    ctx.beginPath();
    ctx.moveTo(-124, 54);
    ctx.lineTo(-67, -64);
    ctx.lineTo(25, -38);
    ctx.lineTo(-4, 54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#778885';
    ctx.lineWidth = 6;
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath();
      ctx.moveTo(-66 + index * 18, -44 + index * 5);
      ctx.lineTo(0 + index * 14, 42 + index * 2);
      ctx.stroke();
    }
    ctx.restore();
    addCanvasGrain(ctx, canvas.width, canvas.height, 0.045);
    return canvas;
  }

  if (level.objectKind === 'sofa') {
    const fabric = ctx.createLinearGradient(0, 0, 512, 680);
    fabric.addColorStop(0, '#d5e3e2');
    fabric.addColorStop(0.55, level.palette.base);
    fabric.addColorStop(1, '#789a9d');
    roundedPath(ctx, 42, 86, 428, 478, 48);
    ctx.fillStyle = fabric;
    ctx.fill();
    ctx.strokeStyle = level.palette.accent;
    ctx.lineWidth = 12;
    ctx.stroke();
    for (let index = 0; index < 2; index += 1) {
      roundedPath(ctx, 75 + index * 183, 314, 170, 176, 28);
      ctx.fillStyle = index ? '#a8c3c5' : '#c3d6d6';
      ctx.fill();
      ctx.strokeStyle = 'rgba(52,87,89,.55)';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    roundedPath(ctx, 92, 132, 132, 145, 26);
    ctx.fillStyle = level.palette.pattern;
    ctx.fill();
    ctx.fillStyle = level.palette.accent;
    ctx.beginPath();
    ctx.arc(158, 204, 34, 0, Math.PI * 2);
    ctx.fill();
    addCanvasGrain(ctx, canvas.width, canvas.height, 0.06);
    return canvas;
  }

  const glass = ctx.createLinearGradient(0, 0, 512, 680);
  glass.addColorStop(0, '#9ac7d0');
  glass.addColorStop(0.45, '#d8e8e7');
  glass.addColorStop(1, '#587f8a');
  roundedPath(ctx, 34, 30, 444, 620, 24);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = '#516a6d';
  ctx.lineWidth = 22;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245,251,249,.72)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(256, 42);
  ctx.lineTo(256, 638);
  ctx.moveTo(45, 340);
  ctx.lineTo(467, 340);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  for (let index = 0; index < 26; index += 1) {
    const x = 58 + ((index * 79) % 390);
    const y = 54 + ((index * 113) % 560);
    ctx.beginPath();
    ctx.arc(x, y, index % 4 === 0 ? 3 : 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function createFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Floor texture canvas is unavailable');
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#dfe5e2');
  gradient.addColorStop(0.5, '#cbd3d0');
  gradient.addColorStop(1, '#e8ece9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#aeb9b6';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(255,255,255,.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(7, 7, 498, 498);
  addCanvasGrain(ctx, 512, 512, 0.025);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  texture.anisotropy = 8;
  return texture;
}

function material(
  color: THREE.ColorRepresentation,
  roughness = 0.62,
  metalness = 0.08,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addShadowMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  meshMaterial: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addCylinderBetween(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  color: THREE.ColorRepresentation,
): void {
  const delta = end.clone().sub(start);
  const length = delta.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 14),
    material(color, 0.45, 0.18),
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  group.add(mesh);
}

export class ThreeCleaningRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly level: LevelDefinition;
  private readonly objectRoot = new THREE.Group();
  private readonly surfaceRoot = new THREE.Group();
  private readonly surfaceSize: SurfaceSize;
  private readonly dirtCanvas = document.createElement('canvas');
  private readonly dirtContext: CanvasRenderingContext2D;
  private readonly dirtTexture: THREE.CanvasTexture;
  private readonly dirtMaterial: THREE.MeshStandardMaterial;
  private readonly surfaceMesh: THREE.Mesh;
  private readonly dirtMesh: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly pointerWorld = new THREE.Vector3();
  private readonly particleGeometry = new THREE.BufferGeometry();
  private readonly particlePoints: THREE.Points;
  private toolModel = new THREE.Group();
  private footprint: THREE.Mesh;
  private activeTool: ToolId | null = null;

  constructor(canvas: HTMLCanvasElement, level: LevelDefinition) {
    this.level = level;
    this.surfaceSize = SURFACE_SIZES[level.objectKind];
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(LOGICAL_WIDTH, LOGICAL_HEIGHT, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene.background = new THREE.Color('#d8dfdc');
    this.scene.fog = new THREE.Fog('#d8dfdc', 13, 24);
    this.camera = new THREE.PerspectiveCamera(34, LOGICAL_WIDTH / LOGICAL_HEIGHT, 0.1, 60);
    this.camera.position.set(0, 8.7, 9.1);
    this.camera.lookAt(0, 0, 0.15);

    this.setupEnvironment();
    this.scene.add(this.objectRoot);
    this.objectRoot.add(this.surfaceRoot);
    this.createObjectModel();

    const cleanCanvas = createObjectTexture(level);
    const cleanTexture = new THREE.CanvasTexture(cleanCanvas);
    cleanTexture.colorSpace = THREE.SRGBColorSpace;
    cleanTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const cleanMaterial = new THREE.MeshStandardMaterial({
      map: cleanTexture,
      transparent: level.objectKind === 'sneaker' || level.objectKind === 'sofa',
      alphaTest: level.objectKind === 'sneaker' ? 0.04 : 0,
      roughness: level.objectKind === 'window' ? 0.22 : 0.72,
      metalness: level.objectKind === 'window' ? 0.15 : 0.03,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.PlaneGeometry(this.surfaceSize.width, this.surfaceSize.height, 1, 1);
    this.surfaceMesh = new THREE.Mesh(plane, cleanMaterial);
    this.surfaceMesh.rotation.x = -Math.PI / 2;
    this.surfaceMesh.position.y = 0.12;
    this.surfaceMesh.receiveShadow = true;
    this.surfaceRoot.add(this.surfaceMesh);

    this.dirtCanvas.width = GRID_WIDTH;
    this.dirtCanvas.height = GRID_HEIGHT;
    const dirtContext = this.dirtCanvas.getContext('2d', { willReadFrequently: true });
    if (!dirtContext) throw new Error('Dirt texture canvas is unavailable');
    this.dirtContext = dirtContext;
    this.dirtTexture = new THREE.CanvasTexture(this.dirtCanvas);
    this.dirtTexture.colorSpace = THREE.SRGBColorSpace;
    this.dirtTexture.minFilter = THREE.LinearFilter;
    this.dirtTexture.magFilter = THREE.LinearFilter;
    this.dirtMaterial = new THREE.MeshStandardMaterial({
      map: this.dirtTexture,
      transparent: true,
      depthWrite: false,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.dirtMesh = new THREE.Mesh(plane.clone(), this.dirtMaterial);
    this.dirtMesh.rotation.x = -Math.PI / 2;
    this.dirtMesh.position.y = 0.145;
    this.surfaceRoot.add(this.dirtMesh);

    const footprintGeometry = new THREE.PlaneGeometry(1, 1);
    const footprintMaterial = new THREE.MeshBasicMaterial({
      color: '#8ee8ef',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.footprint = new THREE.Mesh(footprintGeometry, footprintMaterial);
    this.footprint.rotation.x = -Math.PI / 2;
    this.footprint.position.y = 0.19;
    this.footprint.visible = false;
    this.surfaceRoot.add(this.footprint);

    const positions = new Float32Array(130 * 3);
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setDrawRange(0, 0);
    this.particlePoints = new THREE.Points(
      this.particleGeometry,
      new THREE.PointsMaterial({ color: '#b9edf2', size: 0.075, transparent: true, opacity: 0.8 }),
    );
    this.surfaceRoot.add(this.particlePoints);
  }

  private setupEnvironment(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 24),
      new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.76, metalness: 0.03 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.24;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ambient = new THREE.HemisphereLight('#f4fbf8', '#657678', 1.55);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight('#fff4dd', 3.1);
    key.position.set(-4.5, 10, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -9;
    this.scene.add(key);
    const rim = new THREE.SpotLight('#8bd6e0', 7, 20, 0.52, 0.6, 1.2);
    rim.position.set(5.5, 6.5, -4.5);
    rim.target.position.set(0, 0, 0);
    this.scene.add(rim, rim.target);

    const drain = new THREE.Group();
    const drainFrame = addShadowMesh(
      drain,
      new RoundedBoxGeometry(1.25, 0.08, 3.1, 5, 0.12),
      material('#59686a', 0.38, 0.72),
      [-5.1, -0.13, 1.8],
    );
    drainFrame.rotation.y = -0.06;
    for (let index = 0; index < 8; index += 1) {
      addShadowMesh(
        drain,
        new THREE.BoxGeometry(0.72, 0.035, 0.12),
        material('#263638', 0.42, 0.62),
        [-5.1, -0.075, 0.63 + index * 0.34],
      );
    }
    this.scene.add(drain);

    const bucket = new THREE.Group();
    const bucketBody = addShadowMesh(
      bucket,
      new THREE.CylinderGeometry(0.82, 0.66, 1.6, 28, 1, true),
      material('#3d91a5', 0.3, 0.16),
      [5.1, 0.55, 2.6],
    );
    bucketBody.rotation.z = -0.05;
    const rimMesh = addShadowMesh(
      bucket,
      new THREE.TorusGeometry(0.82, 0.06, 10, 32),
      material('#d5e6e5', 0.24, 0.55),
      [5.1, 1.35, 2.6],
    );
    rimMesh.rotation.x = Math.PI / 2;
    this.scene.add(bucket);

    const shelf = new THREE.Group();
    addShadowMesh(
      shelf,
      new RoundedBoxGeometry(2.4, 0.18, 0.62, 4, 0.08),
      material('#52696a', 0.58, 0.12),
      [4.5, 0.35, -5.4],
    );
    for (let index = 0; index < 3; index += 1) {
      addShadowMesh(
        shelf,
        new THREE.CylinderGeometry(0.22, 0.25, 0.86 + index * 0.12, 20),
        material(index === 1 ? '#d99a55' : '#e7efec', 0.52, 0.05),
        [3.8 + index * 0.67, 0.88, -5.4],
      );
    }
    this.scene.add(shelf);
  }

  private createObjectModel(): void {
    const kind = this.level.objectKind;
    const { width, height } = this.surfaceSize;

    if (kind === 'rug' || kind === 'large-rug') {
      addShadowMesh(
        this.objectRoot,
        new RoundedBoxGeometry(width + 0.18, 0.16, height + 0.18, 8, 0.16),
        material('#d9ccb1', 0.92, 0),
        [0, 0, 0],
      );
      const tasselCount = kind === 'large-rug' ? 24 : 20;
      for (let index = 0; index < tasselCount; index += 1) {
        const x = -width / 2 + 0.2 + (index / (tasselCount - 1)) * (width - 0.4);
        for (const direction of [-1, 1]) {
          const tassel = addShadowMesh(
            this.objectRoot,
            new THREE.CylinderGeometry(0.018, 0.027, 0.42, 6),
            material('#d8c8a8', 0.9, 0),
            [x, -0.02, direction * (height / 2 + 0.24)],
          );
          tassel.rotation.x = Math.PI / 2 + direction * 0.07;
        }
      }
      return;
    }

    if (kind === 'sneaker') {
      const sole = addShadowMesh(
        this.objectRoot,
        new RoundedBoxGeometry(4.55, 0.34, 2.15, 8, 0.28),
        material('#d9ddda', 0.68, 0.03),
        [0.15, 0.04, 0.55],
      );
      sole.rotation.y = -0.12;
      const heel = addShadowMesh(
        this.objectRoot,
        new RoundedBoxGeometry(1.45, 1.28, 1.78, 8, 0.36),
        material(this.level.palette.accent, 0.72, 0.02),
        [-1.45, 0.55, 0.18],
      );
      heel.rotation.z = -0.08;
      const toe = addShadowMesh(
        this.objectRoot,
        new THREE.SphereGeometry(1.15, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2),
        material(this.level.palette.base, 0.62, 0.02),
        [1.42, 0.32, 0.62],
      );
      toe.scale.set(1.35, 0.72, 0.92);
      for (let index = 0; index < 5; index += 1) {
        addCylinderBetween(
          this.objectRoot,
          new THREE.Vector3(-0.65 + index * 0.28, 0.98, 0.08),
          new THREE.Vector3(-0.38 + index * 0.26, 0.98, 1.1),
          0.035,
          '#e9eee9',
        );
      }
      this.surfaceRoot.position.y = 1.03;
      return;
    }

    if (kind === 'sofa') {
      addShadowMesh(
        this.objectRoot,
        new RoundedBoxGeometry(4.7, 1.65, 1.05, 8, 0.26),
        material(this.level.palette.base, 0.82, 0),
        [0, 0.75, -1.58],
      );
      for (let index = 0; index < 2; index += 1) {
        addShadowMesh(
          this.objectRoot,
          new RoundedBoxGeometry(2.08, 0.62, 2.15, 8, 0.24),
          material(index ? '#abc6c8' : '#c5d8d7', 0.88, 0),
          [-1.08 + index * 2.16, 0.32, 0.22],
        );
      }
      for (const x of [-2.32, 2.32]) {
        addShadowMesh(
          this.objectRoot,
          new RoundedBoxGeometry(0.62, 0.85, 2.45, 8, 0.24),
          material('#8eafb2', 0.86, 0),
          [x, 0.45, 0.06],
        );
      }
      this.surfaceRoot.position.y = 1.22;
      this.surfaceRoot.scale.set(0.94, 0.94, 0.94);
      return;
    }

    const frameMaterial = material('#526568', 0.38, 0.52);
    addShadowMesh(
      this.objectRoot,
      new RoundedBoxGeometry(width + 0.34, 0.18, height + 0.34, 6, 0.12),
      frameMaterial,
      [0, 0, 0],
    );
    const glass = addShadowMesh(
      this.objectRoot,
      new THREE.BoxGeometry(width - 0.36, 0.12, height - 0.36),
      new THREE.MeshPhysicalMaterial({
        color: '#98c8d1',
        transmission: 0.18,
        transparent: true,
        opacity: 0.68,
        roughness: 0.16,
        metalness: 0.08,
        clearcoat: 1,
      }),
      [0, 0.08, 0],
    );
    glass.receiveShadow = true;
    addShadowMesh(this.objectRoot, new THREE.BoxGeometry(0.12, 0.22, height), frameMaterial, [0, 0.17, 0]);
    addShadowMesh(this.objectRoot, new THREE.BoxGeometry(width, 0.22, 0.12), frameMaterial, [0, 0.17, 0]);
  }

  private createToolModel(tool: ToolId): THREE.Group {
    const group = new THREE.Group();
    const dark = material('#303a3c', 0.32, 0.54);
    const accent = material(TOOLS[tool].color, 0.28, 0.28);

    if (tool === 'water') {
      const barrel = addShadowMesh(group, new THREE.CylinderGeometry(0.08, 0.1, 1.45, 18), dark, [0, 0.78, 0]);
      barrel.rotation.z = Math.PI / 2;
      addShadowMesh(group, new RoundedBoxGeometry(0.48, 0.28, 0.24, 4, 0.07), accent, [-0.5, 0.78, 0]);
      const handle = addShadowMesh(group, new RoundedBoxGeometry(0.18, 0.62, 0.2, 4, 0.05), dark, [-0.58, 0.45, 0]);
      handle.rotation.z = -0.2;
      const spray = addShadowMesh(
        group,
        new THREE.ConeGeometry(0.24, 0.75, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: '#9be8ef', transparent: true, opacity: 0.38, depthWrite: false }),
        [0.76, 0.38, 0],
      );
      spray.rotation.z = Math.PI / 2;
    } else if (tool === 'vacuum') {
      addShadowMesh(group, new RoundedBoxGeometry(1.08, 0.23, 0.48, 5, 0.08), dark, [0, 0.28, 0]);
      const tube = addShadowMesh(group, new THREE.CylinderGeometry(0.07, 0.09, 1.45, 16), accent, [0.28, 0.91, 0]);
      tube.rotation.z = -0.32;
    } else if (tool === 'foam') {
      addShadowMesh(group, new THREE.CylinderGeometry(0.24, 0.29, 0.84, 22), accent, [0, 0.58, 0]);
      addShadowMesh(group, new RoundedBoxGeometry(0.48, 0.19, 0.24, 4, 0.05), dark, [0.13, 1.04, 0]);
      for (let index = 0; index < 5; index += 1) {
        addShadowMesh(
          group,
          new THREE.SphereGeometry(0.07 + index * 0.012, 12, 8),
          new THREE.MeshPhysicalMaterial({ color: '#f7fffd', transparent: true, opacity: 0.72, roughness: 0.05 }),
          [0.12 + index * 0.11, 0.24 + (index % 2) * 0.09, (index - 2) * 0.08],
        );
      }
    } else {
      addShadowMesh(group, new RoundedBoxGeometry(0.74, 0.22, 0.46, 5, 0.08), accent, [0, 0.46, 0]);
      for (let index = 0; index < 7; index += 1) {
        addShadowMesh(
          group,
          new THREE.CylinderGeometry(0.015, 0.022, 0.32, 6),
          material('#efe5cf', 0.94, 0),
          [-0.27 + index * 0.09, 0.23, 0],
        );
      }
      const handle = addShadowMesh(group, new THREE.CylinderGeometry(0.07, 0.09, 1.15, 16), dark, [0.34, 0.87, 0]);
      handle.rotation.z = -0.5;
    }
    group.scale.setScalar(0.68);
    return group;
  }

  private updateDirtTexture(state: CleaningState, scanActive: boolean, now: number): void {
    const image = this.dirtContext.createImageData(GRID_WIDTH, GRID_HEIGHT);
    for (let index = 0; index < GRID_WIDTH * GRID_HEIGHT; index += 1) {
      let alpha = 0;
      let totalWeight = 0;
      const mixed = new THREE.Color(0, 0, 0);
      for (const layer of state.layers) {
        const intensity = layer.cells[index];
        if (intensity <= 0.01) continue;
        const weight = intensity * (layer.type === 'hair' ? 0.82 : 1);
        mixed.r += dirtColors[layer.type].r * weight;
        mixed.g += dirtColors[layer.type].g * weight;
        mixed.b += dirtColors[layer.type].b * weight;
        totalWeight += weight;
        alpha = Math.max(alpha, Math.min(0.96, 0.12 + intensity * 1.05));
      }
      const offset = index * 4;
      if (totalWeight > 0) {
        mixed.multiplyScalar(1 / totalWeight);
        image.data[offset] = scanActive ? 242 : Math.round(mixed.r * 255);
        image.data[offset + 1] = scanActive ? 157 : Math.round(mixed.g * 255);
        image.data[offset + 2] = scanActive ? 43 : Math.round(mixed.b * 255);
        image.data[offset + 3] = Math.round(alpha * 255);
      }
    }
    this.dirtContext.putImageData(image, 0, 0);

    for (let y = 2; y < GRID_HEIGHT; y += 5) {
      for (let x = 2; x < GRID_WIDTH; x += 5) {
        const index = y * GRID_WIDTH + x;
        const foam = state.foam[index];
        if (foam < 0.18) continue;
        const dirty = now - state.foamAppliedAt[index] > 650;
        this.dirtContext.globalAlpha = Math.min(0.95, foam);
        this.dirtContext.fillStyle = dirty ? '#ded4bd' : '#f7fffc';
        this.dirtContext.beginPath();
        this.dirtContext.arc(x, y, 2.8 + foam * 1.4, 0, Math.PI * 2);
        this.dirtContext.fill();
      }
    }
    this.dirtContext.globalAlpha = 1;
    this.dirtTexture.needsUpdate = true;
  }

  private updateTool(pointer: PointerVisual): void {
    if (pointer.tool !== this.activeTool) {
      this.surfaceRoot.remove(this.toolModel);
      this.toolModel = this.createToolModel(pointer.tool);
      this.surfaceRoot.add(this.toolModel);
      this.activeTool = pointer.tool;
      const footprintMaterial = this.footprint.material as THREE.MeshBasicMaterial;
      footprintMaterial.color.set(pointer.tool === 'brush' ? '#efad67' : pointer.tool === 'vacuum' ? '#8e9c9d' : '#88e2eb');
    }

    const uv = this.screenToUv({ x: pointer.x, y: pointer.y });
    if (!uv) {
      this.toolModel.visible = false;
      this.footprint.visible = false;
      return;
    }
    const x = (uv.u - 0.5) * this.surfaceSize.width;
    const z = (uv.v - 0.5) * this.surfaceSize.height;
    this.pointerWorld.set(x, 0.22, z);
    this.toolModel.position.set(x, 0.24, z);
    this.toolModel.visible = pointer.active;
    this.footprint.position.set(x, 0.19, z);
    const footprintHeight = (pointer.radiusY / OBJECT_RECT.height) * this.surfaceSize.height * 2;
    const footprintWidth = (pointer.radiusX / OBJECT_RECT.width) * this.surfaceSize.width * 2;
    this.footprint.scale.set(footprintWidth, footprintHeight, 1);
    this.footprint.visible = true;
  }

  private updateParticles(particles: Particle[], tool: ToolId): void {
    const position = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const count = Math.min(130, particles.length);
    for (let index = 0; index < count; index += 1) {
      const particle = particles[particles.length - count + index];
      const u = (particle.x - OBJECT_RECT.x) / OBJECT_RECT.width;
      const v = (particle.y - OBJECT_RECT.y) / OBJECT_RECT.height;
      position.setXYZ(
        index,
        (u - 0.5) * this.surfaceSize.width,
        0.25 + (particle.life / particle.maxLife) * 0.2,
        (v - 0.5) * this.surfaceSize.height,
      );
    }
    position.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, count);
    const pointMaterial = this.particlePoints.material as THREE.PointsMaterial;
    pointMaterial.color.set(tool === 'brush' ? '#b77e49' : tool === 'vacuum' ? '#6b7370' : tool === 'foam' ? '#ffffff' : '#b9edf2');
  }

  screenToUv(point: { x: number; y: number }): UvPoint | null {
    this.ndc.set((point.x / LOGICAL_WIDTH) * 2 - 1, -(point.y / LOGICAL_HEIGHT) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const intersection = this.raycaster.intersectObject(this.surfaceMesh, false)[0];
    if (!intersection?.uv) return null;
    return { u: intersection.uv.x, v: 1 - intersection.uv.y };
  }

  render(
    state: CleaningState,
    pointer: PointerVisual,
    particles: Particle[],
    scanActive: boolean,
    now: number,
  ): void {
    this.updateDirtTexture(state, scanActive, now);
    this.updateTool(pointer);
    this.updateParticles(particles, pointer.tool);
    const targetX = ((pointer.x / LOGICAL_WIDTH) - 0.5) * 0.34;
    const targetZ = ((pointer.y / LOGICAL_HEIGHT) - 0.5) * 0.18;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.025;
    this.camera.lookAt(this.camera.position.x * 0.16, 0, targetZ);
    this.renderer.render(this.scene, this.camera);
  }

  capture(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/webp', 0.88);
  }

  destroy(): void {
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const meshMaterial = object.material;
      const materials = Array.isArray(meshMaterial) ? meshMaterial : [meshMaterial];
      for (const item of materials) {
        if ('map' in item && item.map instanceof THREE.Texture) item.map.dispose();
        item.dispose();
      }
    });
    this.renderer.dispose();
  }
}
