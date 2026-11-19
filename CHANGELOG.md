# Changelog

All notable changes to `@agi-fans/dsh-better` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-11-19

### Changed

- Prompt and brief helpers share the completed parent history when the Harness uses SQLite fork storage.
- Helpers read the current directory from session context and block the legacy directory-changing tool.

## [0.1.2] - 2026-11-14

### Changed

- **Releases go through npm trusted publishing**: `publish.yml` now publishes over OIDC only — the long-lived `NPM_TOKEN` secret is gone, so there is nothing to rotate. No change to the plugin's behaviour.

## [0.1.1] - 2026-11-14

### Added

- **20-second explainer animation**: A one-shot motion piece (`docs/motion.mp4`, `designs/dsh-better-principle/`) that walks through the whole flow — draft, read-only fork, the four Depth stages, the grounded prompt landing back in the composer.

### Changed

- **Restore original now takes the timer's place in the tool row**: when a run completes, the `conversation.input.left` pill that showed `Stage · 0:31` turns into the **Restore original** control in place, instead of a button on the banner above the composer. The banner keeps the "deepened prompt is in your draft" message and its dismiss control; the restore target expires after two minutes or as soon as a new run starts, and restoring reports back through the banner.

## [0.1.0] - 2026-11-13

### Added

- **`/better` prompt deepening**: Forks a short-lived, read-only helper agent from the current session's completed-turn prefix (`turn/end`), inspects relevant repository files and conversation history via `tools.guard()`, and writes the deepened prompt directly into the composer draft (with headless/CLI fallback).
- **Web & Desktop composer Depth UI**: Non-blocking `conversation.input.dock` progress panel and `conversation.input.left` toolbar pill showing the 6-cell progress meter, four Depth stages (`Explore`, `Surface`, `Deepen`, `Sharpen`), live tool badges, elapsed timer, draft restore action, and `Esc` / `/better-cancel` cancellation.
- **Subagent `/better` brief verification**: Intercepts `ctx.subagents.startActivation` when a subagent brief begins with `/better`, verifies file paths, symbols, constraints, and test conventions against the repository using `prompts/brief.md`, and fails closed if cancelled or invalid.
- **Model & reasoning effort configuration**: Added `model`, `reasoningEffort`, `checkSubagents`, `briefModel`, and `briefReasoningEffort` settings configurable via **Settings → Prompt Deepener**, **Plugins → Prompt Deepener**, `/better-model`, and `cordis.patch.yml`, persisted atomically to `<profileDir>/dsh-better.settings.json`.
- **Full 8-language localization & live demo walkthrough**: Complete localization parity with DeepSeek Harness (`en`, `zh`, `ja`, `es`, `fr`, `de`, `ru`, `pt`) across client UI copy, `locale/*.json`, `docs/DETAIL*.md`, and live `locale/change` reactivity, plus an animated `/better` walkthrough (`docs/demo.gif`) in `README.md`, `README.zh.md`, and localized plugin detail pages.

### Performance

- **Fast default `low` reasoning effort**: Defaults `/better` and subagent `/better` helper runs to `low` reasoning effort (`null` / `default` / `auto`, clamping `high`/`max` session efforts down to `low` on supported models) while preserving KV prompt cache parity and providing an explicit `inherit` option in Settings and `/better-model effort inherit`.
- **KV prompt cache preservation**: Rely on `tools.guard()` + `sandbox/mode: 'read-only'` + `approval/policy: 'never'` without `tools.restrict({ deny })`, keeping `tools.schemas()` byte-identical to the parent session so DeepSeek's `addition-only` tool baseline never rebuilds.
- **PTC `run_code` support & metadata caching**: Added read-only `run_code` batching (with live `tool/ptc-dispatch-start` / `tool/ptc-dispatch` badge tracking), concurrent `workingDirectory.ensure` + `llm.resolveModelInfo` startup, a 5-minute `resolveModelInfo` TTL cache, tighter `0–2` tool-batch / zero-preamble instructions in `prompts/helper.md` and `prompts/brief.md`, and 160ms active UI polling.

[Unreleased]: https://github.com/agi-fans/dsh-better/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/agi-fans/dsh-better/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/agi-fans/dsh-better/releases/tag/v0.1.2
[0.1.1]: https://github.com/agi-fans/dsh-better/releases/tag/v0.1.1
[0.1.0]: https://github.com/agi-fans/dsh-better/releases/tag/v0.1.0
