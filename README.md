# @agi-fans/dsh-better

English | [中文](https://github.com/agi-fans/dsh-better/blob/main/README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) plugin bundle combining [`pi-better`](https://github.com/nicobailon/pi-better)'s codebase-grounded prompt deepening (`/better`) and subagent brief verification with DSH's Cordis host/web-client architecture.

## Demo

![dsh-better /better live demo](docs/demo.gif)

1. **Draft with `/better`**: Send `/better 还有哪些功能可以优化？` (*"What else can be improved?"*). The composer unlocks immediately while a forked read-only helper starts in the background.
2. **Grounded repo inspection**: Above the input box, the Depth dock tracks `Explore → Surface → Deepen → Sharpen` with live read-only tool badges (`glob`, `grep`, `read`) and streaming synthesis — reusing the session's KV prompt cache without touching your chat history.
3. **Review before sending**: The deepened prompt — anchored to real files, symbols (`src/host/index.ts`, `src/client/locales.ts`, `tests/host-plugin.test.ts`), and acceptance criteria — lands directly in the composer with one-click **Restore original**. Nothing is sent until you press `Enter`.

## Features

- **`/better <draft prompt>`**: Forks a short-lived, read-only helper agent from the current session's completed-turn prefix (`turn/end`), inspects relevant repository files and conversation history without modifying files or running shell commands, and places the deepened prompt directly into the composer draft.
- **Prompt-cache preservation**: Uses `tools.guard()` inside the forked helper instead of altering `tools.schemas()`, keeping tool declarations byte-for-byte identical to the parent session.
- **Non-blocking Web / Desktop UI Depth dock**: Renders a two-row `conversation.input.dock` panel above the composer with a 6-cell progress meter, the four Depth stages (`Explore`, `Surface`, `Deepen`, `Sharpen`), live tool badges, elapsed timer, and `Esc` / `/better-cancel` cancellation.
- **Headless / CLI fallback**: When no UI `connection` service is attached, `/better` awaits completion and returns the deepened prompt as command output.
- **Subagent brief checking**: Automatically intercepts `ctx.subagents.startActivation` when a subagent's prompt starts with `/better`, verifies file paths, symbols, constraints, and test conventions against the repository using `prompts/brief.md`, and fails closed if cancelled or invalid.

## Install / Update

### Install in DeepSeek Harness Web UI or Desktop App

Open **Plugins → + Add plugin**, enter `@agi-fans/dsh-better` (or `https://github.com/agi-fans/dsh-better`), and click **Install**.

### Install with `dsh` CLI

Install `@agi-fans/dsh-better` from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) into the Web UI profile:

```bash
dsh plugin --profile web add @agi-fans/dsh-better
```

Or update `@agi-fans/dsh-better`:

```bash
dsh plugin --profile web update @agi-fans/dsh-better@latest
```

For the Desktop App profile or default/CLI profile:

```bash
# Desktop App profile
dsh plugin --profile desktop add @agi-fans/dsh-better
dsh plugin --profile desktop update @agi-fans/dsh-better@latest

# Default / CLI profile
dsh plugin add @agi-fans/dsh-better
```

Then start Web UI with `dsh web` (or open DeepSeek Harness Desktop). Pre-built Host and Client bundles are included (`dist/index.js` and `dist/client.js`) — no build step or restart is required when HMR is active.

## Configuration

Configure `@agi-fans/dsh-better` via **Settings → Prompt Deepener**, **Plugins → Prompt Deepener**, the `/better-model` slash command, or `cordis.patch.yml` defaults:

```yaml
- id: dsh-better
  name: '@agi-fans/dsh-better'
  config:
    # Inherit the active session's model when null (reuses KV prompt cache), or pin e.g. "deepseek-official/deepseek-reasoner"
    model: null
    # Equivalent to pi-better's `thinking`: defaults to fast `"low"` reasoning (preserving KV cache) when null, or set `"inherit"` / `"off"` / `"low"` / `"medium"` / `"high"` / `"max"`
    reasoningEffort: null
    # Optional override specifically for /better subagent brief checking (falls back to `model`)
    briefModel: null
    # Optional reasoning effort override for /better subagent brief checking (falls back to `reasoningEffort`)
    briefReasoningEffort: null
    # Set false to disable automatic /better brief checking on subagent activations
    checkSubagents: true
```

UI and `/better-model` changes are stored atomically in `<profileDir>/dsh-better.settings.json` and take effect immediately.

## Development

```bash
npm run build
npm run typecheck
npm test
```

## Credits

- Prompt methodology and Depth UX inspired by [`nicobailon/pi-better`](https://github.com/nicobailon/pi-better).
- Built for [`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness).
