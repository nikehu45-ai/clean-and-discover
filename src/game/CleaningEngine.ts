import { TOOLS } from '../data/levels';
import type { DirtType, LevelDefinition, ToolId } from '../types';
import {
  applyToolStroke,
  createCleaningState,
  finishRemainingDirt,
  getCleanliness,
  getDirtiestType,
  type CleaningState,
} from './mask';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  OBJECT_RECT,
  type Particle,
  type PointerVisual,
} from './render';
import { ThreeCleaningRenderer } from './ThreeCleaningRenderer';

interface Point {
  x: number;
  y: number;
}

export interface EngineCallbacks {
  onProgress: (progress: number) => void;
  onReveal: () => void;
  onHint: (message: string) => void;
  onComplete: (payload: {
    elapsedSeconds: number;
    beforeImage: string;
    afterImage: string;
  }) => void;
  onToolAction?: (tool: ToolId, amount: number) => void;
}

const DIRT_TOOL_HINT: Record<DirtType, string> = {
  mud: '泥浆怕高压水，换水枪会快很多',
  dust: '灰尘还在飘，试试吸尘器',
  hair: '这些毛发需要吸尘器',
  oil: '先喷泡沫，等它变灰后再刷',
};

export class CleaningEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly view: ThreeCleaningRenderer;
  private readonly level: LevelDefinition;
  private readonly toolLevels: Record<ToolId, number>;
  private readonly callbacks: EngineCallbacks;
  private state: CleaningState;
  private activeTool: ToolId;
  private pointer: PointerVisual;
  private particles: Particle[] = [];
  private frameId = 0;
  private lastFrame = performance.now();
  private startedAt = performance.now();
  private lastProgressAt = performance.now();
  private lastHintAt = 0;
  private lastAppliedPoint: Point | null = null;
  private scanUntil = 0;
  private revealTriggered = false;
  private completing = false;
  private destroyed = false;
  private wideSpray = true;
  private beforeImage = '';
  private completionTimer: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelDefinition,
    toolLevels: Record<ToolId, number>,
    callbacks: EngineCallbacks,
  ) {
    this.canvas = canvas;
    this.level = level;
    this.toolLevels = toolLevels;
    this.callbacks = callbacks;
    this.state = createCleaningState(level.dirt, level.objectKind);
    this.activeTool = level.availableTools.includes(level.recommendedTool)
      ? level.recommendedTool
      : level.availableTools[0];
    this.pointer = {
      x: LOGICAL_WIDTH / 2,
      y: LOGICAL_HEIGHT / 2,
      active: false,
      tool: this.activeTool,
      ...this.getToolRadiusPixels(),
    };
    this.view = new ThreeCleaningRenderer(canvas, level);
    this.bindEvents();
    this.render(performance.now());
    this.beforeImage = this.view.capture();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    this.canvas.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('contextmenu', this.preventContextMenu);
  }

  private preventContextMenu = (event: Event): void => event.preventDefault();

  private getPoint(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
    };
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.completing) return;
    this.canvas.setPointerCapture(event.pointerId);
    const point = this.getPoint(event);
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.active = true;
    this.lastAppliedPoint = point;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const point = this.getPoint(event);
    this.pointer.x = point.x;
    this.pointer.y = point.y;
  };

  private handlePointerUp = (): void => {
    this.pointer.active = false;
    this.lastAppliedPoint = null;
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const movementKeys: Record<string, Point> = {
      ArrowLeft: { x: -18, y: 0 },
      ArrowRight: { x: 18, y: 0 },
      ArrowUp: { x: 0, y: -18 },
      ArrowDown: { x: 0, y: 18 },
    };
    const movement = movementKeys[event.key];
    if (movement) {
      event.preventDefault();
      this.pointer.x = Math.min(LOGICAL_WIDTH, Math.max(0, this.pointer.x + movement.x));
      this.pointer.y = Math.min(LOGICAL_HEIGHT, Math.max(0, this.pointer.y + movement.y));
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.pointer.active = true;
      this.lastAppliedPoint = { x: this.pointer.x, y: this.pointer.y };
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      this.pointer.active = false;
      this.lastAppliedPoint = null;
    }
  };

  private tick = (now: number): void => {
    if (this.destroyed) return;
    this.frameId = 0;
    const delta = Math.min(50, now - this.lastFrame);
    this.lastFrame = now;
    this.update(delta, now);
    this.render(now);
    if (!this.completing && !this.destroyed) this.frameId = requestAnimationFrame(this.tick);
  };

  private update(delta: number, now: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 0.00045 * delta;
      particle.life -= delta;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);

    if (this.pointer.active && !this.completing) {
      const current = { x: this.pointer.x, y: this.pointer.y };
      const previous = this.lastAppliedPoint ?? current;
      const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
      const result = this.applyStroke(previous, current, delta, now);
      const removed = result.removedMass;
      const compatible = result.compatibleRemoval;
      this.lastAppliedPoint = current;
      this.spawnParticles(current, Math.min(7, 2 + Math.ceil(distance / 24)));
      this.callbacks.onToolAction?.(this.activeTool, removed);

      if (removed > 0.006) this.lastProgressAt = now;
      if (removed > 0.012 && compatible < removed * 0.12 && now - this.lastHintAt > 3600) {
        const dirtiest = getDirtiestType(this.state);
        const preferredTool: Record<DirtType, ToolId> = {
          mud: 'water',
          dust: 'vacuum',
          hair: 'vacuum',
          oil: 'foam',
        };
        if (
          dirtiest &&
          this.level.availableTools.includes(preferredTool[dirtiest]) &&
          this.activeTool !== preferredTool[dirtiest]
        ) {
          this.callbacks.onHint(DIRT_TOOL_HINT[dirtiest]);
        }
        this.lastHintAt = now;
      }

      const progress = getCleanliness(this.state);
      this.callbacks.onProgress(progress);
      if (!this.revealTriggered && progress >= 0.53) {
        this.revealTriggered = true;
        this.callbacks.onReveal();
      }
      if (progress >= 0.985) this.finish();
    }

    if (
      !this.completing &&
      getCleanliness(this.state) > 0.65 &&
      now - this.lastProgressAt > 5500 &&
      now - this.lastHintAt > 5500
    ) {
      this.callbacks.onHint('找不到剩余污渍？点右侧扫描');
      this.lastHintAt = now;
    }
  }

  private applyStroke(start: Point, end: Point, delta: number, now: number) {
    const endUv = this.view.screenToUv(end);
    if (!endUv) return { removedMass: 0, touchedCells: 0, compatibleRemoval: 0 };
    const startUv = this.view.screenToUv(start) ?? endUv;
    const level = this.toolLevels[this.activeTool];
    const radiusMultiplier = (this.activeTool === 'water' && !this.wideSpray ? 0.62 : 1) *
      (1 + (level - 1) * 0.08);
    const efficiencyMultiplier =
      (this.activeTool === 'water' && !this.wideSpray ? 1.7 : 1) * (1 + (level - 1) * 0.12);
    const travel = Math.hypot(end.x - start.x, end.y - start.y);
    const dwellScale = Math.min(1.2, delta / 34);
    const travelScale = travel > 1 ? Math.min(1.25, 0.28 + travel / 38) : dwellScale;
    return applyToolStroke(
      this.state,
      this.activeTool,
      {
        startU: startUv.u,
        startV: startUv.v,
        endU: endUv.u,
        endV: endUv.v,
      },
      {
        radiusMultiplier,
        efficiencyMultiplier,
        deltaScale: Math.max(dwellScale, travelScale),
        now,
      },
    );
  }

  private getToolRadiusPixels(): { radiusX: number; radiusY: number } {
    const tool = TOOLS[this.activeTool];
    const level = this.toolLevels[this.activeTool];
    const nozzle = this.activeTool === 'water' && !this.wideSpray ? 0.62 : 1;
    const multiplier = nozzle * (1 + (level - 1) * 0.08);
    return {
      radiusX: tool.radius * OBJECT_RECT.width * multiplier,
      radiusY: tool.radius * OBJECT_RECT.height * multiplier,
    };
  }

  private spawnParticles(point: Point, count: number): void {
    const style: Record<ToolId, { color: string; size: number }> = {
      water: { color: '#b9edf2', size: 4 },
      vacuum: { color: '#6b7370', size: 2.2 },
      foam: { color: '#ffffff', size: 5 },
      brush: { color: '#b77e49', size: 3 },
    };
    const visual = style[this.activeTool];
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        x: point.x + (Math.random() - 0.5) * 24,
        y: point.y + (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -Math.random() * 0.14,
        life: 260 + Math.random() * 220,
        maxLife: 480,
        size: visual.size * (0.6 + Math.random() * 0.8),
        color: visual.color,
      });
    }
    if (this.particles.length > 130) this.particles.splice(0, this.particles.length - 130);
  }

  private render(now: number): void {
    this.view.render(
      this.state,
      this.pointer,
      this.particles,
      now < this.scanUntil,
      now,
    );
  }

  private finish(): void {
    if (this.completing) return;
    this.completing = true;
    this.pointer.active = false;
    finishRemainingDirt(this.state);
    this.callbacks.onProgress(1);
    this.render(performance.now());
    const afterImage = this.view.capture();
    this.completionTimer = window.setTimeout(() => {
      this.completionTimer = null;
      if (this.destroyed) return;
      this.callbacks.onComplete({
        elapsedSeconds: Math.max(1, Math.round((performance.now() - this.startedAt) / 1000)),
        beforeImage: this.beforeImage,
        afterImage,
      });
    }, 350);
  }

  setTool(tool: ToolId): void {
    if (!this.level.availableTools.includes(tool)) return;
    this.activeTool = tool;
    this.pointer.tool = tool;
    Object.assign(this.pointer, this.getToolRadiusPixels());
    this.lastAppliedPoint = null;
  }

  toggleNozzle(): boolean {
    this.wideSpray = !this.wideSpray;
    Object.assign(this.pointer, this.getToolRadiusPixels());
    return this.wideSpray;
  }

  scan(): void {
    this.scanUntil = performance.now() + 2200;
    this.lastProgressAt = performance.now();
  }

  reset(): void {
    if (this.completionTimer !== null) {
      window.clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
    this.state = createCleaningState(this.level.dirt, this.level.objectKind);
    this.startedAt = performance.now();
    this.lastProgressAt = performance.now();
    this.revealTriggered = false;
    this.completing = false;
    this.callbacks.onProgress(0);
    this.render(performance.now());
    this.beforeImage = this.view.capture();
    if (this.frameId === 0 && !this.destroyed) this.frameId = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.completionTimer !== null) window.clearTimeout(this.completionTimer);
    cancelAnimationFrame(this.frameId);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.view.destroy();
  }
}
