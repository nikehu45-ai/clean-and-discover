export type ToolId = 'water' | 'vacuum' | 'foam' | 'brush';
export type DirtType = 'mud' | 'dust' | 'oil' | 'hair';
export type ObjectKind = 'rug' | 'sneaker' | 'sofa' | 'window' | 'large-rug';

export interface DirtDefinition {
  type: DirtType;
  coverage: number;
  density: number;
  seed: number;
}

export interface LevelDefinition {
  id: number;
  client: string;
  clientNote: string;
  title: string;
  objectKind: ObjectKind;
  contamination: number;
  reward: number;
  targetSeconds: number;
  dirt: DirtDefinition[];
  availableTools: ToolId[];
  recommendedTool: ToolId;
  hiddenItem: {
    id: string;
    name: string;
    clue: string;
    x: number;
    y: number;
  };
  palette: {
    base: string;
    accent: string;
    pattern: string;
  };
  isBoss?: boolean;
}

export interface ToolDefinition {
  id: ToolId;
  name: string;
  caption: string;
  color: string;
  radius: number;
  strengths: Record<DirtType, number>;
}

export interface SaveData {
  coins: number;
  unlockedLevel: number;
  completedLevels: number[];
  collectedItems: string[];
  toolLevels: Record<ToolId, number>;
  soundEnabled: boolean;
}

export interface GameResult {
  levelId: number;
  reward: number;
  elapsedSeconds: number;
  hiddenFound: boolean;
  beforeImage: string;
  afterImage: string;
}
