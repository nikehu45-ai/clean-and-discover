import type { SaveData, ToolId } from '../types';

const STORAGE_KEY = 'clean-and-discover-save-v3';

export const DEFAULT_SAVE: SaveData = {
  coins: 120,
  unlockedLevel: 1,
  completedLevels: [],
  collectedItems: [],
  toolLevels: { water: 1, vacuum: 1, foam: 1, brush: 1 },
  soundEnabled: true,
};

function safeInteger(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const rawToolLevels = parsed.toolLevels ?? DEFAULT_SAVE.toolLevels;
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      coins: safeInteger(parsed.coins, DEFAULT_SAVE.coins, 0, 999_999),
      unlockedLevel: safeInteger(parsed.unlockedLevel, 1, 1, 100),
      completedLevels: Array.isArray(parsed.completedLevels)
        ? parsed.completedLevels.filter((id): id is number => Number.isInteger(id) && id > 0)
        : [],
      collectedItems: Array.isArray(parsed.collectedItems)
        ? parsed.collectedItems.filter((id): id is string => typeof id === 'string')
        : [],
      toolLevels: {
        water: safeInteger(rawToolLevels.water, 1, 1, 5),
        vacuum: safeInteger(rawToolLevels.vacuum, 1, 1, 5),
        foam: safeInteger(rawToolLevels.foam, 1, 1, 5),
        brush: safeInteger(rawToolLevels.brush, 1, 1, 5),
      },
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Gameplay remains usable in private or storage-blocked browser contexts.
  }
}

export function getUpgradeCost(tool: ToolId, level: number): number {
  const base: Record<ToolId, number> = { water: 160, vacuum: 220, foam: 280, brush: 280 };
  return base[tool] * level;
}
