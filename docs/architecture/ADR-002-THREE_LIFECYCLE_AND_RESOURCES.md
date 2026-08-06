# ADR-002: Three.js 生命周期与资源所有权

## 状态

已采用。

## 背景

Three.js 应用中的 `Geometry`、`Material`、`Texture`、RenderTarget、Controls、Tween、事件监听和 RAF 引用都可能在场景切换后继续占用内存或 GPU 资源。银河系科普探索站需要在太阳系和银河系场景之间切换，还需要加载 GLB 模型、粒子系统、Bloom 和 Shader。若没有统一生命周期和资源所有权，项目会出现多 RAF 循环、重复释放、持续内存增长和 WebGL context 不稳定。

## 决策

1. 全应用只有一个主动画循环。
2. `SceneManager` 管理当前场景。
3. 场景负责释放自身创建的资源。
4. 共享资源由 `ResourceManager` 管理引用和释放。
5. 所有事件、Tween、Controls 和 Observer 必须显式清理。
6. 多次场景切换后内存不得持续增长。

## 标准生命周期

长期运行模块必须按需实现：

```text
init
-> start
-> update
-> pause
-> resume
-> resize
-> destroy
```

要求：

- `init` 只做必要初始化，可以异步加载资源。
- `start` 进入运行状态，不创建第二个 RAF。
- `update(deltaTime)` 只处理当前帧逻辑。
- `pause` 停止交互或降低更新频率。
- `resume` 恢复运行。
- `resize` 处理尺寸变化。
- `destroy` 释放资源，必须可重复调用。

## 主动画循环所有权

`AnimationManager` 持有唯一 RAF 引用。场景模块不得自行启动无限 RAF。持续动画必须基于 `deltaTime`，并设置上限，避免标签页恢复时出现跳帧：

```ts
const deltaTime = Math.min(clock.getDelta(), 0.05);
```

公转、自转、Shader 时间和粒子动画都应当由该时间源驱动。

## Renderer 所有权

`RendererManager` 创建并持有 `THREE.WebGLRenderer`。它负责：

- renderer 初始化。
- pixel ratio 上限。
- canvas size。
- resize。
- WebGL context lost 和 restored 事件。
- renderer 释放。

场景模块禁止创建第二个主 renderer。

## Scene 所有权

`SceneManager` 持有当前 `BaseScene`。切换场景时必须按顺序执行：

1. 暂停当前场景。
2. 注销当前场景交互目标。
3. 销毁当前场景私有资源。
4. 请求 `ResourceManager` 释放不再使用的共享资源引用。
5. 初始化新场景。
6. 启动新场景。
7. 同步 Store 场景状态。

## 模型缓存所有权

`ModelLoader` 负责加载 GLB。`ResourceManager` 负责缓存策略。共享模型原始资源不得由场景直接释放。若场景需要独立修改材质、动画或层级，应当创建 clone，并由场景释放 clone 自身新增的资源。

## Geometry、Material 和 Texture 所有权

- 创建者默认是所有者。
- 场景私有 Geometry、Material、Texture 由场景释放。
- 共享 Geometry、Material、Texture 由 `ResourceManager` 释放。
- Material 数组必须逐项释放。
- 纹理如果被多个材质共享，只能由所有权方释放一次。
- 从缓存读取的资源必须通过引用计数、资源句柄或明确文档说明释放责任。

## 共享资源处理方式

共享资源必须登记：

- resource key。
- 资源类型。
- 创建者。
- 持有者。
- 引用计数或缓存策略。
- 是否可被场景释放。

消费者释放时只能释放自己的引用，不能直接调用共享资源的 `dispose()`。

## Scene 切换销毁流程

```text
SceneManager.switchScene(next)
-> current.pause()
-> InteractionManager.clearTargets()
-> current.destroy()
-> ResourceManager.releaseSceneResources(currentKey)
-> next.init()
-> next.start()
-> Store.currentScene = next
```

切换失败时，应保持旧场景可用，或进入明确的错误状态。禁止白屏且无提示。

## 页面卸载销毁流程

```text
ApplicationCoordinator.destroy()
-> AnimationManager.destroy()
-> SceneManager.destroy()
-> ResourceManager.destroy()
-> RendererManager.destroy()
-> remove DOM / visibility / resize listeners
```

页面卸载必须取消 RAF、Controls、Tween、AnimationMixer、Observer、Pointer 事件、Resize 事件和自定义回调。

## 风险

- 重复释放共享纹理可能导致其他对象渲染异常。
- 未取消 RAF 会导致卸载后持续更新。
- Controls 未释放会保留 DOM 事件。
- Tween 或 AnimationMixer 未清理会继续引用 Object3D。
- Galaxy 场景如果使用大量独立 Mesh，会造成 Draw Call 和内存失控。
- WebGL context lost 未处理会导致不可恢复白屏。

## 验证标准

- 全局只能找到一个主 RAF 拥有者。
- 场景模块没有独立无限 RAF。
- `destroy` 可重复调用且不抛出二次释放错误。
- 场景切换多次后 renderer.info 和浏览器内存不持续增长。
- 共享资源释放由 `ResourceManager` 统一处理。
- Controls、Tween、Mixer、Observer 和事件监听都有对应清理逻辑。
- 页面隐藏时更新频率降低或暂停。
- WebGL context lost 有明确状态和用户提示。
