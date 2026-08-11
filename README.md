# 银河系科普探索站

银河系科普探索站是一个基于 Vue 3、TypeScript、Vite、Pinia、Vue Router 和 Three.js 的交互式三维天文科普网站。项目当前以太阳系探索为核心，提供三维行星场景、天体信息面板、观测辅助、任务与深空对象等科普交互能力，并保留后续银河系场景扩展空间。

## 功能亮点

- 太阳系三维探索场景：基于 Three.js 管理行星、轨道、卫星、彗星、小行星带和背景星空。
- 类型化天文数据：行星、恒星、深空对象、任务、望远镜配置等数据集中管理。
- Vue 与 Three.js 分层：UI 状态通过 Pinia、ApplicationCoordinator 和场景模块通信，避免组件直接持有 Three.js 运行时对象。
- 模型加载与降级：统一 ModelLoader 加载 public/models 下的 glTF 资源，加载失败时提供占位模型并上报错误。
- 子路径静态部署：Vite `base` 配置为 `/plant/`，模型资源与 Vue Router history 均适配服务器子目录部署。
- 可验证脚本：仓库包含若干 `scripts/verify-*` 脚本，用于检查场景、资源、UI 与架构边界。
##体验地址
http://47.109.207.74:3001/plant/universe/galaxy

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Three.js
- SCSS

## 环境要求

建议使用 Node.js 22 或兼容当前 Vite 版本的 Node.js 环境。包管理器使用 npm，仓库已包含 `package-lock.json`。

## 快速开始

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

## 项目结构

```text
src/
├── app/                 # ApplicationCoordinator、OverlayManager 与应用生命周期
├── astronomy/           # 天文计算、观测、坐标和事件逻辑
├── components/          # Vue UI 组件
├── data/                # 行星、恒星、任务、深空对象等静态配置
├── mission/             # 任务时间与任务相关业务逻辑
├── repositories/        # 科普数据访问入口
├── router/              # Vue Router 配置
├── stores/              # Pinia 可序列化状态
├── styles/              # 全局样式与变量
├── three/               # Three.js 场景、控制器、效果、加载器和资源管理
├── types/               # 公共 TypeScript 类型
└── views/               # 页面级视图
```

## 架构原则

项目遵守单向依赖边界：

```text
Vue Components
-> Pinia Store
-> ApplicationCoordinator
-> SceneManager
-> Three.js Scene Modules
-> Resource and Data Layer
```

核心约束：

- Vue 组件只负责 UI、输入入口和业务信息展示。
- Pinia 只保存可序列化业务状态，不保存 `THREE.Scene`、`THREE.Mesh`、`OrbitControls` 等运行时对象。
- Three.js 模块只负责场景、相机、渲染器、对象、动画和三维交互。
- 场景模块和长期运行的管理器需要提供清晰生命周期，并支持可重复调用的 `destroy`。
- 模型和纹理等资源由统一加载器与资源管理模块负责加载和释放。

更多协作与架构规则见：

- `AGENTS.md`
- `docs/architecture/AI_COLLABORATION_ARCHITECTURE_V1.md`
- `docs/architecture/ADR-001-VUE_THREE_BOUNDARY.md`
- `docs/architecture/ADR-002-THREE_LIFECYCLE_AND_RESOURCES.md`

## 模型资源说明

模型资源位于 `public/models/`。部分资源沿用了原始文件名，例如：

- `public/models/venus/vueus.gltf`
- `public/models/mercury/merculy.gltf`
- `public/models/neptun/neptun.gltf`
- `public/models/Earth/Earth.gltf`

这些命名在 `src/data/models/planet-models.ts` 中显式配置，避免按天体 ID 自动拼接路径导致 404。

## 常用验证

完整构建验证：

```bash
npm run build
```

模型与子路径部署验证：

```bash
node scripts/run-vite-verify.mjs /scripts/verify-model-base-path.ts
```

Git 空白检查：

```bash
git diff --check
```

##展示
<img width="1915" height="924" alt="image" src="https://github.com/user-attachments/assets/32a1ae1b-8923-4418-851f-fff8c4086aa5" />
<img width="1906" height="928" alt="image" src="https://github.com/user-attachments/assets/f0b59172-983b-405e-bd37-82a810e113a4" />


