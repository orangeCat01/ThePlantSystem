# ADR-001: Vue 与 Three.js 的职责边界

## 状态

已采用。

## 背景

银河系科普探索站需要同时维护 Vue UI、Pinia 状态和 Three.js/WebGL 运行时。若 Vue 组件直接创建场景、相机、模型或 renderer，项目会快速出现生命周期混乱、资源泄漏、状态难以序列化和测试困难。若 Three.js 模块反向依赖 Vue 组件，后续场景切换、复用和性能调优都会受阻。

本 ADR 确定 Vue、Pinia、协调层和 Three.js 模块之间的职责边界。

## 决策

1. Vue 不直接管理 Three.js 运行时对象。
2. Pinia 只保存可序列化业务状态。
3. 使用 `ApplicationCoordinator` 连接 UI 和 Three.js。
4. Three.js 模块不得导入 Vue 组件、页面或路由。
5. 信息面板通过天体 ID 和 Repository 获取数据。

## 决策理由

- Vue 的响应式系统适合 UI 和业务状态，不适合持有存在循环引用和 GPU 资源的 Three.js 对象。
- Pinia 状态需要可调试、可序列化和可回放，`THREE.Object3D`、`OrbitControls`、`WebGLRenderer` 不满足这些条件。
- `ApplicationCoordinator` 可以把 UI 意图转换成类型化命令，让 Three.js 引擎保持独立。
- Three.js 模块独立后，场景生命周期、资源释放和测试更容易建立稳定边界。
- 信息面板只依赖天体 ID，可以在模型未加载、加载失败或场景切换时保持稳定展示。

## 允许的依赖方向

```text
Vue Components
-> Pinia Store
-> ApplicationCoordinator
-> SceneManager
-> Three.js Scene Modules
-> Resource and Data Layer
```

允许：

- Vue 组件读取 Store 状态。
- Vue 组件触发 Store action 或协调器命令。
- `ApplicationCoordinator` 调用 `SceneManager`。
- `SceneManager` 调用当前场景模块。
- Three.js 模块读取配置、Repository 和 ResourceManager。
- Three.js 模块通过类型化事件回调通知协调器。

## 禁止的依赖方向

禁止：

- Vue 组件创建 `THREE.Scene`、`THREE.Camera`、`THREE.WebGLRenderer` 或 `THREE.Object3D`。
- Pinia Store 保存 `THREE.*` 实例、Controls、Raycaster、Tween、DOM 节点或循环引用对象。
- Three.js 模块导入 Vue SFC、Pinia Store 实例、Vue Router 或 UI 组件。
- 信息面板保存 Mesh、Material、Texture 或 Object3D 引用。
- 场景模块直接修改 UI 状态。

## 数据通信方式

UI 到 Three.js：

```text
用户操作
-> Vue 事件
-> Store action 或 ApplicationCoordinator command
-> SceneManager
-> 当前 Scene / Controller
```

Three.js 到 UI：

```text
Pointer / 生命周期 / 错误事件
-> Three.js typed event
-> ApplicationCoordinator
-> Store action
-> Vue UI 更新
```

天体信息面板：

```text
selectedBodyId
-> PlanetRepository.getById(selectedBodyId)
-> UI 展示科普信息
```

## 备选方案

### 方案 A：Vue 组件直接创建和控制 Three.js

优点是初期代码少，适合一次性 demo。缺点是组件卸载、场景切换、资源释放和测试都会混在一起，后续维护成本高。

### 方案 B：Pinia 保存 Three.js 对象

优点是调用路径短。缺点是状态不可序列化，devtools 难以调试，运行时对象可能被响应式代理干扰，并且容易造成内存泄漏。

### 方案 C：Three.js 模块直接调用 Store

优点是事件同步直接。缺点是引擎层依赖应用层，复用和测试困难，场景模块会携带业务状态假设。

## 不采用备选方案的原因

本项目不是一次性演示，而是会逐步扩展太阳系、银河系、模型加载、后处理、交互和科普面板。直接耦合的方案在 Phase 1 之后会放大复杂度，因此不采用。

## 影响

- 后续需要新增 `ApplicationCoordinator` 作为 UI 和 Three.js 的命令边界。
- Store 设计必须保持可序列化。
- Three.js 层需要通过回调或事件总线输出领域事件。
- Vue Canvas 宿主组件只负责容器和生命周期入口。
- 代码审查必须检查是否存在反向依赖。

## 验证标准

- 搜索 Vue SFC 文件，不应出现 `new THREE.Scene()`、`new THREE.WebGLRenderer()` 等运行时创建逻辑。
- Store 类型中不应出现 `THREE.*`、`OrbitControls` 或 DOM 节点。
- Three.js 目录下不得导入 `.vue` 文件。
- 信息面板只接收天体 ID、展示数据和 UI 状态。
- 场景切换不要求 Vue 组件重建三维对象。
