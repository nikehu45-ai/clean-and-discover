---
tags:
  - 开发/Git
  - 工具/Obsidian
status: 已配置
---

# Git 同步

## 当前状态

- 本地 Vault：项目仓库根目录
- GitHub：`nikehu45-ai/clean-and-discover`
- 默认分支：`main`
- 远程名称：`origin`

## 在 Obsidian 中启用同步

1. 打开“设置 → 第三方插件”，关闭安全模式。
2. 浏览社区插件并安装 **Obsidian Git**。
3. 启用插件，设置自动拉取间隔为 10 分钟。
4. 设置自动提交与推送间隔为 10–30 分钟。
5. 提交信息可使用：`vault backup: {{date}}`。

仓库和远程地址已经配置完成，不需要再次 Clone。

## 建议流程

开始编辑前先 Pull；完成一段独立内容后 Commit；准备跨设备继续工作时 Push。代码变更仍建议先运行：

```bash
npm test
npm run build
```

## 冲突处理

如果出现冲突，优先保留内容笔记；`.obsidian/workspace*.json` 已被忽略，不会参与多设备同步。不要把 GitHub Token 写入笔记或插件配置。

返回 [[00-项目主页]]
