import { randomUUID } from 'node:crypto'
import {
  buildBriefUserPrompt,
  buildHelperUserPrompt,
  clampReasoningEffort,
  computeDepthStage,
  DEFAULT_HELPER_REASONING_EFFORT,
  extractStreamingPreview,
  helperToolGuard,
  matchSupportedReasoningEffort,
  parseCheckedBrief,
  parseImproved,
  parseReasoningEffortSetting,
  resolveModelSelection,
  toolLabel,
  writeFallbackReply,
} from '../core/better.ts'
import type { DepthStage, ToolBadge } from '../shared/types.ts'

export interface DshEvent {
  readonly seq: number
  readonly type: string
  readonly data?: Record<string, any>
}

export interface DshSessionLike {
  readonly id: string
  readonly seq: number
  readonly header?: { readonly cwd?: string; readonly delegationDepth?: number }
  snapshotEvents(from?: number): readonly DshEvent[]
  append?(type: string, data: unknown): unknown
  requestHeader?(): {
    readonly config?: {
      readonly provider?: string
      readonly model?: string
      readonly reasoningEffort?: string
    }
  } | undefined
}

export interface DshAgentLike {
  readonly id: string
  readonly session: DshSessionLike
  readonly model?: {
    current?(): { readonly provider?: string; readonly model?: string; readonly reasoningEffort?: string } | undefined
    select?(selection: { readonly provider: string; readonly model: string; readonly reasoningEffort?: string }): void
  }
  readonly options?: {
    readonly provider?: string
    readonly model?: string
    readonly reasoningEffort?: string
    readonly maxTokens?: number
    readonly subagentDepth?: number
  }
  readonly ctx?: {
    get?(service: string): any
    on?(event: string, listener: (...args: any[]) => void): () => void
  }
  followup(message: unknown): void
  cancel(cause: { readonly kind: 'user' | 'disposed' | 'parent' }): void
  whenIdle(): Promise<void>
}

export interface DshAgentHandle {
  readonly agent: DshAgentLike
  dispose(): Promise<void>
}

export interface DshAgentsService {
  create(options: Record<string, unknown>): Promise<DshAgentHandle>
}

export interface HelperProgressUpdate {
  readonly stage: DepthStage
  readonly tools: readonly ToolBadge[]
  readonly activeTools: number
  readonly doneTools: number
  readonly streamingChars: number
  readonly streamingPreview: string
}

export interface DshWorkingDirectoryService {
  ensure?(agent: unknown, signal?: AbortSignal): Promise<string>
  get?(session: unknown): string
}

export interface DshLlmModelReasoningEffort {
  readonly id: string
  readonly name: string
  readonly description?: string
}

export interface DshLlmModelInfoLike {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly badge?: string
}

export interface DshLlmResolvedModelInfoLike {
  readonly name?: string
  readonly reasoning?: {
    readonly efforts: readonly DshLlmModelReasoningEffort[]
    readonly defaultEffort?: string
  }
}

export interface DshLlmServiceLike {
  listProviders?(): readonly { readonly id: string; readonly name: string }[]
  listModels?(provider: string): Promise<readonly DshLlmModelInfoLike[]>
  resolveModelInfo?(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<DshLlmResolvedModelInfoLike>
}

export interface RunHelperParams {
  readonly agents: DshAgentsService
  readonly workingDirectory?: DshWorkingDirectoryService
  readonly llm?: DshLlmServiceLike
  readonly parentAgent: DshAgentLike
  readonly mode: 'prompt' | 'brief'
  readonly instructions: string
  readonly inputText: string
  readonly modelSpec?: string | null
  readonly reasoningEffort?: string | null
  readonly signal?: AbortSignal
  readonly onProgress?: (progress: HelperProgressUpdate) => void
  readonly onRouteResolved?: (modelLabel: string) => void
}

export type RunHelperOutcome =
  | { readonly status: 'completed'; readonly output: string; readonly rawReply: string }
  | { readonly status: 'cancelled' }
  | { readonly status: 'failed'; readonly error: string; readonly fallbackPath?: string }

const MAX_TOOL_BADGES = 24
const MODEL_INFO_CACHE_TTL_MS = 5 * 60_000

const modelInfoCacheByLlm = new WeakMap<
  DshLlmServiceLike,
  Map<string, { readonly info: DshLlmResolvedModelInfoLike; readonly expiresAt: number }>
>()

async function resolveModelInfoCached(
  llm: DshLlmServiceLike | undefined,
  provider: string,
  model: string,
  signal: AbortSignal | undefined,
): Promise<DshLlmResolvedModelInfoLike | undefined> {
  if (typeof llm?.resolveModelInfo !== 'function') return undefined
  let perModel = modelInfoCacheByLlm.get(llm)
  if (!perModel) {
    perModel = new Map()
    modelInfoCacheByLlm.set(llm, perModel)
  }
  const cacheKey = `${provider}\0${model}`
  const now = Date.now()
  const cached = perModel.get(cacheKey)
  if (cached !== undefined && cached.expiresAt > now) {
    return cached.info
  }
  const resolved = await llm.resolveModelInfo(provider, model, signal)
  if (resolved) {
    perModel.set(cacheKey, { info: resolved, expiresAt: Date.now() + MODEL_INFO_CACHE_TTL_MS })
  }
  return resolved
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value)
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
  }
  return value
}

export function createFrozenUserMessage(text: string): Record<string, unknown> {
  return deepFreeze({
    id: randomUUID(),
    role: 'user',
    source: { kind: 'user' },
    content: [{ type: 'text', text }],
  })
}

export function completedTurnPrefix(parent: DshAgentLike): readonly DshEvent[] {
  const events = parent.session.snapshotEvents()
  let lastEndIndex = -1
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]?.type === 'turn/end') {
      lastEndIndex = i
      break
    }
  }
  if (lastEndIndex === -1) return []
  return events.slice(0, lastEndIndex + 1)
}

interface ResolvedHelperRoute {
  provider?: string
  model?: string
  reasoningEffort?: string
  readonly effortMode: 'default' | 'inherit' | 'explicit'
  readonly routeChanged: boolean
  readonly parentReasoningEffort?: string
}

function resolveRoute(
  parent: DshAgentLike,
  modelSpec: string | null | undefined,
  reasoningEffortSpec: string | null | undefined,
): ResolvedHelperRoute {
  const liveModel = parent.model?.current?.()
  const requestConfig = parent.session.requestHeader?.()?.config
  const legacySelected = parent.ctx?.get?.('modelSelection')?.getSnapshot?.()

  let parentProvider = liveModel?.provider ?? requestConfig?.provider ?? legacySelected?.provider ?? parent.options?.provider
  let parentModel = liveModel?.model ?? requestConfig?.model ?? legacySelected?.model ?? parent.options?.model
  let parentReasoningEffort = liveModel?.reasoningEffort ?? requestConfig?.reasoningEffort ?? parent.options?.reasoningEffort

  if (parentProvider === undefined || parentModel === undefined) {
    const events = parent.session.snapshotEvents()
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i]
      if ((ev?.type === 'model/selection' || ev?.type === 'model/selected') && ev.data) {
        parentProvider ??= typeof ev.data['provider'] === 'string' ? ev.data['provider'] : undefined
        parentModel ??= typeof ev.data['model'] === 'string' ? ev.data['model'] : undefined
        parentReasoningEffort ??= typeof ev.data['reasoningEffort'] === 'string' ? ev.data['reasoningEffort'] : undefined
        if (parentProvider !== undefined && parentModel !== undefined) break
      }
    }
  }

  const effortSelection = parseReasoningEffortSetting(reasoningEffortSpec)
  const override = resolveModelSelection(modelSpec)
  const nextProvider = override ? (override.provider ?? parentProvider) : parentProvider
  const nextModel = override ? override.model : parentModel
  const routeChanged = override !== undefined && (nextProvider !== parentProvider || nextModel !== parentModel)

  let nextEffort: string | undefined
  if (effortSelection.mode === 'explicit') {
    nextEffort = effortSelection.effort
  } else if (effortSelection.mode === 'inherit') {
    nextEffort = !routeChanged ? parentReasoningEffort : undefined
  } else if (!routeChanged && parentReasoningEffort !== undefined) {
    // Default fast effort clamps high/max parent efforts down to 'low' while preserving 'off'/'none'/'minimal'.
    nextEffort = clampReasoningEffort(parentReasoningEffort, DEFAULT_HELPER_REASONING_EFFORT)
  }

  return {
    ...(nextProvider !== undefined ? { provider: nextProvider } : {}),
    ...(nextModel !== undefined ? { model: nextModel } : {}),
    ...(nextEffort !== undefined ? { reasoningEffort: nextEffort } : {}),
    effortMode: effortSelection.mode,
    routeChanged,
    ...(parentReasoningEffort !== undefined ? { parentReasoningEffort } : {}),
  }
}

function parseToolArgs(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

function extractTextFromBlocks(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (block && typeof block === 'object' && (block as any).type === 'text' && typeof (block as any).text === 'string') {
      parts.push((block as any).text)
    }
  }
  return parts.join('')
}

function formatTurnEndError(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason && typeof reason === 'object') {
    const rec = reason as Record<string, unknown>
    if (typeof rec['message'] === 'string' && rec['message'].trim().length > 0) return rec['message']
    if (rec['error'] && typeof rec['error'] === 'object' && typeof (rec['error'] as any).message === 'string') {
      return (rec['error'] as any).message
    }
    if (typeof rec['kind'] === 'string') return `Helper stopped: ${rec['kind']}`
  }
  return 'Helper stopped unexpectedly.'
}

export async function runForkedHelper(params: RunHelperParams): Promise<RunHelperOutcome> {
  if (params.signal?.aborted) {
    return { status: 'cancelled' }
  }

  const seed = completedTurnPrefix(params.parentAgent)
  const inheritedEventCount = seed.length
  const parentSessionId = params.parentAgent.session.id
  const route = resolveRoute(params.parentAgent, params.modelSpec, params.reasoningEffort)

  const ensureCwdPromise = typeof params.workingDirectory?.ensure === 'function'
    ? params.workingDirectory.ensure(params.parentAgent, params.signal).catch(() => undefined)
    : Promise.resolve(undefined)
  const resolveModelPromise = (
    route.provider !== undefined
    && route.model !== undefined
    && typeof params.llm?.resolveModelInfo === 'function'
  )
    ? resolveModelInfoCached(params.llm, route.provider, route.model, params.signal).catch(() => undefined)
    : Promise.resolve(undefined)

  const [ensuredCwd, resolvedInfo] = await Promise.all([ensureCwdPromise, resolveModelPromise])
  const cwd = ensuredCwd
    ?? (typeof params.workingDirectory?.get === 'function'
      ? params.workingDirectory.get(params.parentAgent.session)
      : undefined)
    ?? params.parentAgent.session.header?.cwd

  if (resolvedInfo) {
    if (route.effortMode === 'default') {
      const targetDefault = (!route.routeChanged && route.parentReasoningEffort !== undefined)
        ? (clampReasoningEffort(route.parentReasoningEffort, DEFAULT_HELPER_REASONING_EFFORT) ?? DEFAULT_HELPER_REASONING_EFFORT)
        : DEFAULT_HELPER_REASONING_EFFORT
      const matched = matchSupportedReasoningEffort(targetDefault, resolvedInfo.reasoning)
      if (matched !== undefined) {
        route.reasoningEffort = matched
      } else {
        delete route.reasoningEffort
      }
    } else if (route.reasoningEffort !== undefined) {
      const matched = matchSupportedReasoningEffort(route.reasoningEffort, resolvedInfo.reasoning)
      if (matched !== undefined) {
        route.reasoningEffort = matched
      } else {
        delete route.reasoningEffort
      }
    }
  }
  if (route.model !== undefined) {
    const modelBase = route.provider !== undefined ? `${route.provider}/${route.model}` : route.model
    const label = route.reasoningEffort !== undefined ? `${modelBase} · ${route.reasoningEffort}` : modelBase
    params.onRouteResolved?.(label)
  }
  const parentDepth = typeof params.parentAgent.session.header?.delegationDepth === 'number'
    ? params.parentAgent.session.header.delegationDepth
    : typeof params.parentAgent.options?.subagentDepth === 'number'
      ? params.parentAgent.options.subagentDepth
      : 0
  const childDepth = parentDepth + 1
  const parentPreset = params.parentAgent.ctx?.get?.('agentPresets')?.composedPreset?.(params.parentAgent.ctx)

  let handle: DshAgentHandle | undefined
  const listeners: Array<() => void> = []

  const badges: ToolBadge[] = []
  let activeTools = 0
  let doneTools = 0
  let completedTurnCount = 0
  let streamingChars = 0
  let streamedText = ''
  let lastStage: DepthStage = 'explore'

  const emitProgress = (): void => {
    lastStage = computeDepthStage({
      activeTools,
      doneTools,
      completedTurnCount,
      streamingChars,
    })
    params.onProgress?.({
      stage: lastStage,
      tools: badges.slice(-MAX_TOOL_BADGES),
      activeTools,
      doneTools,
      streamingChars,
      streamingPreview: extractStreamingPreview(streamedText),
    })
  }

  try {
    handle = await params.agents.create({
      sessionId: randomUUID(),
      meta: {
        origin: 'subagent',
        parentSession: parentSessionId,
        isSeeded: inheritedEventCount > 0,
        delegationDepth: childDepth,
        ...(cwd !== undefined ? { cwd } : {}),
        ...(typeof parentPreset === 'string' ? { agentPreset: parentPreset } : {}),
      },
      inheritedEventCount,
      // Older runtimes ignore parentSource and replay the complete seed.
      ...(inheritedEventCount > 0 ? {
        seed,
        parentSource: { sessionId: parentSessionId, endSeq: inheritedEventCount },
      } : {}),
      agentOptions: {
        ...(route.provider !== undefined ? { provider: route.provider } : {}),
        ...(route.model !== undefined ? { model: route.model } : {}),
        ...(route.reasoningEffort !== undefined ? { reasoningEffort: route.reasoningEffort } : {}),
        ...(typeof params.parentAgent.options?.maxTokens === 'number'
          ? { maxTokens: params.parentAgent.options.maxTokens }
          : {}),
        subagentDepth: childDepth,
      },
      ...(params.signal !== undefined ? { signal: params.signal } : {}),
      setup: async (childCtx: any, child: any) => {
        if (typeof child?.session?.append === 'function') {
          if (childCtx?.get?.('approval') !== undefined) {
            child.session.append('approval/policy', { policy: 'never', source: 'delegation' })
          }
          if (childCtx?.get?.('sandboxPolicy') !== undefined) {
            child.session.append('sandbox/mode', { mode: 'read-only', source: 'delegation' })
          }
        }

        const wd = childCtx?.get?.('workingDirectory')
        if (typeof wd?.set === 'function' && cwd !== undefined) {
          await wd.set(child, cwd, params.signal)
        }

        if (params.parentAgent.ctx !== undefined) {
          await childCtx?.get?.('agentPresets')?.composeFrom?.(childCtx, params.parentAgent.ctx)
        }

        const toolsSvc = childCtx?.get?.('tools')
        // Guard deterministically blocks mutating/shell/subagent tools (including inner PTC subcalls)
        // without calling tools.restrict(), keeping tools.schemas(child) byte-identical to parent
        // so DeepSeek's addition-only tool baseline keeps 100% KV prompt cache hits on seed.
        toolsSvc?.guard?.((exec: { readonly name: string }) => helperToolGuard(exec.name))

        if (route.provider !== undefined && route.model !== undefined && typeof child?.model?.select === 'function') {
          child.model.select({
            provider: route.provider,
            model: route.model,
            ...(route.reasoningEffort !== undefined ? { reasoningEffort: route.reasoningEffort } : {}),
          })
        }
      },
    })

    if (params.signal?.aborted) {
      return { status: 'cancelled' }
    }

    const agent = handle.agent
    const outputStart = agent.session.seq

    if (typeof agent.ctx?.on === 'function') {
      listeners.push(agent.ctx.on('agent/assistant-stream', (payload: any) => {
        if (payload?.agent && payload.agent !== agent) return
        const frame = payload?.frame
        if (frame?.type !== 'chunk') return
        const chunk = frame.chunk
        if (chunk?.type === 'text-delta') {
          const delta = typeof chunk.text === 'string'
            ? chunk.text
            : typeof chunk.delta === 'string'
              ? chunk.delta
              : ''
          if (delta.length > 0) {
            streamingChars += delta.length
            streamedText += delta
            emitProgress()
          }
        }
      }))

      listeners.push(agent.ctx.on('session/event', (session: unknown, event: DshEvent) => {
        if (session && session !== agent.session) return
        if (!event) return
        if (event.type === 'tool/call' && event.data) {
          const callId = String(event.data['callId'] ?? randomUUID())
          const name = String(event.data['name'] ?? 'tool')
          const args = parseToolArgs(event.data['arguments'])
          activeTools += 1
          badges.push({
            id: callId,
            name,
            label: toolLabel(name, args),
            state: 'running',
          })
          emitProgress()
        } else if (event.type === 'tool/result' && event.data) {
          const msg = event.data['message'] as Record<string, any> | undefined
          const callId = typeof msg?.['toolCallId'] === 'string' ? msg['toolCallId'] : undefined
          const isError = Boolean(msg?.['isError'])
          if (callId !== undefined) {
            const idx = badges.findIndex(b => b.id === callId)
            if (idx !== -1 && badges[idx]?.state === 'running') {
              activeTools = Math.max(0, activeTools - 1)
              doneTools += 1
              badges[idx] = { ...badges[idx]!, state: isError ? 'error' : 'done' }
            }
          }
          emitProgress()
        } else if (event.type === 'tool/ptc-dispatch-start' && event.data) {
          const callId = String(event.data['subCallId'] ?? randomUUID())
          const name = String(event.data['name'] ?? 'tool')
          const args = parseToolArgs(event.data['arguments'])
          activeTools += 1
          badges.push({
            id: callId,
            name,
            label: toolLabel(name, args),
            state: 'running',
          })
          emitProgress()
        } else if (event.type === 'tool/ptc-dispatch' && event.data) {
          const callId = typeof event.data['subCallId'] === 'string' ? event.data['subCallId'] : undefined
          const isError = Boolean(event.data['isError'])
          if (callId !== undefined) {
            const idx = badges.findIndex(b => b.id === callId)
            if (idx !== -1 && badges[idx]?.state === 'running') {
              activeTools = Math.max(0, activeTools - 1)
              doneTools += 1
              badges[idx] = { ...badges[idx]!, state: isError ? 'error' : 'done' }
            }
          }
          emitProgress()
        } else if (event.type === 'turn/end') {
          completedTurnCount += 1
          emitProgress()
        }
      }))
    }

    const onAbort = (): void => {
      try {
        agent.cancel({ kind: 'user' })
      } catch {
        // Agent might already be disposing
      }
    }
    if (params.signal) {
      params.signal.addEventListener('abort', onAbort, { once: true })
      listeners.push(() => params.signal?.removeEventListener('abort', onAbort))
    }

    const promptText = params.mode === 'prompt'
      ? buildHelperUserPrompt(params.instructions, params.inputText, seed.length > 0)
      : buildBriefUserPrompt(params.instructions, params.inputText, seed.length > 0)

    emitProgress()
    agent.followup(createFrozenUserMessage(promptText))
    await agent.whenIdle()

    if (params.signal?.aborted) {
      return { status: 'cancelled' }
    }

    const newEvents = agent.session.snapshotEvents(outputStart)
    let lastAssistantText = ''
    let lastTurnEnd: DshEvent | undefined

    for (const ev of newEvents) {
      if (ev.type === 'assistant/message') {
        const text = extractTextFromBlocks(ev.data?.['message']?.content)
        if (text.trim().length > 0) lastAssistantText = text
      } else if (ev.type === 'turn/end') {
        lastTurnEnd = ev
      }
    }

    const endReason = lastTurnEnd?.data?.['reason'] as Record<string, any> | undefined
    if (endReason?.['kind'] === 'aborted' || endReason?.['kind'] === 'canceled') {
      return { status: 'cancelled' }
    }
    if (endReason?.['kind'] === 'error') {
      return {
        status: 'failed',
        error: formatTurnEndError(endReason),
      }
    }

    if (lastAssistantText.trim().length === 0) {
      return {
        status: 'failed',
        error: 'Helper finished without producing assistant output.',
      }
    }

    const parsed = params.mode === 'prompt'
      ? parseImproved(lastAssistantText)
      : parseCheckedBrief(lastAssistantText)

    if (parsed !== undefined) {
      return {
        status: 'completed',
        output: parsed,
        rawReply: lastAssistantText,
      }
    }

    const fallbackPath = writeFallbackReply(lastAssistantText, params.mode)
    return {
      status: 'failed',
      error: params.mode === 'prompt'
        ? 'Helper reply omitted <improved-prompt>...</improved-prompt> tags.'
        : 'Brief checker omitted <checked-brief>...</checked-brief> tags.',
      fallbackPath,
    }
  } catch (error: unknown) {
    if (params.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return { status: 'cancelled' }
    }
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    for (const off of listeners) {
      try {
        off()
      } catch {
        // Ignore listener cleanup errors
      }
    }
    if (handle !== undefined) {
      await handle.dispose().catch(() => {})
    }
  }
}
