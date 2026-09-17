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

## Obsidian Git 状态

- 已安装 Obsidian Git 2.40.0。
- 打开 Vault 时自动拉取。
- 每 10 分钟检查远程更新。
- 每 30 分钟自动提交、拉取并推送。
- 自动提交信息：`vault backup: {{date}}`。

仓库和远程地址已经配置完成，不需要再次 Clone。首次启用第三方插件时，Obsidian 可能会要求确认社区插件安全提示；确认后重新加载 Vault 即可。

## 建议流程

自动同步会包含仓库中的全部改动。进行代码开发时可以在 Obsidian Git 状态栏暂停自动备份，完成并验证后再恢复。代码变更仍建议先运行：

```bash
npm test
npm run build
```

## 冲突处理

如果出现冲突，优先保留内容笔记；`.obsidian/workspace*.json` 已被忽略，不会参与多设备同步。不要把 GitHub Token 写入笔记或插件配置。

返回 [[00-项目主页]]
