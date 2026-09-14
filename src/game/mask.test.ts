import { describe, expect, it } from 'vitest';
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  applyTool,
  applyToolStroke,
  createCleaningState,
  finishRemainingDirt,
  getCleanliness,
} from './mask';

describe('cleaning mask model', () => {
  it('removes mud faster with water than vacuum', () => {
    const definition = [{ type: 'mud' as const, coverage: 0.9, density: 1, seed: 1 }];
    const waterState = createCleaningState(definition, 'rug');
    const vacuumState = createCleaningState(definition, 'rug');
    const options = { radiusMultiplier: 1, efficiencyMultiplier: 1, deltaScale: 1, now: 1000 };

    const water = applyTool(waterState, 'water', 0.5, 0.5, options);
    const vacuum = applyTool(vacuumState, 'vacuum', 0.5, 0.5, options);

    expect(water.removedMass).toBeGreaterThan(vacuum.removedMass * 8);
  });

  it('makes foam-softened oil respond strongly to the brush', () => {
    const definition = [{ type: 'oil' as const, coverage: 0.9, density: 1, seed: 3 }];
    const dryState = createCleaningState(definition, 'window');
    const softenedState = createCleaningState(definition, 'window');
    const common = { radiusMultiplier: 1, efficiencyMultiplier: 1, deltaScale: 1 };

    applyTool(softenedState, 'foam', 0.5, 0.5, { ...common, now: 100 });
    const dry = applyTool(dryState, 'brush', 0.5, 0.5, { ...common, now: 1000 });
    const softened = applyTool(softenedState, 'brush', 0.5, 0.5, { ...common, now: 1000 });

    expect(softened.removedMass).toBeGreaterThan(dry.removedMass * 3);
  });

  it('can safely auto-finish the final residue', () => {
    const state = createCleaningState(
      [{ type: 'dust', coverage: 0.5, density: 0.7, seed: 7 }],
      'sofa',
    );
    applyTool(state, 'foam', 0.5, 0.5, {
      radiusMultiplier: 1,
      efficiencyMultiplier: 1,
      deltaScale: 1,
      now: 100,
    });
    finishRemainingDirt(state);
    expect(getCleanliness(state)).toBe(1);
    expect(state.foam.every((cell) => cell === 0)).toBe(true);
  });

  it('covers a fast stroke continuously without pinholes', () => {
    const state = createCleaningState(
      [{ type: 'mud', coverage: 1, density: 1, seed: 31 }],
      'window',
    );
    const layer = state.layers[0];
    layer.cells.fill(1);
    layer.initialMass = layer.cells.length;
    layer.remainingMass = layer.cells.length;
    state.initialMass = layer.cells.length;
    state.remainingMass = layer.cells.length;

    applyToolStroke(
      state,
      'water',
      { startU: 0.16, startV: 0.5, endU: 0.84, endV: 0.5 },
      { radiusMultiplier: 1, efficiencyMultiplier: 20, deltaScale: 1, now: 1000 },
    );

    const centerY = Math.floor(GRID_HEIGHT * 0.5);
    for (let x = Math.floor(GRID_WIDTH * 0.16); x <= Math.ceil(GRID_WIDTH * 0.84); x += 1) {
      expect(layer.cells[centerY * GRID_WIDTH + x]).toBe(0);
    }
  });

  it.each(['rug', 'sneaker', 'sofa', 'window', 'large-rug'] as const)(
    'creates a usable dirt mask for %s',
    (kind) => {
      const state = createCleaningState(
        [{ type: 'dust', coverage: 0.7, density: 0.8, seed: 19 }],
        kind,
      );
      expect(state.initialMass).toBeGreaterThan(100);
    },
  );
});
