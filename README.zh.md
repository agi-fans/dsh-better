# @agi-fans/dsh-better

[English](https://github.com/agi-fans/dsh-better/blob/main/README.md) | 中文

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) 的提示词深化插件组合包：将 [`pi-better`](https://github.com/nicobailon/pi-better) 基于代码库与会话上下文的提示词深化能力（`/better`）以及 Subagent 任务简报校验引入 DeepSeek Harness 的 Cordis Host / Web-Client 架构。

## 效果演示

<!-- GitHub 只有在把视频作为附件上传时才内嵌播放。把 `docs/motion.mp4` 拖进 GitHub 的 README 编辑器，
     它会生成 https://github.com/user-attachments/... 链接，替换下面这行即可（和 pi-better 的 README 一样）。 -->
https://github.com/agi-fans/dsh-better/blob/main/docs/motion.mp4

20 秒一镜到底，带配乐，中文界面。草稿从输入框里抽出去变成第一块已完成轮次；细线分叉出只读助手，复用同一份 KV 缓存；同一块面板展开成 Depth 面板跑完四阶段；最后收成胶囊，把带真实文件与验收条件的提示词回填进输入框，可一键 **还原原稿**。

## 功能特性

- **`/better <草稿提示词>`**：从当前会话已完成轮次（`turn/end`）Fork 出短生命周期的只读分析助手，在不修改文件或执行 Shell 命令的前提下读取相关仓库文件与上下文，并将深化后的提示词直接回填到输入框草稿中。
- **保留 Prompt Cache**：在 Fork 出的助手内部通过 `tools.guard()` 拦截写操作而非篡改 `tools.schemas()`，保持工具声明与父会话逐字节一致以复用前序 KV 缓存。
- **非阻塞 Web / 桌面端进度面板**：在输入框上方渲染双行 `conversation.input.dock` 面板（6 格进度条、`探索 / 浮现 / 深化 / 打磨` 四阶段指示、实时工具徽章、耗时计时器，以及 `Esc` / `/better-cancel` 取消支持）。
- **无头 / CLI 回退**：未挂载 UI `connection` 服务时，`/better` 会等待分析完成并将深化后的提示词作为命令输出返回。
- **Subagent 简报校验**：自动拦截以 `/better` 开头的 `ctx.subagents.startActivation` 任务简报，基于 `prompts/brief.md` 核实文件路径、符号名、约束与测试规范后再放行；取消或校验失败时 fail-closed 中止。

## 安装 / 更新

### 在 DeepSeek Harness 网页版或桌面版中安装

在 **插件 → + 添加插件（Add plugin）** 的输入框中填写 `@agi-fans/dsh-better`（或 `https://github.com/agi-fans/dsh-better`），然后点击 **Install**：

> 国内用户可在弹窗右下角将 Registry 切换为 **Mainland China mirror**。

### 使用 `dsh` CLI 安装

从 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 安装 `@agi-fans/dsh-better` 插件（Web UI profile）：

```bash
dsh plugin --profile web add @agi-fans/dsh-better
```

或更新 `@agi-fans/dsh-better` 插件：

```bash
dsh plugin --profile web update @agi-fans/dsh-better@latest
```

如果使用桌面端或默认 CLI profile：

```bash
# 桌面端 App profile
dsh plugin --profile desktop add @agi-fans/dsh-better
dsh plugin --profile desktop update @agi-fans/dsh-better@latest

# 默认 / CLI profile
dsh plugin add @agi-fans/dsh-better
```

然后使用 `dsh web` 启动 Web UI（或直接打开桌面客户端）。仓库与 npm 包已自带预构建产物（`dist/index.js` 与 `dist/client.js`），在启用 HMR 时无需构建、也无需重启。

## 配置

可通过 **设置 → 提示词深化**、**插件 → 提示词深化助手**、`/better-model` 斜杠命令或 `cordis.patch.yml` 默认配置来调整选项：

```yaml
- id: dsh-better
  name: '@agi-fans/dsh-better'
  config:
    # 为 null 时跟随当前对话模型（复用 KV Prompt Cache），也可指定如 "deepseek-official/deepseek-reasoner"
    model: null
    # 对应 pi-better 的 thinking 设置：为 null 时默认采用快速 "low" 推理（仍复用 KV 缓存），也可设为 "inherit" | "off" | "low" | "medium" | "high" | "max"
    reasoningEffort: null
    # 单独指定 Subagent /better 简报校验模型（留空时回退到上面的 model）
    briefModel: null
    # 单独指定 Subagent /better 简报校验推理强度（留空时回退到 reasoningEffort）
    briefReasoningEffort: null
    # 设为 false 可关闭 Subagent /better 简报自动校验
    checkSubagents: true
```

通过 UI 或 `/better-model` 修改的设置会原子写入 `<profileDir>/dsh-better.settings.json`，立即生效且重启保留。

## 本地开发

```bash
npm run build
npm run typecheck
npm test
```

## 致谢

- 提示词方法论与 Depth 交互灵感源自 [`nicobailon/pi-better`](https://github.com/nicobailon/pi-better)。
- 面向 [`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness) 构建。
