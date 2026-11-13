![dsh-better /better 实时深化演示](demo.gif)

# 提示词深化助手 (`dsh-better`)

`dsh-better` 将 [`pi-better`](https://github.com/nicobailon/pi-better) 基于代码库与会话上下文的提示词深化能力（`/better`）以及 Subagent 任务简报校验引入 DeepSeek Harness。

1. 发送 `/better <草稿>` —— 输入框立即解锁，后台自动 Fork 只读助手检索代码库。
2. 实时观察 `探索 → 浮现 → 深化 → 打磨` —— Depth 面板展示工具徽章与流式生成进度，同时复用父会话 KV 缓存。
3. 回填审阅后发送 —— 深化后的提示词直接填入输入框，支持一键 **还原原稿**，按 `Enter` 才真正发出。

## 设置项说明（参考并扩展自 `pi-better`）

原版 `pi-better` 提供 `model` 与 `thinking` 两项设置。`dsh-better` 在完整兼容这两项能力的基础上，补充了子智能体与动态模型目录支持：

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| `model` | `null`（跟随当前对话） | `/better` 提示词深化使用的模型或路由组（`provider/model`）。默认跟随当前对话模型可复用父对话的前序 KV Prompt Cache；指定其他模型则会为深度分析或省钱放弃跨模型缓存复用。 |
| `reasoningEffort` | `null`（`low` · 默认快速） | 对应原版 `pi-better` 的 `thinking` 设置（`none`、`off`、`low`、`medium`、`high`、`max` 或 `inherit`）。默认使用快速 `low` 档位（自动将对话中的 `high`/`max` 降至 `low` 以大幅提速并复用 KV 缓存），运行时会与目标模型支持档位对齐。 |
| `checkSubagents` | `true` | 实时开关：当 Subagent 任务简报以 `/better` 开头时，是否在派发前先校验文件路径与符号。 |
| `briefModel` | `null`（与 `model` 一致） | 为 Subagent `/better` 简报校验单独指定模型（留空则复用上面的 `model`）。 |
| `briefReasoningEffort` | `null`（与 `reasoningEffort` 一致） | 为 Subagent `/better` 简报校验单独指定推理强度。 |

## 3 种配置方式

1. **全局设置面板**：左下角 **设置 → 提示词深化**，下拉选择模型与推理强度后自动保存并实时生效。
2. **插件详情页**：侧边栏 **插件 → 提示词深化助手 (`dsh-better`)** 页面内可直接配置并自动保存（`/better` 运行卡片右上角也可一键跳转到插件设置页）。
3. **斜杠命令 `/better-model`**：在任意对话或 CLI 中直接查看或修改：
   - `/better-model` — 查看当前设置与可用模型列表
   - `/better-model <provider/model> [effort]` — 设置深化模型及可选推理强度
   - `/better-model effort <level|inherit>` — 仅修改推理强度
   - `/better-model brief <same|inherit|<provider/model>> [effort]` — 设置 Subagent 简报校验模型
   - `/better-model subagents <on|off>` — 实时开启或关闭 Subagent `/better` 简报校验
   - `/better-model reset [all]` — 恢复跟随当前对话模型（加 `all` 重置全部 5 项）

UI 与 `/better-model` 保存的设置会原子写入当前 profile 目录下的 `dsh-better.settings.json`，立即生效并在重启后持久保留；默认初始值定义在 `cordis.patch.yml`。
