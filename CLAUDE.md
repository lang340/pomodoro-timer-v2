# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Windows 绿色便携版番茄钟，Electron 28 + vanilla JS，无框架。打包后单个 .exe 双击即用，数据存 exe 同目录 JSON。

## Commands

```bash
npm start          # 开发模式（通过 start.js 启动，自动清除 ELECTRON_RUN_AS_NODE 环境变量）
npm run build      # 打包 portable .exe → dist/PomodoroTimer.exe
```

## Architecture

Electron 三进程模型，代码分三层：

**主进程 `main.js`** — 窗口管理（frameless BrowserWindow 380x520）、系统托盘（Tray + 双击恢复）、IPC 处理、JSON 数据读写。关闭窗口时 hide 到托盘而非退出，通过 `app.isQuitting` 标志区分。

**预加载 `preload.js`** — contextBridge 暴露 `window.api`，三个命名空间：`data`（load/save）、`notification`（send）、`window`（minimize）。渲染进程只能通过此桥接与主进程通信。

**渲染进程 `renderer/`** — 纯前端，无 Node.js 访问。
- `app.js`: IIFE 闭包内的状态机。`state` 对象持有所有运行状态，`setPhase()` 切换阶段，`tick()` 每秒驱动倒计时，`onTimerComplete()` 处理阶段转换和数据持久化。计时周期：work(25min) → shortBreak(5min) × 4 → longBreak(15min) 循环。
- `style.css`: CSS 变量驱动主题切换，`body` 的 className（work/short-break/long-break）切换 `--accent` 和 `--glow`，进度环通过 `stroke-dashoffset` 动画。
- `index.html`: 无外部依赖，CSP 限制为 `'self'`。

**启动脚本 `start.js`** — 仅用于开发模式。清除 `ELECTRON_RUN_AS_NODE` 环境变量后 spawn electron，否则 `require('electron')` 返回路径字符串而非 API 对象。

## Data Model

`pomodoro-data.json`（开发时存项目目录，打包后存 exe 同目录）：

```json
{
  "today": "2026-05-13",
  "completedPomodoros": 3,
  "totalMinutes": 75,
  "history": [{ "date": "2026-05-13", "count": 3, "minutes": 75 }]
}
```

## Key Patterns

- 声音：Web Audio API 合成（OscillatorNode 800/1000/800Hz），无外部音频文件
- 通知：主进程 `Notification` API，通过 IPC 调用
- 托盘图标：无 icon.png 时用 SVG Buffer 动态生成 16x16 图标
- 主题色：工作中红 `#e74c3c`，短休息绿 `#2ecc71`，长休息蓝 `#3498db`

## Known Issues

- 开发环境必须通过 `start.js` 启动，直接 `electron .` 会因 `ELECTRON_RUN_AS_NODE=1` 失败
- 打包时 rcedit 设置版本信息会报错（不影响功能）
- GPU cache 警告可忽略
