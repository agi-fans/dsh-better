# @agi-fans/dsh-better

English | [中文](https://github.com/agi-fans/dsh-better/blob/main/README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) plugin bundle combining [`pi-better`](https://github.com/nicobailon/pi-better)'s codebase-grounded prompt deepening (`/better`) and subagent brief verification with DSH's Cordis host/web-client architecture.

## Demo

[<!-- GitHub plays a video inline only when it is uploaded as an attachment. Drop `docs/motion.mp4`
     into this README in GitHub's editor and put the generated https://github.com/user-attachments/...
     URL on the line below, the way pi-better's README does. -->
https://github.com/agi-fans/dsh-better/blob/main/docs/motion.mp4](https://github.com/user-attachments/assets/b75f9b42-cff9-4661-be83-5f57c1d881a7
)

A 20-second one-shot explainer (Chinese UI, sound on). The draft lifts out of the composer and becomes the first finished turn; a hairline forks into a read-only helper that reuses the cached prompt prefix; that same panel widens into the Depth dock while the four stages run; then it folds back into the composer as the grounded prompt — real files, acceptance criteria, one-click **Restore original**.

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
