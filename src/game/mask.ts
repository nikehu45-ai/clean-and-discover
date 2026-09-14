import { TOOLS } from '../data/levels';
import type { DirtDefinition, DirtType, ObjectKind, ToolId } from '../types';

export const GRID_WIDTH = 180;
export const GRID_HEIGHT = 210;

export interface DirtLayerState {
  type: DirtType;
  cells: Float32Array;
  initialMass: number;
  remainingMass: number;
  seed: number;
}

export interface CleaningState {
  layers: DirtLayerState[];
  foam: Float32Array;
  foamAppliedAt: Float64Array;
  initialMass: number;
  remainingMass: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number): number {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function hash(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

function fbm(x: number, y: number, seed: number): number {
  return (
    valueNoise(x * 2.2, y * 2.2, seed) * 0.55 +
    valueNoise(x * 5.4, y * 5.4, seed + 11) * 0.3 +
    valueNoise(x * 12, y * 12, seed + 23) * 0.15
  );
}

export function isInsideObject(kind: ObjectKind, u: number, v: number): boolean {
  if (kind === 'rug' || kind === 'large-rug') {
    const x = Math.abs((u - 0.5) / 0.44);
    const y = Math.abs((v - 0.5) / 0.45);
    return Math.pow(x, 5) + Math.pow(y, 5) <= 1;
  }

  if (kind === 'sneaker') {
    const sole = u > 0.08 && u < 0.94 && v > 0.57 && v < 0.79;
    const toe = Math.pow((u - 0.73) / 0.24, 2) + Math.pow((v - 0.51) / 0.27, 2) <= 1;
    const heel = u > 0.1 && u < 0.39 && v > 0.29 && v < 0.72;
    const upper = u > 0.26 && u < 0.78 && v > 0.33 && v < 0.72;
    return sole || toe || heel || upper;
  }

  if (kind === 'sofa') {
    const back = u > 0.1 && u < 0.9 && v > 0.13 && v < 0.59;
    const seat = u > 0.12 && u < 0.88 && v > 0.48 && v < 0.82;
    const armLeft = u > 0.055 && u < 0.24 && v > 0.38 && v < 0.76;
    const armRight = u > 0.76 && u < 0.945 && v > 0.38 && v < 0.76;
    return back || seat || armLeft || armRight;
  }

  if (kind === 'window') {
    return u > 0.075 && u < 0.925 && v > 0.055 && v < 0.945;
  }

  return false;
}

function createDirtLayer(definition: DirtDefinition, objectKind: ObjectKind): DirtLayerState {
  const cells = new Float32Array(GRID_WIDTH * GRID_HEIGHT);
  let initialMass = 0;

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const u = (x + 0.5) / GRID_WIDTH;
      const v = (y + 0.5) / GRID_HEIGHT;
      if (!isInsideObject(objectKind, u, v)) continue;

      const broad = fbm(u, v, definition.seed);
      const streak = Math.sin((u * 2.7 + v * 1.4 + definition.seed) * 3.2) * 0.08;
      const threshold = 0.78 - definition.coverage * 0.58;
      const amount = clamp((broad + streak - threshold) * 2.8) * definition.density;
      const index = y * GRID_WIDTH + x;
      cells[index] = amount;
      initialMass += amount;
    }
  }

  return {
    type: definition.type,
    cells,
    initialMass,
    remainingMass: initialMass,
    seed: definition.seed,
  };
}

export function createCleaningState(
  definitions: DirtDefinition[],
  objectKind: ObjectKind,
): CleaningState {
  const layers = definitions.map((definition) => createDirtLayer(definition, objectKind));
  const initialMass = layers.reduce((sum, layer) => sum + layer.initialMass, 0);
  return {
    layers,
    foam: new Float32Array(GRID_WIDTH * GRID_HEIGHT),
    foamAppliedAt: new Float64Array(GRID_WIDTH * GRID_HEIGHT),
    initialMass,
    remainingMass: initialMass,
  };
}

export interface ApplyToolOptions {
  radiusMultiplier: number;
  efficiencyMultiplier: number;
  deltaScale: number;
  now: number;
}

export interface ApplyToolResult {
  removedMass: number;
  touchedCells: number;
  compatibleRemoval: number;
}

export interface ToolStroke {
  startU: number;
  startV: number;
  endU: number;
  endV: number;
}

function removeSpeckles(
  state: CleaningState,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): number {
  let removedMass = 0;
  for (const layer of state.layers) {
    const removals: number[] = [];
    for (let y = Math.max(1, minY); y <= Math.min(GRID_HEIGHT - 2, maxY); y += 1) {
      for (let x = Math.max(1, minX); x <= Math.min(GRID_WIDTH - 2, maxX); x += 1) {
        const index = y * GRID_WIDTH + x;
        const value = layer.cells[index];
        if (value <= 0) continue;
        let neighbors = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue;
            if (layer.cells[(y + oy) * GRID_WIDTH + x + ox] > 0.035) neighbors += 1;
          }
        }
        if (value < 0.045 || neighbors === 0 || (value < 0.18 && neighbors <= 2)) {
          removals.push(index);
        }
      }
    }
    for (const index of removals) {
      const value = layer.cells[index];
      layer.cells[index] = 0;
      layer.remainingMass -= value;
      removedMass += value;
    }
  }
  state.remainingMass = Math.max(0, state.remainingMass - removedMass);
  return removedMass;
}

export function applyToolStroke(
  state: CleaningState,
  toolId: ToolId,
  stroke: ToolStroke,
  options: ApplyToolOptions,
): ApplyToolResult {
  const tool = TOOLS[toolId];
  const footprint = tool.radius * options.radiusMultiplier;
  const displayAspect = 520 / 680;
  const startX = stroke.startU * displayAspect;
  const startY = stroke.startV;
  const endX = stroke.endU * displayAspect;
  const endY = stroke.endV;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLength = Math.hypot(segmentX, segmentY);
  const minU = Math.min(stroke.startU, stroke.endU) - footprint / displayAspect;
  const maxU = Math.max(stroke.startU, stroke.endU) + footprint / displayAspect;
  const minV = Math.min(stroke.startV, stroke.endV) - footprint;
  const maxV = Math.max(stroke.startV, stroke.endV) + footprint;
  const minX = Math.max(0, Math.floor(minU * GRID_WIDTH));
  const maxX = Math.min(GRID_WIDTH - 1, Math.ceil(maxU * GRID_WIDTH));
  const minY = Math.max(0, Math.floor(minV * GRID_HEIGHT));
  const maxY = Math.min(GRID_HEIGHT - 1, Math.ceil(maxV * GRID_HEIGHT));
  let removedMass = 0;
  let compatibleRemoval = 0;
  let touchedCells = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const u = (x + 0.5) / GRID_WIDTH;
      const v = (y + 0.5) / GRID_HEIGHT;
      const px = u * displayAspect;
      const py = v;
      let inside = false;

      if (segmentLength < 0.0001) {
        inside = Math.abs(px - startX) <= footprint && Math.abs(py - startY) <= footprint;
      } else {
        const along = ((px - startX) * segmentX + (py - startY) * segmentY) / segmentLength;
        const across = Math.abs((px - startX) * segmentY - (py - startY) * segmentX) / segmentLength;
        const inStrip = along >= 0 && along <= segmentLength && across <= footprint;
        const inStartJoint =
          Math.abs(px - startX) <= footprint && Math.abs(py - startY) <= footprint;
        const inEndJoint = Math.abs(px - endX) <= footprint && Math.abs(py - endY) <= footprint;
        inside = inStrip || inStartJoint || inEndJoint;
      }

      if (!inside) continue;
      const index = y * GRID_WIDTH + x;
      touchedCells += 1;

      if (toolId === 'foam') {
        state.foam[index] = 1;
        if (state.foamAppliedAt[index] === 0) state.foamAppliedAt[index] = options.now;
      }

      for (const layer of state.layers) {
        const before = layer.cells[index];
        if (before <= 0) continue;
        let strength = tool.strengths[layer.type];
        const isRecommendedPair =
          (toolId === 'water' && layer.type === 'mud') ||
          (toolId === 'vacuum' && (layer.type === 'dust' || layer.type === 'hair')) ||
          (toolId === 'brush' && layer.type === 'oil');

        if (
          toolId === 'brush' &&
          layer.type === 'oil' &&
          state.foam[index] > 0.2 &&
          options.now - state.foamAppliedAt[index] > 650
        ) {
          strength *= 5.4;
        }

        const amount = strength * options.efficiencyMultiplier * options.deltaScale;
        const after = Math.max(0, before - amount);
        const removed = before - after;
        layer.cells[index] = after;
        layer.remainingMass -= removed;
        removedMass += removed;
        if (isRecommendedPair) compatibleRemoval += removed;
      }

      if (toolId === 'brush' && state.foam[index] > 0) {
        state.foam[index] = Math.max(0, state.foam[index] - 0.06 * options.deltaScale);
      }
    }
  }

  state.remainingMass = Math.max(0, state.remainingMass - removedMass);
  const speckRemoval = removeSpeckles(state, minX - 2, maxX + 2, minY - 2, maxY + 2);
  return { removedMass: removedMass + speckRemoval, touchedCells, compatibleRemoval };
}

export function applyTool(
  state: CleaningState,
  toolId: ToolId,
  u: number,
  v: number,
  options: ApplyToolOptions,
): ApplyToolResult {
  return applyToolStroke(
    state,
    toolId,
    { startU: u, startV: v, endU: u, endV: v },
    options,
  );
}

export function getCleanliness(state: CleaningState): number {
  if (state.initialMass <= 0) return 1;
  return clamp(1 - state.remainingMass / state.initialMass);
}

export function finishRemainingDirt(state: CleaningState): void {
  for (const layer of state.layers) {
    layer.cells.fill(0);
    layer.remainingMass = 0;
  }
  state.foam.fill(0);
  state.foamAppliedAt.fill(0);
  state.remainingMass = 0;
}

export function getDirtiestType(state: CleaningState): DirtType | null {
  let dirtiest: DirtLayerState | null = null;
  for (const layer of state.layers) {
    if (!dirtiest || layer.remainingMass > dirtiest.remainingMass) dirtiest = layer;
  }
  return dirtiest && dirtiest.remainingMass > 0.01 ? dirtiest.type : null;
}
