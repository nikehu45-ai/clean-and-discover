import type { LevelDefinition, ToolId } from '../types';
import type { CleaningState } from './mask';
import { GRID_HEIGHT, GRID_WIDTH } from './mask';

export const LOGICAL_WIDTH = 720;
export const LOGICAL_HEIGHT = 1280;
export const OBJECT_RECT = { x: 100, y: 245, width: 520, height: 680 };

export interface PointerVisual {
  x: number;
  y: number;
  active: boolean;
  tool: ToolId;
  radiusX: number;
  radiusY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function drawWorkbench(ctx: CanvasRenderingContext2D): void {
  const background = ctx.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  background.addColorStop(0, '#d7dcda');
  background.addColorStop(0.55, '#edf0ed');
  background.addColorStop(1, '#c4cdca');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#7f8988';
  ctx.lineWidth = 2;
  const tile = 150;
  for (let x = -tile; x < LOGICAL_WIDTH + tile; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, LOGICAL_HEIGHT);
    ctx.stroke();
  }
  for (let y = -tile; y < LOGICAL_HEIGHT + tile; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(170, 95, 10, 170, 95, 410);
  glow.addColorStop(0, 'rgba(255,255,255,.9)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#3f5553';
  ctx.beginPath();
  ctx.ellipse(-10, 300, 150, 360, -0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRug(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  const { x, y, width: w, height: h } = OBJECT_RECT;
  ctx.save();
  ctx.shadowColor = 'rgba(29,49,49,.28)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 24;
  roundedRect(ctx, x + 22, y + 22, w - 44, h - 44, 34);
  ctx.fillStyle = level.palette.base;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, x + 22, y + 22, w - 44, h - 44, 34);
  ctx.clip();
  ctx.fillStyle = level.palette.base;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = level.palette.accent;
  ctx.lineWidth = 15;
  ctx.strokeRect(x + 56, y + 58, w - 112, h - 116);
  ctx.strokeStyle = level.palette.pattern;
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 78, y + 80, w - 156, h - 160);

  ctx.translate(x + w / 2, y + h / 2);
  ctx.fillStyle = level.palette.accent;
  ctx.globalAlpha = 0.92;
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath();
    const radius = 106 - ring * 24;
    for (let point = 0; point < 16; point += 1) {
      const angle = (point / 16) * Math.PI * 2;
      const wave = point % 2 === 0 ? radius : radius - 18;
      const px = Math.cos(angle) * wave;
      const py = Math.sin(angle) * wave * 1.18;
      if (point === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ring % 2 === 0 ? ctx.fill() : ctx.stroke();
  }

  ctx.fillStyle = level.palette.base;
  ctx.beginPath();
  ctx.ellipse(0, 12, 55, 67, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-40, -30);
  ctx.lineTo(-56, -73);
  ctx.lineTo(-14, -49);
  ctx.moveTo(40, -30);
  ctx.lineTo(56, -73);
  ctx.lineTo(14, -49);
  ctx.fill();
  ctx.strokeStyle = level.palette.pattern;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-28, 2);
  ctx.lineTo(-17, 7);
  ctx.moveTo(28, 2);
  ctx.lineTo(17, 7);
  ctx.moveTo(-7, 27);
  ctx.quadraticCurveTo(0, 35, 7, 27);
  ctx.stroke();

  ctx.globalAlpha = 0.65;
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const px = Math.cos(angle) * 176;
    const py = Math.sin(angle) * 220;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = i % 2 ? level.palette.pattern : level.palette.accent;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#d7c9ad';
  ctx.lineWidth = 4;
  for (let i = 0; i < 20; i += 1) {
    const px = x + 55 + (i / 19) * (w - 110);
    ctx.beginPath();
    ctx.moveTo(px, y + h - 22);
    ctx.lineTo(px + (i % 2 ? 5 : -4), y + h + 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSofa(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  const { x, y, width: w, height: h } = OBJECT_RECT;
  ctx.save();
  ctx.shadowColor = 'rgba(27,48,50,.28)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 28;
  roundedRect(ctx, x + 55, y + 100, w - 110, h - 180, 65);
  ctx.fillStyle = '#28484a';
  ctx.fill();
  ctx.restore();

  const fabric = ctx.createLinearGradient(x, y, x + w, y + h);
  fabric.addColorStop(0, '#dce9e8');
  fabric.addColorStop(0.45, level.palette.base);
  fabric.addColorStop(1, '#87a8ac');

  roundedRect(ctx, x + 60, y + 90, w - 120, h * 0.47, 58);
  ctx.fillStyle = fabric;
  ctx.fill();
  ctx.strokeStyle = 'rgba(42,84,88,.35)';
  ctx.lineWidth = 5;
  ctx.stroke();

  for (let i = 0; i < 2; i += 1) {
    const cushionX = x + 92 + i * (w / 2 - 33);
    roundedRect(ctx, cushionX, y + h * 0.46, w / 2 - 70, h * 0.29, 34);
    ctx.fillStyle = i ? '#afc8ca' : '#c4d7d7';
    ctx.fill();
    ctx.strokeStyle = 'rgba(52,87,89,.4)';
    ctx.stroke();
  }

  roundedRect(ctx, x + 30, y + h * 0.35, 126, h * 0.4, 52);
  ctx.fillStyle = '#9ab7ba';
  ctx.fill();
  roundedRect(ctx, x + w - 156, y + h * 0.35, 126, h * 0.4, 52);
  ctx.fill();

  ctx.fillStyle = level.palette.pattern;
  roundedRect(ctx, x + 142, y + 160, 112, 118, 22);
  ctx.fill();
  ctx.fillStyle = level.palette.accent;
  ctx.beginPath();
  ctx.arc(x + 198, y + 219, 29, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#54696a';
  ctx.fillRect(x + 105, y + h - 100, 32, 75);
  ctx.fillRect(x + w - 137, y + h - 100, 32, 75);
}

function drawStove(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  const { x, y, width: w, height: h } = OBJECT_RECT;
  ctx.save();
  ctx.shadowColor = 'rgba(24,34,35,.35)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 26;
  roundedRect(ctx, x + 28, y + 26, w - 56, h - 52, 36);
  ctx.fillStyle = '#7a898b';
  ctx.fill();
  ctx.restore();

  const metal = ctx.createLinearGradient(x, y, x + w, y + h);
  metal.addColorStop(0, '#eef2f0');
  metal.addColorStop(0.4, level.palette.base);
  metal.addColorStop(0.7, '#8d9b9d');
  metal.addColorStop(1, '#d9dfdd');
  roundedRect(ctx, x + 28, y + 26, w - 56, h - 52, 36);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = 'rgba(43,56,57,.45)';
  ctx.lineWidth = 6;
  ctx.stroke();

  const burners = [
    [0.3, 0.3, 72],
    [0.7, 0.3, 64],
    [0.3, 0.64, 62],
    [0.7, 0.64, 76],
  ];
  for (const [ux, uy, radius] of burners) {
    const bx = x + ux * w;
    const by = y + uy * h;
    ctx.fillStyle = level.palette.accent;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#718082';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = '#252d2e';
    ctx.lineWidth = 9;
    for (let arm = 0; arm < 4; arm += 1) {
      const angle = (arm / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(angle) * 31, by + Math.sin(angle) * 31);
      ctx.lineTo(bx + Math.cos(angle) * (radius + 18), by + Math.sin(angle) * (radius + 18));
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#536163';
  roundedRect(ctx, x + 82, y + h - 112, w - 164, 56, 18);
  ctx.fill();
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.fillStyle = i === 0 ? level.palette.pattern : '#bfc8c6';
    ctx.arc(x + 164 + i * 86, y + h - 84, 13, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBaseObject(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  if (level.objectKind === 'rug') drawRug(ctx, level);
  else if (level.objectKind === 'sofa') drawSofa(ctx, level);
  else drawStove(ctx, level);
}

function renderDirtLayer(
  target: HTMLCanvasElement,
  state: CleaningState,
  scanActive: boolean,
): CanvasRenderingContext2D {
  if (target.width !== GRID_WIDTH || target.height !== GRID_HEIGHT) {
    target.width = GRID_WIDTH;
    target.height = GRID_HEIGHT;
  }
  const targetCtx = target.getContext('2d', { willReadFrequently: true });
  if (!targetCtx) throw new Error('Canvas 2D context is not available');
  const image = targetCtx.createImageData(GRID_WIDTH, GRID_HEIGHT);
  const colors = {
    mud: [72, 49, 32],
    dust: [77, 84, 82],
    oil: [48, 38, 24],
    hair: [39, 37, 34],
  } as const;

  for (const layer of state.layers) {
    const [red, green, blue] = colors[layer.type];
    for (let index = 0; index < layer.cells.length; index += 1) {
      const intensity = layer.cells[index];
      if (intensity <= 0.015) continue;
      const offset = index * 4;
      const existingAlpha = image.data[offset + 3] / 255;
      const alpha = Math.min(0.97, 0.08 + intensity * (layer.type === 'hair' ? 0.88 : 1.06));
      const combined = alpha + existingAlpha * (1 - alpha);
      image.data[offset] = scanActive ? 241 : red;
      image.data[offset + 1] = scanActive ? 165 : green;
      image.data[offset + 2] = scanActive ? 59 : blue;
      image.data[offset + 3] = Math.round(combined * 255);
    }
  }
  targetCtx.putImageData(image, 0, 0);
  return targetCtx;
}

function drawFoam(
  ctx: CanvasRenderingContext2D,
  state: CleaningState,
  now: number,
): void {
  const { x, y, width, height } = OBJECT_RECT;
  ctx.save();
  for (let gy = 1; gy < GRID_HEIGHT; gy += 3) {
    for (let gx = 1; gx < GRID_WIDTH; gx += 3) {
      const index = gy * GRID_WIDTH + gx;
      const amount = state.foam[index];
      if (amount < 0.18) continue;
      const age = now - state.foamAppliedAt[index];
      const dirty = age > 650;
      const px = x + (gx / GRID_WIDTH) * width;
      const py = y + (gy / GRID_HEIGHT) * height;
      const size = 3 + amount * 7;
      ctx.globalAlpha = Math.min(0.9, amount);
      ctx.fillStyle = dirty ? '#e7dfce' : '#fbfffd';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dirty ? '#cbbfa8' : '#cfe7e3';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  ctx.save();
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPointer(ctx: CanvasRenderingContext2D, pointer: PointerVisual): void {
  if (!pointer.active) return;
  ctx.save();
  ctx.translate(pointer.x, pointer.y);
  if (pointer.tool === 'water') {
    ctx.strokeStyle = 'rgba(149,235,244,.92)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, pointer.radiusX, pointer.radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      Math.max(2, pointer.radiusX - 8),
      Math.max(2, pointer.radiusY - 8),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } else if (pointer.tool === 'vacuum') {
    ctx.fillStyle = 'rgba(39,52,55,.82)';
    roundedRect(ctx, -pointer.radiusX * 0.7, -18, pointer.radiusX * 1.4, 36, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (pointer.tool === 'foam') {
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * pointer.radiusX * 0.55,
        Math.sin(angle) * pointer.radiusY * 0.55,
        8 + i,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#f3b56d';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-pointer.radiusX * 0.65, i * 10);
      ctx.lineTo(pointer.radiusX * 0.65, i * 10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export interface RenderSceneOptions {
  level: LevelDefinition;
  state: CleaningState;
  dirtCanvas: HTMLCanvasElement;
  pointer: PointerVisual;
  particles: Particle[];
  scanActive: boolean;
  now: number;
  showDirt: boolean;
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  options: RenderSceneOptions,
): void {
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  drawWorkbench(ctx);
  drawBaseObject(ctx, options.level);

  if (options.showDirt) {
    renderDirtLayer(options.dirtCanvas, options.state, options.scanActive);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      options.dirtCanvas,
      OBJECT_RECT.x,
      OBJECT_RECT.y,
      OBJECT_RECT.width,
      OBJECT_RECT.height,
    );
    ctx.restore();
    drawFoam(ctx, options.state, options.now);
  }

  drawParticles(ctx, options.particles);
  drawPointer(ctx, options.pointer);
}
