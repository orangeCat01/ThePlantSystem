# 银河系科普探索站 - Codex 协作规则

## 项目说明

- 项目名称：银河系科普探索站。
- 项目目标：基于 Vue 3、TypeScript、Vite 和 Three.js 开发交互式三维天文科普网站。
- 核心场景：太阳系探索场景优先，银河系探索场景后续推进。
- 当前优先级：以太阳系 MVP 为第一优先级，先建立稳定的 Vue 与 Three.js 架构边界。
- Phase 0 范围：只建立架构规范和协作规则，不实现业务功能。

## 架构分层

依赖方向必须保持单向：

```text
Vue Components
-> Pinia Store
-> ApplicationCoordinator
-> SceneManager
-> Three.js Scene Modules
-> Resource and Data Layer
```

禁止反向依赖。下层模块不得导入上层 UI、组件或页面模块。

## Vue 与 Three.js 边界

- Vue 负责页面、UI、用户输入入口和业务信息展示。
- Pinia 负责可序列化业务状态。
- Three.js 模块负责 `Scene`、`Camera`、`Renderer`、`Object3D`、动画和三维交互。
- Vue 组件禁止直接创建或持有 Three.js 运行时对象。
- Three.js 模块禁止依赖 Vue 组件。
- UI 与三维场景必须通过 Store、`ApplicationCoordinator` 或类型化回调通信。
- 信息面板只能通过天体 ID 和 Repository 获取科普数据，不得持有 `THREE.Object3D`。

## Pinia 规则

Pinia 可以保存：

- 当前场景名称。
- 当前选中天体 ID。
- 相机模式。
- 面板显示状态。
- 加载状态。
- 时间倍率。
- 轨道显示状态。
- 画质等级。
- 可序列化错误信息。

Pinia 禁止保存：

- `THREE.Scene`
- `THREE.Camera`
- `THREE.WebGLRenderer`
- `THREE.Object3D`
- `THREE.Mesh`
- `THREE.Geometry`
- `THREE.Material`
- `THREE.Texture`
- `THREE.Raycaster`
- `OrbitControls`
- 包含循环引用的运行时对象

## Three.js 核心规则

- 全应用必须只有一个主 `requestAnimationFrame` 循环。
- 持续动画必须基于 `deltaTime`，且 `deltaTime` 必须设置合理上限。
- 相机只能由 `CameraController` 统一控制。
- 模型只能通过统一 Loader 加载。
- 资源只能通过统一 `ResourceManager` 或释放工具销毁。
- 场景模块必须实现标准生命周期。
- 页面隐藏时必须暂停或降低更新频率。
- 禁止为银河恒星创建大量独立 `Mesh`。
- 银河粒子必须使用 `BufferGeometry + Points`。
- 公转不得使用无限 Tween。
- Tween 只可用于相机和有限时长过渡。

## 标准生命周期

场景模块和长期运行的管理器必须按需提供以下生命周期：

```text
init
-> start
-> update
-> pause
-> resume
-> resize
-> destroy
```

所有模块必须提供适当的销毁接口。`destroy` 必须可重复调用且不会造成二次释放错误。

## 资源释放规则

场景销毁时必须处理：

- Geometry。
- Material 和 Material 数组。
- Texture。
- RenderTarget。
- EffectComposer 资源。
- Controls。
- Pointer 和 Resize 事件。
- Tween。
- AnimationMixer。
- RAF 引用。
- Observer。
- 自定义回调。

共享材质和共享纹理必须由所有权方统一释放，禁止消费者重复释放。

## 数据规则

- 真实天文数据必须与三维视觉数据分离。
- 行星数据必须采用 TypeScript 类型约束。
- 模型路径、比例、轨道和相机参数应当由配置驱动。
- 禁止把行星参数散落在多个模块中。
- 科普数据缺失时不得直接向用户显示 `null` 或 `undefined`。

## 编码规则

- 新业务代码和公共接口必须使用 TypeScript；Vue 单文件组件使用 `<script setup lang="ts">`，除非现有文件有明确且合理的其他约定。
- 禁止无理由使用 `any`。
- 公共接口必须定义类型。
- 模块必须保持单一职责。
- 禁止创建超大综合类。
- 禁止在每帧更新中反复创建临时向量、四元数或矩阵。
- 应当复用 `Vector2`、`Vector3`、`Quaternion` 和矩阵临时对象。
- 所有异步操作必须处理失败。
- 禁止留下未说明的 TODO。
- 禁止进行与当前任务无关的重构。

## 执行与验证规则

每次修改后，Codex 必须：

1. 检查仓库已有脚本。
2. 优先运行已有格式化、类型检查、测试和构建命令。
3. 不自行猜测命令；必须从 `package.json`、`README.md` 或已有配置中确认。
4. 无法运行时说明具体原因。
5. 执行 `git diff --check`，如果当前目录不是 Git 仓库则明确说明。
6. 汇报修改文件和验证结果。
7. 禁止声称未实际执行的检查已经通过。

## 任务输入模板

后续 AI 协作任务应当尽量包含：

```text
任务名称
背景
当前仓库状态
允许修改范围
禁止修改范围
功能要求
接口要求
验收标准
必须运行的检查
最终报告格式
```

## 详细文档

- `docs/architecture/AI_COLLABORATION_ARCHITECTURE_V1.md`
- `docs/architecture/ADR-001-VUE_THREE_BOUNDARY.md`
- `docs/architecture/ADR-002-THREE_LIFECYCLE_AND_RESOURCES.md`
