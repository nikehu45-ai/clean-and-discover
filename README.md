# 洗个痛快 · Clean & Discover

一个面向移动端的「解压清洁 + 探索发现 + 轻经营成长」游戏原型。

[在线试玩](https://nikehu45-ai.github.io/clean-and-discover/)

## Obsidian 项目库

本仓库已经配置为 Obsidian Vault。用 Obsidian 打开仓库根目录，然后从
[`00-项目主页.md`](./00-项目主页.md) 开始浏览。Git 同步设置见
[`docs/09-Git同步.md`](./docs/09-Git同步.md)。

## 当前可玩内容

- 5 个完整订单：旧地毯、白色跑鞋、布艺沙发、天窗和大型地毯 Boss
- 4 种工具：水枪、吸尘器、泡沫、毛刷
- 4 类独立污渍层：泥浆、灰尘、油污、毛发
- 宽喷 / 集中喷、工具克制与泡沫软化组合
- 规则矩形扫掠、快速移动连续覆盖、孤立污点自动消除
- 隐藏物发现、污渍扫描、最后 1.5% 自动收尾
- Three.js 正式 3D 场景、PBR 材质、动态污渍与柔和阴影
- 清洁前后对比、金币、解锁、工具升级、收藏与工作室成长
- 本地进度保存、触摸/鼠标操作、移动端适配、音效与轻震动

## 运行

```bash
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:4173/`。

## 验证

```bash
npm test
npm run build
```

## 代码结构

```text
src/
  data/levels.ts          订单、工具与污渍内容配置
  game/mask.ts            分层污渍、工具克制、清洁进度
  game/ThreeCleaningRenderer.ts  3D 场景、物体、工具与动态污渍
  game/render.ts          画布尺寸与共享渲染类型
  game/CleaningEngine.ts  输入、反馈、扫描和完成状态
  platform/               本地存档与网页音频适配
  main.ts                 工作室、关卡 HUD、结算与成长界面
```

当前版本是一段包含 5 个订单的完整 3D 可玩竖切，可继续沿相同配置模型扩展关卡与经营内容。
