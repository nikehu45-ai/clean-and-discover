import './styles.css';
import { LEVELS, TOOLS, TOOL_ORDER } from './data/levels';
import { CleaningEngine } from './game/CleaningEngine';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, OBJECT_RECT } from './game/render';
import { GameAudio } from './platform/audio';
import { getUpgradeCost, loadSave, persistSave } from './platform/storage';
import type { GameResult, LevelDefinition, ToolId } from './types';

type HubTab = 'orders' | 'tools' | 'collection' | 'studio';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('App root was not found');
const app: HTMLDivElement = appElement;

let save = loadSave();
let selectedLevelId = Math.min(save.unlockedLevel, LEVELS.length);
let activeTab: HubTab = 'orders';
let engine: CleaningEngine | null = null;
let hiddenFound = false;
const audio = new GameAudio(save.soundEnabled);

const icons: Record<string, string> = {
  orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l2 3v13H5V7l2-3Z"/><path d="M8 10h8M8 14h8"/></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6 4-4 4 4-4 4M3 21l10-10M5 16l3 3"/></svg>',
  collection: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v17H5zM8 4V2h8v2M9 9h6M9 13h6"/></svg>',
  studio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13M8 21v-7h8v7"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4ZM17 9c1.3 1.6 1.3 4.4 0 6M19.5 6.5c3 3 3 8 0 11"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4ZM17 10l5 5M22 10l-5 5"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V3m0 0h5M4 3l4 4a8 8 0 1 1-2 9"/></svg>',
  water: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h10l3 3-3 3H8l-4-3V8ZM14 8l2-4h4M8 14v5"/></svg>',
  vacuum: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h8v12H6zM14 6c5 0 5 5 5 9v3M3 20h18M8 8h4"/></svg>',
  foam: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="14" r="5"/><circle cx="15.5" cy="10" r="3.5"/><circle cx="17" cy="16.5" r="2.5"/></svg>',
  brush: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5-8 8-5-5 8-8ZM5 14l5 5M3 17l4 4"/></svg>',
  scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M14.5 8.5a4 4 0 1 0 0 7"/></svg>',
};

function toolUnlockLevel(tool: ToolId): number {
  if (tool === 'water') return 1;
  if (tool === 'vacuum') return 2;
  return 3;
}

function objectMark(level: LevelDefinition): string {
  if (level.objectKind === 'rug' || level.objectKind === 'large-rug') {
    return `<span class="object-mark rug-mark ${level.objectKind === 'large-rug' ? 'large-rug-mark' : ''}"><i></i></span>`;
  }
  if (level.objectKind === 'sneaker') return '<span class="object-mark sneaker-mark"><i></i></span>';
  if (level.objectKind === 'sofa') return '<span class="object-mark sofa-mark"><i></i></span>';
  return '<span class="object-mark window-mark"><i></i><i></i></span>';
}

function contaminationStars(count: number): string {
  return Array.from({ length: 5 }, (_, index) => `<span class="star ${index < count ? 'filled' : ''}">◆</span>`).join('');
}

function renderHub(): void {
  engine?.destroy();
  engine = null;
  const selectedLevel = LEVELS.find((level) => level.id === selectedLevelId) ?? LEVELS[0];
  const completed = save.completedLevels.length;
  const studioLevel = Math.min(3, 1 + Math.floor(completed / 2));

  app.innerHTML = `
    <main class="app-shell hub-shell studio-level-${studioLevel}">
      <section class="hub-screen" aria-label="清洁工作室">
        <header class="hub-header">
          <div class="brand-lockup">
            <span class="brand-drop"></span>
            <div><strong>洗个痛快</strong><small>Clean &amp; Discover</small></div>
          </div>
          <div class="coin-pill">${icons.coin}<span>${save.coins}</span></div>
        </header>

        <div class="workshop-scene" aria-hidden="true">
          <div class="window-light"></div>
          <div class="pegboard">
            <span class="peg-tool peg-one"></span><span class="peg-tool peg-two"></span>
            <span class="peg-tool peg-three"></span>
          </div>
          <div class="shelf"><span></span><span></span><span></span></div>
          <div class="workbench">
            <div class="workbench-object">${objectMark(selectedLevel)}</div>
            <div class="bench-edge"></div>
          </div>
          <div class="studio-level-sign">工作室 ${studioLevel} 级</div>
        </div>

        <section class="hub-panel" id="hub-panel"></section>

        <nav class="hub-nav" aria-label="工作室功能">
          ${([
            ['orders', '订单'],
            ['tools', '工具'],
            ['collection', '收藏'],
            ['studio', '工作室'],
          ] as [HubTab, string][])
            .map(
              ([id, label]) => `
                <button class="nav-button ${activeTab === id ? 'active' : ''}" data-tab="${id}">
                  ${icons[id]}<span>${label}</span>
                </button>`,
            )
            .join('')}
        </nav>
      </section>
    </main>`;

  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab as HubTab;
      renderHub();
    });
  });
  renderHubPanel(selectedLevel, studioLevel);
}

function renderHubPanel(level: LevelDefinition, studioLevel: number): void {
  const panel = document.querySelector<HTMLElement>('#hub-panel');
  if (!panel) return;
  const completed = save.completedLevels.length;

  if (activeTab === 'orders') {
    panel.innerHTML = `
      <div class="order-switcher" role="tablist" aria-label="选择订单">
        ${LEVELS.map((item) => {
          const unlocked = item.id <= save.unlockedLevel;
          const complete = save.completedLevels.includes(item.id);
          return `<button class="order-dot ${item.id === level.id ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-level="${item.id}" ${unlocked ? '' : 'disabled'} aria-label="${item.title}">
            <span>${item.id}</span>${complete ? '<b>✓</b>' : ''}
          </button>`;
        }).join('')}
      </div>
      <article class="order-card ${level.isBoss ? 'boss-order' : ''}">
        <div class="order-copy">
          <div class="client-row"><span class="client-avatar">${level.client.slice(0, 1)}</span><span>${level.client}</span>${level.isBoss ? '<em>大型任务</em>' : ''}</div>
          <h1>${level.title}</h1>
          <p>${level.clientNote}</p>
          <div class="order-meta">
            <span class="dirt-rating" aria-label="污染程度 ${level.contamination} 星">${contaminationStars(level.contamination)}</span>
            <span>${icons.coin}${level.reward}</span>
            <span>约 ${Math.round(level.targetSeconds / 60)} 分钟</span>
          </div>
        </div>
        <button class="primary-button" id="start-order">开始清洁</button>
      </article>`;
    panel.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedLevelId = Number(button.dataset.level);
        renderHub();
      });
    });
    panel.querySelector<HTMLButtonElement>('#start-order')?.addEventListener('click', () => startGame(level));
    return;
  }

  if (activeTab === 'tools') {
    panel.innerHTML = `
      <div class="panel-heading"><div><h2>工具架</h2><p>升级会直接扩大范围和清洁效率。</p></div></div>
      <div class="tool-upgrade-list">
        ${TOOL_ORDER.map((toolId) => {
          const tool = TOOLS[toolId];
          const unlocked = save.unlockedLevel >= toolUnlockLevel(toolId);
          const levelValue = save.toolLevels[toolId];
          const cost = getUpgradeCost(toolId, levelValue);
          return `<article class="upgrade-row ${unlocked ? '' : 'locked'}">
            <span class="upgrade-icon" style="--tool-color:${tool.color}">${icons[toolId]}</span>
            <div><strong>${tool.name}</strong><small>${unlocked ? `等级 ${levelValue} · ${tool.caption}` : `完成第 ${toolUnlockLevel(toolId) - 1} 单解锁`}</small></div>
            ${unlocked && levelValue < 5 ? `<button data-upgrade="${toolId}" ${save.coins < cost ? 'disabled' : ''}>${icons.coin}${cost}</button>` : `<span class="max-label">${levelValue >= 5 ? '已满级' : '未解锁'}</span>`}
          </article>`;
        }).join('')}
      </div>`;
    panel.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
      button.addEventListener('click', () => {
        const tool = button.dataset.upgrade as ToolId;
        const cost = getUpgradeCost(tool, save.toolLevels[tool]);
        if (save.coins < cost || save.toolLevels[tool] >= 5) return;
        save.coins -= cost;
        save.toolLevels[tool] += 1;
        persistSave(save);
        renderHub();
      });
    });
    return;
  }

  if (activeTab === 'collection') {
    panel.innerHTML = `
      <div class="panel-heading"><div><h2>失物收藏</h2><p>污渍下面，有些东西一直在等人发现。</p></div><strong>${save.collectedItems.length}/${LEVELS.length}</strong></div>
      <div class="collection-grid">
        ${LEVELS.map((item) => {
          const found = save.collectedItems.includes(item.hiddenItem.id);
          return `<article class="collection-item ${found ? 'found' : ''}">
            <span class="collection-silhouette">${found ? '✦' : '?'}</span>
            <strong>${found ? item.hiddenItem.name : '尚未发现'}</strong>
            <small>${found ? item.hiddenItem.clue : `第 ${item.id} 单 · 隐藏物`}</small>
          </article>`;
        }).join('')}
      </div>`;
    return;
  }

  const nextStudioTarget = studioLevel * 2;
  panel.innerHTML = `
    <div class="panel-heading"><div><h2>我的工作室</h2><p>完成订单，让这个旧车库一点点亮起来。</p></div><strong>${studioLevel} 级</strong></div>
    <div class="studio-progress-card">
      <div class="studio-progress-copy"><span>下一次焕新</span><strong>${Math.min(completed, nextStudioTarget)} / ${nextStudioTarget} 单</strong></div>
      <div class="studio-progress-track"><i style="width:${Math.min(100, (completed / nextStudioTarget) * 100)}%"></i></div>
      <div class="studio-perks"><span class="active">工作台</span><span class="${studioLevel >= 2 ? 'active' : ''}">工具墙</span><span class="${studioLevel >= 3 ? 'active' : ''}">展示柜</span></div>
    </div>`;
}

function startGame(level: LevelDefinition): void {
  hiddenFound = save.collectedItems.includes(level.hiddenItem.id);
  let activeTool = level.availableTools.includes(level.recommendedTool)
    ? level.recommendedTool
    : level.availableTools[0];
  app.innerHTML = `
    <main class="app-shell game-shell">
      <section class="game-screen">
        <header class="game-header">
          <button class="icon-button pause-button" id="back-button" aria-label="返回工作室"><span></span><span></span></button>
          <i class="header-divider"></i>
          <div class="level-title"><small>第 ${level.id} 单${level.isBoss ? ' · 大型任务' : ''}</small><strong>${level.title}</strong></div>
          <div class="header-actions">
            <div class="game-coin-pill">${icons.coin}<strong>${save.coins}</strong><span>＋</span></div>
            <button class="icon-button" id="sound-button" aria-label="切换声音">${save.soundEnabled ? icons.sound : icons.muted}</button>
            <button class="icon-button" id="reset-button" aria-label="重新开始">${icons.reset}</button>
          </div>
        </header>

        <div class="playfield">
          <div class="canvas-coordinate-layer">
            <canvas id="game-canvas" tabindex="0" aria-label="清洁物体。方向键移动工具，空格键或回车键持续清洗。"></canvas>
            <button class="hidden-item ${hiddenFound ? 'already-found' : ''}" id="hidden-item" style="left:${((OBJECT_RECT.x + level.hiddenItem.x * OBJECT_RECT.width) / LOGICAL_WIDTH) * 100}%;top:${((OBJECT_RECT.y + level.hiddenItem.y * OBJECT_RECT.height) / LOGICAL_HEIGHT) * 100}%" aria-label="收集${level.hiddenItem.name}">
              <span></span><i>发现</i>
            </button>
          </div>
          <div class="client-message">
            <span class="client-portrait"><i>${level.client.slice(0, 1)}</i></span>
            <p>${level.clientNote.replace(/[“”]/g, '')}<br><b>帮我把它恢复原样吧！</b></p>
          </div>
          <div class="cleanliness-card">
            <span>清洁度</span>
            <strong id="progress-number">0%</strong>
            <div class="progress-track" id="progress-track" role="progressbar" aria-label="清洁度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="progress-fill"></i></div>
            <small>让它焕然一新吧</small>
          </div>
          <div class="gesture-tip" id="gesture-tip"><span class="gesture-hand"></span><b>按住并滑动，使用${TOOLS[activeTool].name}清洗</b></div>
          <div class="toast" id="game-toast" role="status"></div>
        </div>
        <nav class="tool-dock" aria-label="清洁工具">
          ${TOOL_ORDER.map((toolId) => {
            const available = level.availableTools.includes(toolId);
            return `<button class="tool-button ${toolId === activeTool ? 'active' : ''} ${available ? '' : 'locked'}" ${available ? `data-tool="${toolId}" aria-pressed="${toolId === activeTool}"` : 'disabled'} style="--tool-color:${TOOLS[toolId].color}">
              <span>${icons[toolId]}${available ? '' : '<i class="tool-lock">◆</i>'}</span>
              <b>${TOOLS[toolId].name}</b>
              <small>${available ? TOOLS[toolId].caption : `第 ${toolUnlockLevel(toolId)} 单解锁`}</small>
            </button>`;
          }).join('')}
        </nav>
        <div class="game-bottom-bar">
          <div class="tool-context"><span class="hint-bulb">✦</span><span id="tool-caption">小提示：${TOOLS[activeTool].caption}，试试看吧</span><button id="nozzle-button" class="nozzle-button ${activeTool === 'water' ? '' : 'hidden'}">宽喷</button></div>
          <button class="scan-button" id="scan-button">${icons.scan}<span>污渍扫描</span></button>
        </div>
      </section>
    </main>`;

  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const progressNumber = document.querySelector<HTMLElement>('#progress-number');
  const progressFill = document.querySelector<HTMLElement>('#progress-fill');
  const progressTrack = document.querySelector<HTMLElement>('#progress-track');
  const hiddenButton = document.querySelector<HTMLButtonElement>('#hidden-item');
  const gestureTip = document.querySelector<HTMLElement>('#gesture-tip');
  if (!canvas || !progressNumber || !progressFill || !hiddenButton) return;

  let toastTimer = 0;
  const showToast = (message: string): void => {
    const toast = document.querySelector<HTMLElement>('#game-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2400);
  };

  engine = new CleaningEngine(canvas, level, save.toolLevels, {
    onProgress: (progress) => {
      const percentage = Math.min(100, Math.floor(progress * 100));
      progressNumber.textContent = `${percentage}%`;
      progressFill.style.width = `${percentage}%`;
      progressTrack?.setAttribute('aria-valuenow', String(percentage));
      if (progress > 0.01) gestureTip?.classList.add('dismissed');
      if (progress > 0.88 && !hiddenFound) hiddenButton.classList.add('urgent');
    },
    onReveal: () => {
      if (!hiddenFound) hiddenButton.classList.add('revealed');
      showToast('图案出现了，下面好像还藏着东西');
    },
    onHint: showToast,
    onToolAction: (tool, amount) => {
      audio.playTool(tool, amount);
      if (amount > 0.06 && 'vibrate' in navigator) navigator.vibrate(7);
    },
    onComplete: ({ elapsedSeconds, beforeImage, afterImage }) => {
      const wasCompleted = save.completedLevels.includes(level.id);
      const reward = wasCompleted ? Math.max(40, Math.round(level.reward * 0.25)) : level.reward;
      if (!wasCompleted) save.completedLevels.push(level.id);
      save.coins += reward;
      save.unlockedLevel = Math.min(LEVELS.length, Math.max(save.unlockedLevel, level.id + 1));
      if (hiddenFound && !save.collectedItems.includes(level.hiddenItem.id)) {
        save.collectedItems.push(level.hiddenItem.id);
      }
      persistSave(save);
      audio.playComplete();
      showResult({
        levelId: level.id,
        reward,
        elapsedSeconds,
        hiddenFound,
        beforeImage,
        afterImage,
      });
    },
  });

  canvas.addEventListener('pointerdown', () => gestureTip?.classList.add('dismissed'), { once: true });
  document.querySelector<HTMLButtonElement>('#back-button')?.addEventListener('click', () => {
    activeTab = 'orders';
    renderHub();
  });
  document.querySelector<HTMLButtonElement>('#sound-button')?.addEventListener('click', () => {
    save.soundEnabled = !save.soundEnabled;
    audio.setEnabled(save.soundEnabled);
    persistSave(save);
    const button = document.querySelector<HTMLButtonElement>('#sound-button');
    if (button) button.innerHTML = save.soundEnabled ? icons.sound : icons.muted;
  });
  document.querySelector<HTMLButtonElement>('#reset-button')?.addEventListener('click', () => {
    hiddenFound = save.collectedItems.includes(level.hiddenItem.id);
    hiddenButton.classList.remove('revealed', 'urgent', 'collected');
    engine?.reset();
    showToast('已重新开始本单');
  });
  document.querySelector<HTMLButtonElement>('#scan-button')?.addEventListener('click', () => {
    engine?.scan();
    showToast('剩余污渍已高亮 2 秒');
  });
  document.querySelector<HTMLButtonElement>('#nozzle-button')?.addEventListener('click', (event) => {
    const wide = engine?.toggleNozzle() ?? true;
    (event.currentTarget as HTMLButtonElement).textContent = wide ? '宽喷' : '集中喷';
    showToast(wide ? '宽喷：范围更大' : '集中喷：压力更强');
  });
  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTool = button.dataset.tool as ToolId;
      engine?.setTool(activeTool);
      document.querySelectorAll('[data-tool]').forEach((item) => {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      const caption = document.querySelector<HTMLElement>('#tool-caption');
      if (caption) caption.textContent = `小提示：${TOOLS[activeTool].caption}，试试看吧`;
      document.querySelector<HTMLElement>('#nozzle-button')?.classList.toggle('hidden', activeTool !== 'water');
    });
  });
  hiddenButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!hiddenButton.classList.contains('revealed') || hiddenFound) return;
    hiddenFound = true;
    hiddenButton.classList.add('collected');
    audio.playCollect();
    if ('vibrate' in navigator) navigator.vibrate([12, 35, 18]);
    showToast(`发现：${level.hiddenItem.name}`);
  });
}

function showResult(result: GameResult): void {
  const level = LEVELS.find((item) => item.id === result.levelId);
  if (!level) return;
  const nextLevel = LEVELS.find((item) => item.id === result.levelId + 1);
  const host = document.querySelector<HTMLElement>('.game-screen');
  if (!host) return;
  const overlay = document.createElement('section');
  overlay.className = 'result-overlay';
  overlay.innerHTML = `
    <div class="result-sheet">
      <div class="result-kicker"><span></span>100% 洁净</div>
      <h2>焕然一新</h2>
      <div class="comparison">
        <img src="${result.beforeImage}" alt="清洁前" class="before-image" />
        <div class="after-window"><img src="${result.afterImage}" alt="清洁后" /></div>
        <span class="before-label">清洁前</span><span class="after-label">清洁后</span>
      </div>
      <div class="result-stats">
        <div><span>用时</span><strong>${Math.floor(result.elapsedSeconds / 60)}:${String(result.elapsedSeconds % 60).padStart(2, '0')}</strong></div>
        <div><span>奖励</span><strong>${icons.coin}${result.reward}</strong></div>
        <div><span>发现</span><strong>${result.hiddenFound ? level.hiddenItem.name : '留待下次'}</strong></div>
      </div>
      <button class="primary-button" id="result-next">${nextLevel ? '查看下一单' : '回到工作室'}</button>
      <button class="text-button" id="result-home">返回工作室</button>
    </div>`;
  host.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  overlay.querySelector<HTMLButtonElement>('#result-next')?.addEventListener('click', () => {
    if (nextLevel) selectedLevelId = nextLevel.id;
    activeTab = 'orders';
    renderHub();
  });
  overlay.querySelector<HTMLButtonElement>('#result-home')?.addEventListener('click', () => {
    activeTab = 'orders';
    renderHub();
  });
}

renderHub();
