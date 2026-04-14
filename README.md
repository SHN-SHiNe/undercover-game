---
title: Undercover Game
emoji: 🎭
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---

# 谁是卧底 · 发牌助手

> **在线体验：[https://shn-shine.github.io/undercover-game/](https://shn-shine.github.io/undercover-game/)** 
>
> 备用地址：[https://shnshine-undercover-game.hf.space/](https://shnshine-undercover-game.hf.space/)

支持 PWA 安装，可添加到手机主屏幕离线使用。

## 功能

- 设置总人数、卧底人数、白板人数
- 为每位玩家设置名字与颜色
- 开始游戏：随机选词，随机分配卧底/白板/平民
- 长按玩家卡片查看自己的词（白板为空）
- 点击玩家卡片投票出局
- 实时判定胜负
- 词库管理：分类管理、手动添加、批量导入
- 词库云同步：有网时自动从服务器更新词库

## 技术栈

- **前端**：React + Vite，纯前端 PWA，游戏逻辑全部在浏览器运行
- **存储**：localStorage 离线缓存 + HF Spaces 服务器词库同步
- **部署**：GitHub Pages（静态）+ Hugging Face Spaces（词库同步 API）

## 本地开发

```bash
cd frontend
npm install
npm run dev
```

## 部署

推送到 `main` 分支后自动部署：
- **GitHub Pages**：通过 GitHub Actions 构建部署
- **HF Spaces**：Docker 构建，提供词库同步 API
