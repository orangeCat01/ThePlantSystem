# 银河系科普探索站

银河系科普探索站是一个基于 Vue 3、TypeScript、Pinia、Vue Router、Vite 和 Three.js 的交互式三维天文科普网站。当前以太阳系 MVP 为第一优先级，后续再扩展银河系探索场景。

## 当前开发阶段

Phase 1：工程初始化与基础骨架搭建。

本阶段已经建立可启动、可构建的前端工程骨架，包括应用入口、路由、Pinia 状态、Three.js Canvas 宿主、基础生命周期管理和太阳系/银河系占位场景。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Three.js
- SCSS

## 环境要求

建议使用 Node.js 22 或兼容当前 Vite 版本的 Node.js 环境。包管理器使用 npm，因为仓库已有 `package-lock.json`。

## 安装命令

```bash
npm install
```

## 启动命令

```bash
npm run dev
```

## 类型检查命令

```bash
npm run type-check
```

## 构建命令

```bash
npm run build
```

## 项目目录概览

```text
src/
├── app/                 # ApplicationCoordinator 与应用生命周期
├── views/               # 路由页面
├── components/          # UI 展示组件
├── stores/              # Pinia 可序列化状态
├── three/               # Three.js 核心层与场景骨架
├── router/              # Vue Router 配置
├── styles/              # SCSS 变量、重置和全局样式
├── types/               # 公共 TypeScript 类型
├── data/                # 后续静态数据入口
├── repositories/        # 后续数据访问入口
└── utils/               # 后续通用工具入口
```

## 架构文档入口

- `AGENTS.md`
- `docs/architecture/AI_COLLABORATION_ARCHITECTURE_V1.md`
- `docs/architecture/ADR-001-VUE_THREE_BOUNDARY.md`
- `docs/architecture/ADR-002-THREE_LIFECYCLE_AND_RESOURCES.md`

## 当前未实现功能

- 真实太阳系天体。
- GLB 模型加载。
- 行星公转和自转。
- Raycaster 天体点击。
- 相机聚焦、跟随和复位。
- 真实银河粒子系统。
- Bloom 和 Shader 特效。
- 科普业务数据和完整信息面板。

## 下一阶段说明

Phase 2 建议在当前骨架上补充太阳系 MVP 的类型化数据配置、基础天体管理器和最小可验证的行星对象，但仍应遵守 Vue 与 Three.js 的职责边界。
