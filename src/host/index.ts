import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { isInheritSentinel, matchBriefMark } from '../core/better.ts'
import type {
  BetterModelOption,
  BetterPluginConfig,
  BetterProviderFailure,
  BetterRunSnapshot,
  BetterSettingsPayload,
} from '../shared/types.ts'
import {
  runForkedHelper,
  type DshAgentLike,
  type DshAgentsService,
  type DshLlmServiceLike,
  type HelperProgressUpdate,
} from './helper-runner.ts'

export const name = 'dsh-better'
export const inject = ['commands', 'agents'] as const

type BetterRpcAction = 'status' | 'cancel' | 'ack' | 'settings-get' | 'settings-set'

interface MutableRunRecord {
  snapshot: BetterRunSnapshot
  controller: AbortController
}

function loadPromptFile(filename: string): string {
  const candidates = [
    new URL(`../../prompts/${filename}`, import.meta.url),
    new URL(`../prompts/${filename}`, import.meta.url),
  ]
  for (const url of candidates) {
    if (existsSync(url)) {
      return readFileSync(url, 'utf8')
    }
  }
  throw new Error(`dsh-better: missing prompt asset "${filename}"`)
}

function normalizeNullableModelSetting(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || isInheritSentinel(trimmed)) return null
  return trimmed
}

function normalizeNullableEffortSetting(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const lower = trimmed.toLowerCase()
  if (lower === 'default' || lower === 'auto') return null
  if (lower === 'inherit') return 'inherit'
  return trimmed
}

function normalizeConfig(raw: unknown): Required<BetterPluginConfig> {
  const rec = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    model: normalizeNullableModelSetting(rec['model']),
    reasoningEffort: normalizeNullableEffortSetting(rec['reasoningEffort']),
    briefModel: normalizeNullableModelSetting(rec['briefModel']),
    briefReasoningEffort: normalizeNullableEffortSetting(rec['briefReasoningEffort']),
    checkSubagents: rec['checkSubagents'] !== false,
  }
}

function resolveSettingsPath(ctx: any): string | undefined {
  const profileDir = ctx?.get?.('profileContext')?.dir
  if (typeof profileDir === 'string' && profileDir.trim().length > 0) {
    return path.join(profileDir, 'dsh-better.settings.json')
  }
  return undefined
}

function readPersistedConfig(settingsPath: string | undefined): Partial<BetterPluginConfig> {
  if (!settingsPath || !existsSync(settingsPath)) return {}
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8')) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const rec = parsed as Record<string, unknown>
    return {
      ...(Object.hasOwn(rec, 'model') ? { model: normalizeNullableModelSetting(rec['model']) } : {}),
      ...(Object.hasOwn(rec, 'reasoningEffort') ? { reasoningEffort: normalizeNullableEffortSetting(rec['reasoningEffort']) } : {}),
      ...(Object.hasOwn(rec, 'briefModel') ? { briefModel: normalizeNullableModelSetting(rec['briefModel']) } : {}),
      ...(Object.hasOwn(rec, 'briefReasoningEffort') ? { briefReasoningEffort: normalizeNullableEffortSetting(rec['briefReasoningEffort']) } : {}),
      ...(typeof rec['checkSubagents'] === 'boolean' ? { checkSubagents: rec['checkSubagents'] } : {}),
    }
  } catch {
    return {}
  }
}

function writePersistedConfig(settingsPath: string, config: Required<BetterPluginConfig>): void {
  const dir = path.dirname(settingsPath)
  mkdirSync(dir, { recursive: true })
  const tmpPath = path.join(dir, `.dsh-better.settings.${process.pid}.${randomUUID()}.tmp`)
  writeFileSync(tmpPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  renameSync(tmpPath, settingsPath)
}

async function readModelCatalog(ctx: any): Promise<{
  readonly models: readonly BetterModelOption[]
  readonly providerFailures: readonly BetterProviderFailure[]
}> {
  const llm = ctx?.get?.('llm') as DshLlmServiceLike | undefined
  if (!llm || typeof llm.listProviders !== 'function' || typeof llm.listModels !== 'function') {
    return { models: [], providerFailures: [] }
  }

  let providers: readonly { readonly id: string; readonly name: string }[]
  try {
    providers = llm.listProviders()
  } catch (error: unknown) {
    return {
      models: [],
      providerFailures: [{
        id: 'llm',
        name: 'LLM Registry',
        message: error instanceof Error ? error.message : String(error),
      }],
    }
  }

  const results = await Promise.all(providers.map(async (provider) => {
    try {
      const models = await llm.listModels!(provider.id)
      const entries = await Promise.all(models.map(async (model): Promise<BetterModelOption> => {
        let resolved: Awaited<ReturnType<NonNullable<DshLlmServiceLike['resolveModelInfo']>>> | undefined
        if (typeof llm.resolveModelInfo === 'function') {
          try {
            resolved = await llm.resolveModelInfo(provider.id, model.id)
          } catch {
            resolved = undefined
          }
        }
        const reasoningEfforts = resolved?.reasoning?.efforts.map(e => ({
          id: e.id,
          name: e.name,
          ...(e.description !== undefined ? { description: e.description } : {}),
        })) ?? []
        const defaultReasoningEffort = resolved?.reasoning?.defaultEffort
        return {
          provider: provider.id,
          providerName: provider.name,
          model: model.id,
          modelName: model.name,
          value: `${provider.id}/${model.id}`,
          ...(model.description !== undefined ? { description: model.description } : {}),
          ...(model.badge !== undefined ? { badge: model.badge } : {}),
          reasoningEfforts,
          ...(defaultReasoningEffort !== undefined ? { defaultReasoningEffort } : {}),
        }
      }))
      return { kind: 'ok' as const, entries }
    } catch (error: unknown) {
      return {
        kind: 'err' as const,
        failure: {
          id: provider.id,
          name: provider.name,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }))

  return {
    models: results.flatMap(r => (r.kind === 'ok' ? r.entries : [])),
    providerFailures: results.flatMap(r => (r.kind === 'err' ? [r.failure] : [])),
  }
}

function formatEffortLabel(effort: string | null, fallbackLabel: string): string {
  if (effort === 'inherit') return 'inherit (follow current session)'
  return effort ?? fallbackLabel
}

function formatSettingsSummary(
  config: Required<BetterPluginConfig>,
  models: readonly BetterModelOption[],
): string {
  const lines = [
    'dsh-better settings:',
    `  model: ${config.model ?? 'inherit (follow current session · reuses KV cache)'}`,
    `  reasoningEffort: ${formatEffortLabel(config.reasoningEffort, 'low (default · fast)')}`,
    `  checkSubagents: ${config.checkSubagents ? 'enabled' : 'disabled'}`,
    `  briefModel: ${config.briefModel ?? (config.model ? `same as model (${config.model})` : 'inherit')}`,
    `  briefReasoningEffort: ${formatEffortLabel(
      config.briefReasoningEffort,
      config.reasoningEffort
        ? `same as reasoningEffort (${config.reasoningEffort})`
        : 'low (default · fast)',
    )}`,
  ]
  if (models.length > 0) {
    lines.push('', 'Available models:')
    for (const m of models.slice(0, 16)) {
      const efforts = m.reasoningEfforts.length > 0
        ? ` [efforts: ${m.reasoningEfforts.map(e => e.id).join(', ')}]`
        : ''
      lines.push(`  - ${m.value} (${m.modelName})${efforts}`)
    }
    if (models.length > 16) {
      lines.push(`  ... and ${models.length - 16} more (open Settings -> Prompt Deepener to browse all)`)
    }
  }
  lines.push(
    '',
    'Usage:',
    '  /better-model <provider/model> [effort]',
    '  /better-model effort <off|none|low|medium|high|max|default|inherit>',
    '  /better-model brief <same|inherit|<provider/model>> [effort]',
    '  /better-model subagents <on|off>',
    '  /better-model reset [all]',
  )
  return lines.join('\n')
}

function rpcOk<T>(value: T) {
  return { ok: true as const, value }
}

function rpcError(code: string, message: string) {
  return { ok: false as const, error: { code, message, details: {} } }
}

function snapshotWithLiveElapsed(snapshot: BetterRunSnapshot, now = Date.now()): BetterRunSnapshot {
  if (snapshot.status !== 'running') return snapshot
  return {
    ...snapshot,
    elapsedMs: Math.max(0, now - snapshot.startedAt),
  }
}

export function apply(ctx: any, rawConfig?: BetterPluginConfig): void {
  const baselineConfig = normalizeConfig(rawConfig)
  const settingsPath = resolveSettingsPath(ctx)
  let currentConfig: Required<BetterPluginConfig> = normalizeConfig({
    ...baselineConfig,
    ...readPersistedConfig(settingsPath),
  })
  const helperInstructions = loadPromptFile('helper.md')
  const briefInstructions = loadPromptFile('brief.md')

  const runsBySession = new Map<string, MutableRunRecord>()
  let rpcMounted = false

  const getActiveRecord = (sessionId: string): MutableRunRecord | undefined => {
    const rec = runsBySession.get(sessionId)
    return rec?.snapshot.status === 'running' ? rec : undefined
  }

  const saveConfig = (patch: Partial<BetterPluginConfig>): Required<BetterPluginConfig> => {
    const next = normalizeConfig({
      model: Object.hasOwn(patch, 'model') ? patch.model : currentConfig.model,
      reasoningEffort: Object.hasOwn(patch, 'reasoningEffort') ? patch.reasoningEffort : currentConfig.reasoningEffort,
      briefModel: Object.hasOwn(patch, 'briefModel') ? patch.briefModel : currentConfig.briefModel,
      briefReasoningEffort: Object.hasOwn(patch, 'briefReasoningEffort')
        ? patch.briefReasoningEffort
        : currentConfig.briefReasoningEffort,
      checkSubagents: typeof patch.checkSubagents === 'boolean' ? patch.checkSubagents : currentConfig.checkSubagents,
    })
    currentConfig = next
    if (settingsPath !== undefined) {
      writePersistedConfig(settingsPath, next)
    }
    return next
  }

  const resetConfig = (): Required<BetterPluginConfig> => {
    currentConfig = { ...baselineConfig }
    if (settingsPath !== undefined && existsSync(settingsPath)) {
      rmSync(settingsPath, { force: true })
    }
    return currentConfig
  }

  const buildSettingsPayload = async (): Promise<BetterSettingsPayload> => {
    const catalog = await readModelCatalog(ctx)
    return {
      config: { ...currentConfig },
      models: catalog.models,
      providerFailures: catalog.providerFailures,
      ...(settingsPath !== undefined ? { persistedPath: settingsPath } : {}),
      writable: true,
    }
  }

  const startPromptRun = (
    agent: DshAgentLike,
    draft: string,
    parentSignal?: AbortSignal,
  ): { readonly record: MutableRunRecord; readonly promise: Promise<BetterRunSnapshot> } => {
    const sessionId = agent.session.id
    const now = Date.now()
    const controller = new AbortController()
    if (parentSignal) {
      if (parentSignal.aborted) {
        controller.abort(parentSignal.reason)
      } else {
        const forwardAbort = (): void => { controller.abort(parentSignal.reason) }
        parentSignal.addEventListener('abort', forwardAbort, { once: true })
      }
    }

    const initial: BetterRunSnapshot = {
      runId: randomUUID(),
      sessionId,
      sourceDraft: draft,
      status: 'running',
      stage: 'explore',
      startedAt: now,
      updatedAt: now,
      elapsedMs: 0,
      turn: 0,
      tools: [],
      activeTools: 0,
      doneTools: 0,
      streamingChars: 0,
    }
    const record: MutableRunRecord = { snapshot: initial, controller }
    runsBySession.set(sessionId, record)

    const agents = ctx.agents as DshAgentsService
    const promise = runForkedHelper({
      agents,
      workingDirectory: ctx.get?.('workingDirectory'),
      llm: ctx.get?.('llm') as DshLlmServiceLike | undefined,
      parentAgent: agent,
      mode: 'prompt',
      instructions: helperInstructions,
      inputText: draft,
      modelSpec: currentConfig.model,
      reasoningEffort: currentConfig.reasoningEffort,
      signal: controller.signal,
      onRouteResolved: (modelLabel: string) => {
        if (runsBySession.get(sessionId) !== record || record.snapshot.status !== 'running') return
        record.snapshot = { ...record.snapshot, modelLabel }
      },
      onProgress: (progress: HelperProgressUpdate) => {
        if (runsBySession.get(sessionId) !== record || record.snapshot.status !== 'running') return
        const tick = Date.now()
        record.snapshot = {
          ...record.snapshot,
          stage: progress.stage,
          tools: progress.tools,
          activeTools: progress.activeTools,
          doneTools: progress.doneTools,
          streamingChars: progress.streamingChars,
          ...(progress.streamingPreview.length > 0 ? { streamingPreview: progress.streamingPreview } : {}),
          updatedAt: tick,
          elapsedMs: Math.max(0, tick - record.snapshot.startedAt),
        }
      },
    }).then((outcome) => {
      const doneAt = Date.now()
      const elapsedMs = Math.max(0, doneAt - record.snapshot.startedAt)
      if (outcome.status === 'completed') {
        record.snapshot = {
          ...record.snapshot,
          status: 'completed',
          stage: 'sharpen',
          updatedAt: doneAt,
          elapsedMs,
          improvedPrompt: outcome.output,
        }
      } else if (outcome.status === 'cancelled') {
        record.snapshot = {
          ...record.snapshot,
          status: 'cancelled',
          updatedAt: doneAt,
          elapsedMs,
        }
      } else {
        record.snapshot = {
          ...record.snapshot,
          status: 'failed',
          updatedAt: doneAt,
          elapsedMs,
          error: outcome.error,
          ...(outcome.fallbackPath !== undefined ? { fallbackPath: outcome.fallbackPath } : {}),
        }
      }
      return record.snapshot
    })

    return { record, promise }
  }

  ctx.effect(() => () => {
    rpcMounted = false
    for (const rec of runsBySession.values()) {
      if (rec.snapshot.status === 'running') {
        rec.controller.abort()
      }
    }
    runsBySession.clear()
  }, 'dsh-better:abort-active-runs')

  ctx.effect(() => ctx.commands.register({
    definitionId: 'dsh-better:better',
    name: 'better',
    description: 'Deepen a prompt draft against the repository and current session before sending',
    input: { hint: '<draft prompt>', attachments: false },
    recordInput: false,
    handler: async (invocation: {
      readonly agent: DshAgentLike
      readonly rawInput: string
      readonly signal?: AbortSignal
    }) => {
      const draft = invocation.rawInput.trim()
      if (draft.length === 0) {
        return { kind: 'error', text: 'Usage: /better <draft prompt>' }
      }

      const sessionId = invocation.agent.session.id
      if (getActiveRecord(sessionId) !== undefined) {
        return {
          kind: 'error',
          text: 'A /better run is already active in this session. Press Esc or run /better-cancel first.',
        }
      }

      if (rpcMounted) {
        // Interactive UI mode: launch in the background so the composer immediately
        // unlocks and the dock polls progress until injecting the improved prompt.
        void startPromptRun(invocation.agent, draft).promise.catch(() => undefined)
        return { kind: 'success', text: 'Deepening prompt in background…' }
      }

      // Headless / CLI mode: await the forked helper and return the deepened prompt.
      const { promise } = startPromptRun(invocation.agent, draft, invocation.signal)
      const finalSnapshot = await promise
      if (finalSnapshot.status === 'completed' && finalSnapshot.improvedPrompt !== undefined) {
        return { kind: 'success', text: finalSnapshot.improvedPrompt }
      }
      if (finalSnapshot.status === 'cancelled') {
        return { kind: 'error', text: '/better cancelled.' }
      }
      const fallbackNote = finalSnapshot.fallbackPath ? ` Raw reply saved to: ${finalSnapshot.fallbackPath}` : ''
      return {
        kind: 'error',
        text: `${finalSnapshot.error ?? 'Failed to deepen prompt.'}${fallbackNote}`,
      }
    },
  }), 'dsh-better:command-better')

  ctx.effect(() => ctx.commands.register({
    definitionId: 'dsh-better:cancel',
    name: 'better-cancel',
    description: 'Cancel the active /better prompt-deepening run in this session',
    recordInput: false,
    handler: (invocation: { readonly agent: DshAgentLike }) => {
      const active = getActiveRecord(invocation.agent.session.id)
      if (active === undefined) {
        return { kind: 'success', text: 'No active /better run in this session.' }
      }
      active.controller.abort()
      return { kind: 'success', text: 'Cancelled /better prompt deepening.' }
    },
  }), 'dsh-better:command-cancel')

  ctx.effect(() => ctx.commands.register({
    definitionId: 'dsh-better:model',
    name: 'better-model',
    description: 'View or configure the model, reasoning effort, and subagent brief settings for /better',
    input: { hint: '[inherit | <provider/model> [effort] | effort <level> | brief <model> | subagents <on|off> | reset]', attachments: false },
    recordInput: false,
    handler: async (invocation: { readonly rawInput?: string }) => {
      const raw = (invocation.rawInput ?? '').trim()
      if (raw.length === 0) {
        const catalog = await readModelCatalog(ctx)
        return { kind: 'success', text: formatSettingsSummary(currentConfig, catalog.models) }
      }

      const tokens = raw.split(/\s+/).filter(Boolean)
      const head = tokens[0]!.toLowerCase()

      if (head === 'reset' && tokens[1]?.toLowerCase() === 'all') {
        const next = resetConfig()
        return {
          kind: 'success',
          text: `Reset all dsh-better settings to defaults (model=${next.model ?? 'inherit'}, reasoningEffort=${next.reasoningEffort ?? 'low (default · fast)'}, checkSubagents=${next.checkSubagents}).`,
        }
      }

      if (head === 'reset' || isInheritSentinel(head)) {
        saveConfig({ model: null, reasoningEffort: null })
        return {
          kind: 'success',
          text: 'Updated /better to inherit current session model with fast low reasoning effort (KV prompt cache enabled).',
        }
      }

      if (head === 'effort' || head === 'thinking') {
        const effortArg = tokens[1]
        if (!effortArg) {
          return { kind: 'error', text: 'Usage: /better-model effort <off|none|low|medium|high|max|default|inherit>' }
        }
        const next = saveConfig({ reasoningEffort: normalizeNullableEffortSetting(effortArg) })
        return {
          kind: 'success',
          text: `Updated /better reasoningEffort to ${formatEffortLabel(next.reasoningEffort, 'low (default · fast)')}.`,
        }
      }

      if (head === 'subagents' || head === 'check-subagents') {
        const flag = tokens[1]?.toLowerCase()
        if (flag === 'on' || flag === 'true' || flag === 'enable' || flag === 'enabled') {
          saveConfig({ checkSubagents: true })
          return { kind: 'success', text: 'Enabled subagent /better brief checking.' }
        }
        if (flag === 'off' || flag === 'false' || flag === 'disable' || flag === 'disabled') {
          saveConfig({ checkSubagents: false })
          return { kind: 'success', text: 'Disabled subagent /better brief checking.' }
        }
        return { kind: 'error', text: 'Usage: /better-model subagents <on|off>' }
      }

      if (head === 'brief') {
        const briefArg = tokens[1]
        if (!briefArg) {
          return { kind: 'error', text: 'Usage: /better-model brief <same|inherit|<provider/model>> [effort]' }
        }
        const briefLower = briefArg.toLowerCase()
        const nextBriefModel = briefLower === 'same' ? null : normalizeNullableModelSetting(briefArg)
        const effortArg = tokens[2]
        const patch: Partial<BetterPluginConfig> = {
          briefModel: nextBriefModel,
          ...(effortArg !== undefined ? { briefReasoningEffort: normalizeNullableEffortSetting(effortArg) } : {}),
          ...(briefLower === 'same' && effortArg === undefined ? { briefReasoningEffort: null } : {}),
        }
        const next = saveConfig(patch)
        return {
          kind: 'success',
          text: `Updated subagent /better brief model to ${next.briefModel ?? 'same as /better model'}${next.briefReasoningEffort ? ` (effort=${next.briefReasoningEffort})` : ''}.`,
        }
      }

      const nextModel = normalizeNullableModelSetting(tokens[0])
      const effortArg = tokens[1]
      const next = saveConfig({
        model: nextModel,
        ...(effortArg !== undefined ? { reasoningEffort: normalizeNullableEffortSetting(effortArg) } : {}),
      })
      return {
        kind: 'success',
        text: `Updated /better model to ${next.model ?? 'inherit'}${next.reasoningEffort ? ` · ${next.reasoningEffort}` : ''}.`,
      }
    },
  }), 'dsh-better:command-model')

  const dispatchBetterRpc = async (action: BetterRpcAction, payload: unknown) => {
    const body = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>

    if (action === 'settings-get') {
      return rpcOk(await buildSettingsPayload())
    }

    if (action === 'settings-set') {
      if (body['reset'] === true) {
        resetConfig()
        return rpcOk(await buildSettingsPayload())
      }
      const rawPatch = body['config']
      if (typeof rawPatch !== 'object' || rawPatch === null || Array.isArray(rawPatch)) {
        return rpcError('INVALID_REQUEST', 'config object is required')
      }
      const patchObj = rawPatch as Record<string, unknown>
      const patch: Partial<BetterPluginConfig> = {
        ...(Object.hasOwn(patchObj, 'model') ? { model: normalizeNullableModelSetting(patchObj['model']) } : {}),
        ...(Object.hasOwn(patchObj, 'reasoningEffort')
          ? { reasoningEffort: normalizeNullableEffortSetting(patchObj['reasoningEffort']) }
          : {}),
        ...(Object.hasOwn(patchObj, 'briefModel') ? { briefModel: normalizeNullableModelSetting(patchObj['briefModel']) } : {}),
        ...(Object.hasOwn(patchObj, 'briefReasoningEffort')
          ? { briefReasoningEffort: normalizeNullableEffortSetting(patchObj['briefReasoningEffort']) }
          : {}),
        ...(typeof patchObj['checkSubagents'] === 'boolean' ? { checkSubagents: patchObj['checkSubagents'] } : {}),
      }
      saveConfig(patch)
      return rpcOk(await buildSettingsPayload())
    }

    const sessionId = typeof body['sessionId'] === 'string' ? body['sessionId'] : ''
    if (sessionId.length === 0) {
      return rpcError('INVALID_REQUEST', 'sessionId is required')
    }

    if (action === 'status') {
      const rec = runsBySession.get(sessionId)
      return rpcOk(rec === undefined ? null : snapshotWithLiveElapsed(rec.snapshot))
    }

    if (action === 'cancel') {
      const active = getActiveRecord(sessionId)
      if (active === undefined) return rpcOk({ cancelled: false })
      const runId = typeof body['runId'] === 'string' ? body['runId'] : undefined
      if (runId !== undefined && active.snapshot.runId !== runId) {
        return rpcOk({ cancelled: false })
      }
      active.controller.abort()
      return rpcOk({ cancelled: true })
    }

    if (action === 'ack') {
      const rec = runsBySession.get(sessionId)
      const runId = typeof body['runId'] === 'string' ? body['runId'] : undefined
      if (rec !== undefined && rec.snapshot.status !== 'running' && (runId === undefined || rec.snapshot.runId === runId)) {
        runsBySession.delete(sessionId)
        return rpcOk({ cleared: true })
      }
      return rpcOk({ cleared: false })
    }

    return rpcError('UNKNOWN_ENDPOINT', `Unknown dsh-better endpoint "${String(action)}"`)
  }

  const handleBetterFetchRequest = async (
    action: BetterRpcAction,
    request: Request,
  ): Promise<Response> => {
    if (request.method !== 'POST') {
      return new Response('not found', { status: 404 })
    }
    const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
    if (mediaType !== 'application/json') {
      return new Response('content type must be application/json', { status: 415 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response('body is not JSON', { status: 400 })
    }

    const isPlainObj = typeof body === 'object' && body !== null && !Array.isArray(body)
    const rec = isPlainObj ? (body as Record<string, unknown>) : undefined
    const rawId = typeof rec?.['rpcId'] === 'string' && rec['rpcId'].length > 0 ? rec['rpcId'] : 'invalid-request'

    if (
      !rec
      || rec['type'] !== 'client-request'
      || typeof rec['rpcId'] !== 'string'
      || rec['rpcId'].length === 0
      || typeof rec['method'] !== 'string'
    ) {
      return Response.json({
        type: 'server-response',
        rpcId: rawId,
        result: rpcError('gateway/bad-request', 'invalid client-request message'),
      })
    }

    const expectedMethod = `dsh-better/${action}`
    if (rec['method'] !== expectedMethod) {
      return Response.json({
        type: 'server-response',
        rpcId: rec['rpcId'],
        result: rpcError(
          'gateway/bad-request',
          `method ${JSON.stringify(rec['method'])} does not match endpoint ${JSON.stringify(expectedMethod)}`,
        ),
      })
    }

    return Response.json({
      type: 'server-response',
      rpcId: rec['rpcId'],
      result: await dispatchBetterRpc(action, rec['payload']),
    })
  }

  ctx.inject?.(['connection', 'webServer'], (connCtx: any) => {
    // Register exact Fetch routes under /api/dsh-better/* via connection.fetch.register:
    // - Served by client-connection's /api route BEFORE api-gateway's /api interceptor,
    //   retaining owner authentication & CSRF/Origin checks.
    // - Works identically on dsh 0.2.2-rc.1 (where rpc.handle hits a Cordis inject bug
    //   reading owner.webServer) and 0.2.2-rc.3+.
    // Do not wrap fetch.register() return values in connCtx.effect — fetch.register already
    // binds disposal to the caller context.
    const actions: readonly BetterRpcAction[] = ['status', 'cancel', 'ack', 'settings-get', 'settings-set']
    for (const action of actions) {
      void connCtx.connection.fetch.register({
        path: `/api/dsh-better/${action}`,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request: Request) => handleBetterFetchRequest(action, request),
      })
    }

    if (typeof connCtx.effect === 'function') {
      connCtx.effect(() => {
        rpcMounted = true
        return () => {
          rpcMounted = false
        }
      }, 'dsh-better:rpc-mounted')
    } else {
      rpcMounted = true
    }
  })

  ctx.inject?.(['subagents'], (subCtx: any) => {
    subCtx.effect(() => {
      const subagents = subCtx.subagents
      if (!subagents || typeof subagents.startActivation !== 'function') return () => {}

      const originalStart = subagents.startActivation.bind(subagents)
      const wrappedStart = async (spec: Record<string, any>) => {
        if (!currentConfig.checkSubagents) return originalStart(spec)

        const prompt = Array.isArray(spec?.['prompt']) ? spec['prompt'] as Array<Record<string, any>> : undefined
        if (!prompt) return originalStart(spec)

        const firstTextIndex = prompt.findIndex(
          block => block && block['type'] === 'text' && typeof block['text'] === 'string',
        )
        if (firstTextIndex === -1) return originalStart(spec)

        const targetBlock = prompt[firstTextIndex]!
        const { matched, brief } = matchBriefMark(String(targetBlock['text']))
        if (!matched) return originalStart(spec)

        if (brief.length === 0) {
          throw new Error('Subagent brief prefixed with /better cannot be empty.')
        }

        const parentAgent = spec['parent'] as DshAgentLike | undefined
        if (!parentAgent) {
          throw new Error('Subagent /better brief checking requires a live parent agent.')
        }

        const outcome = await runForkedHelper({
          agents: ctx.agents as DshAgentsService,
          workingDirectory: ctx.get?.('workingDirectory'),
          llm: ctx.get?.('llm') as DshLlmServiceLike | undefined,
          parentAgent,
          mode: 'brief',
          instructions: briefInstructions,
          inputText: brief,
          modelSpec: currentConfig.briefModel ?? currentConfig.model,
          reasoningEffort: currentConfig.briefReasoningEffort ?? currentConfig.reasoningEffort,
          signal: spec['signal'] as AbortSignal | undefined,
        })

        if (outcome.status === 'cancelled') {
          throw new Error('Subagent brief check cancelled before dispatch.')
        }
        if (outcome.status === 'failed') {
          const extra = outcome.fallbackPath ? ` (raw output: ${outcome.fallbackPath})` : ''
          throw new Error(`Subagent brief check failed: ${outcome.error}${extra}`)
        }

        const nextPrompt = prompt.map((block, index) => (
          index === firstTextIndex ? { ...block, text: outcome.output } : block
        ))
        return originalStart({ ...spec, prompt: nextPrompt })
      }

      subagents.startActivation = wrappedStart
      return () => {
        if (subagents.startActivation === wrappedStart) {
          subagents.startActivation = originalStart
        }
      }
    }, 'dsh-better:subagent-brief-check')
  })
}
