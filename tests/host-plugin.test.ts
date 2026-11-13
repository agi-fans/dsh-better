import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { apply as applyHostPlugin } from '../src/host/index.ts'

interface MockCommandDef {
  readonly name: string
  handler(invocation: any): Promise<any> | any
}

function createMockContext(options: {
  readonly withConnection?: boolean
  readonly withWebServer?: boolean
  readonly resolvedWorkingDir?: string
  readonly parentPreset?: string
  readonly profileDir?: string
  readonly llm?: any
} = {}) {
  const commands = new Map<string, MockCommandDef>()
  const fetchRoutes = new Map<string, { methods: readonly string[]; requestBody: string; fetch: (req: Request) => Promise<Response> }>()
  const disposers: Array<() => void> = []
  const pendingInjects: Array<{ deps: readonly string[]; cb: (subCtx: any) => void }> = []

  const createdAgents: Array<{
    options: any
    cancelled?: boolean
    disposed?: boolean
    guardFn?: (exec: any) => unknown
    restrictedFilter?: any
    composedFromParent?: any
    selectedModel?: any
    appendedEvents?: Array<{ type: string; data: unknown }>
  }> = []
  let nextScript: ((helpers: { emitStreamText: (text: string) => void; emitTool: (id: string, name: string, args: unknown, isError?: boolean) => void; emitPtcSubcallStart: (subCallId: string, name: string, args: unknown) => void; emitPtcSubcallEnd: (subCallId: string, name: string, isError?: boolean) => void; appendAssistant: (text: string) => void; endTurn: (reason?: any) => void; signal?: AbortSignal }) => Promise<void>) | undefined

  const agents = {
    async create(createOpts: any) {
      const record: any = { options: createOpts, cancelled: false, disposed: false, appendedEvents: [] }
      createdAgents.push(record)

      const emitter = new EventEmitter()
      const events: any[] = [...(createOpts.seed ?? [])]

      const childCtx = {
        get(service: string) {
          if (service === 'tools') {
            return {
              definitions() {
                return [
                  { name: 'read' },
                  { name: 'grep' },
                  { name: 'glob' },
                  { name: 'bash' },
                  { name: 'write' },
                  { name: 'edit' },
                  { name: 'subagent' },
                ]
              },
              restrict(filter: any) {
                record.restrictedFilter = filter
                return () => {}
              },
              guard(fn: (exec: any) => unknown) {
                record.guardFn = fn
                return () => {}
              },
            }
          }
          if (service === 'agentPresets') {
            return {
              composeFrom(_childCtx: unknown, parentCtx: unknown) {
                record.composedFromParent = parentCtx
                return options.parentPreset ?? 'standard'
              },
            }
          }
          if (service === 'approval' || service === 'sandboxPolicy') {
            return {}
          }
          return undefined
        },
        on(event: string, listener: (...args: any[]) => void) {
          emitter.on(event, listener)
          return () => emitter.off(event, listener)
        },
      }

      const pushEvent = (type: string, data: any) => {
        const ev = { seq: events.length, type, data }
        events.push(ev)
        emitter.emit('session/event', childAgent.session, ev)
      }

      let idleResolve!: () => void
      const idlePromise = new Promise<void>((resolve) => {
        idleResolve = resolve
      })

      const childAgent: any = {
        id: createOpts.sessionId,
        ctx: childCtx,
        options: createOpts.agentOptions,
        model: {
          select(selection: any) {
            record.selectedModel = selection
          },
        },
        session: {
          id: createOpts.sessionId,
          get seq() { return events.length },
          header: { cwd: createOpts.meta?.cwd },
          snapshotEvents(from = 0) { return events.slice(from) },
          append(type: string, data: unknown) {
            record.appendedEvents.push({ type, data })
            pushEvent(type, data)
          },
        },
        followup(_msg: unknown) {
          void (async () => {
            try {
              if (nextScript) {
                await nextScript({
                  emitStreamText(text: string) {
                    emitter.emit('agent/assistant-stream', {
                      frame: { type: 'chunk', chunk: { type: 'text-delta', text } },
                    })
                  },
                  emitTool(id: string, name: string, args: unknown, isError = false) {
                    pushEvent('tool/call', { callId: id, name, arguments: JSON.stringify(args) })
                    pushEvent('tool/result', { message: { toolCallId: id, isError } })
                  },
                  emitPtcSubcallStart(subCallId: string, name: string, args: unknown) {
                    pushEvent('tool/ptc-dispatch-start', { subCallId, name, arguments: JSON.stringify(args) })
                  },
                  emitPtcSubcallEnd(subCallId: string, name: string, isError = false) {
                    pushEvent('tool/ptc-dispatch', { subCallId, name, isError })
                  },
                  appendAssistant(text: string) {
                    pushEvent('assistant/message', { message: { content: [{ type: 'text', text }] } })
                  },
                  endTurn(reason: any = { kind: 'completed' }) {
                    pushEvent('turn/end', { reason })
                  },
                  signal: createOpts.signal,
                })
              }
            } finally {
              idleResolve()
            }
          })()
        },
        cancel(_cause: any) {
          record.cancelled = true
          pushEvent('turn/end', { reason: { kind: 'canceled' } })
          idleResolve()
        },
        whenIdle() {
          return idlePromise
        },
      }

      await createOpts.setup?.(childCtx, childAgent)
      return {
        agent: childAgent,
        async dispose() {
          record.disposed = true
        },
      }
    },
  }

  const subagentStartCalls: any[] = []
  const subagents = {
    async startActivation(spec: any) {
      subagentStartCalls.push(spec)
      return { name: 'worker-1', runId: 'run-1' }
    },
  }

  const connection = options.withConnection
    ? {
      fetch: {
        register(route: { path: string; methods: readonly string[]; requestBody: string; fetch: (req: Request) => Promise<Response> }) {
          assert.ok(route.path.startsWith('/api/dsh-better/'), `Expected /api/dsh-better/ path, got ${route.path}`)
          assert.ok(route.methods.includes('POST'), `Expected POST method for ${route.path}`)
          assert.equal(route.requestBody, 'buffered', `Expected buffered requestBody for ${route.path}`)
          fetchRoutes.set(route.path, route)
          return async () => {
            fetchRoutes.delete(route.path)
          }
        },
      },
      rpc: {
        handle() {
          throw new Error('cannot get property "webServer" without inject')
        },
        intercept() {
          throw new Error('connection: shared RPC channel "/api" already has an interceptor')
        },
      },
    }
    : undefined

  const hasWebServer = options.withWebServer ?? options.withConnection
  const webServer = hasWebServer
    ? { register() { return () => {} } }
    : undefined

  const workingDirectory = options.resolvedWorkingDir !== undefined
    ? {
      async ensure() { return options.resolvedWorkingDir! },
      get() { return options.resolvedWorkingDir! },
    }
    : undefined

  const services: Record<string, any> = {
    commands: {
      register(def: MockCommandDef) {
        commands.set(def.name, def)
        return () => commands.delete(def.name)
      },
    },
    agents,
    subagents,
    ...(options.profileDir !== undefined ? { profileContext: { dir: options.profileDir } } : {}),
    ...(options.llm !== undefined ? { llm: options.llm } : {}),
    ...(workingDirectory ? { workingDirectory } : {}),
    ...(connection ? { connection } : {}),
    ...(webServer ? { webServer } : {}),
  }

  const runPendingInjects = () => {
    for (let i = pendingInjects.length - 1; i >= 0; i--) {
      const entry = pendingInjects[i]!
      if (entry.deps.every(d => services[d] !== undefined)) {
        pendingInjects.splice(i, 1)
        entry.cb(ctx)
      }
    }
  }

  const ctx: any = {
    ...services,
    get(key: string) {
      return services[key]
    },
    effect(fn: () => () => void) {
      disposers.push(fn())
    },
    inject(deps: readonly string[], cb: (subCtx: any) => void) {
      if (deps.every(d => services[d] !== undefined)) {
        cb(ctx)
      } else {
        pendingInjects.push({ deps, cb })
      }
    },
  }

  return {
    ctx,
    commands,
    createdAgents,
    subagents,
    subagentStartCalls,
    provideService(key: string, value: unknown) {
      services[key] = value
      ctx[key] = value
      runPendingInjects()
    },
    setNextScript(fn: typeof nextScript) { nextScript = fn },
    hasFetchRoute(endpoint: string) {
      return fetchRoutes.has(`/api/dsh-better/${endpoint}`)
    },
    async callRawFetch(endpoint: string, init: RequestInit) {
      const routePath = `/api/dsh-better/${endpoint}`
      const route = fetchRoutes.get(routePath)
      assert.ok(route, `missing exact Fetch route for ${routePath}`)
      return await route.fetch(new Request(`http://127.0.0.1${routePath}`, { method: 'POST', ...init }))
    },
    async callRpc(endpoint: string, payload: unknown) {
      const routePath = `/api/dsh-better/${endpoint}`
      const route = fetchRoutes.get(routePath)
      assert.ok(route, `missing exact Fetch route for ${routePath}`)
      const request = new Request(`http://127.0.0.1${routePath}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request',
          rpcId: 'rpc-test-1',
          method: `dsh-better/${endpoint}`,
          payload,
        }),
      })
      const response = await route.fetch(request)
      assert.equal(response.status, 200)
      const body = await response.json() as any
      assert.equal(body.type, 'server-response')
      assert.equal(body.rpcId, 'rpc-test-1')
      return body.result
    },
    dispose() {
      for (const d of disposers) d()
    },
  }
}

function makeParentAgent(sessionId = 'sess-1') {
  const parentEvents = [
    { seq: 0, type: 'user/message', data: { content: [{ type: 'text', text: 'prev' }] } },
    { seq: 1, type: 'turn/end', data: { reason: { kind: 'completed' } } },
    // Unbalanced in-flight turn after last turn/end must NOT be copied into helper fork seed:
    { seq: 2, type: 'tool/call', data: { callId: 'c1', name: 'read' } },
  ]
  return {
    id: sessionId,
    options: { provider: 'deepseek-official', model: 'deepseek-chat', approval: 'auto' },
    session: {
      id: sessionId,
      seq: parentEvents.length,
      header: { cwd: '/repo/demo' },
      snapshotEvents() { return parentEvents },
    },
    followup() {},
    cancel() {},
    whenIdle: async () => {},
  }
}

test('headless /better forks completed turn prefix, enforces read-only guard, and returns deepened prompt', async () => {
  const harness = createMockContext({ withConnection: false })
  applyHostPlugin(harness.ctx, { model: 'deepseek-reasoner' })

  harness.setNextScript(async ({ emitTool, emitStreamText, appendAssistant, endTurn }) => {
    emitTool('t1', 'read', { file_path: 'src/app.ts' })
    emitStreamText('Drafting...')
    appendAssistant('Reasoning...\n<improved-prompt>\nUpdate src/app.ts\n</improved-prompt>')
    endTurn({ kind: 'completed' })
  })

  const betterCmd = harness.commands.get('better')!
  const result = await betterCmd.handler({ agent: makeParentAgent(), rawInput: 'fix app', signal: new AbortController().signal })

  assert.deepEqual(result, { kind: 'success', text: 'Update src/app.ts' })
  assert.equal(harness.createdAgents.length, 1)

  const spawned = harness.createdAgents[0]!
  assert.equal(spawned.disposed, true)
  assert.equal(spawned.options.seed.length, 2, 'fork seed must truncate after last turn/end')
  assert.equal(spawned.options.meta.origin, 'subagent')
  assert.equal(spawned.options.meta.cwd, '/repo/demo')
  assert.deepEqual(spawned.options.agentOptions, {
    provider: 'deepseek-official',
    model: 'deepseek-reasoner',
    subagentDepth: 1,
  })
  assert.equal(spawned.guardFn?.({ name: 'read' }), undefined)
  assert.equal(typeof spawned.guardFn?.({ name: 'bash' }), 'string')

  harness.dispose()
})

test('headless /better saves fallback file when tags are missing', async () => {
  const harness = createMockContext({ withConnection: false })
  applyHostPlugin(harness.ctx)

  harness.setNextScript(async ({ appendAssistant, endTurn }) => {
    appendAssistant('Plain untagged improved prompt body')
    endTurn({ kind: 'completed' })
  })

  const result = await harness.commands.get('better')!.handler({ agent: makeParentAgent(), rawInput: 'improve me' })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /Raw reply saved to: (.+\.md)/)
  const match = /Raw reply saved to: (.+\.md)/.exec(result.text)
  const fallbackPath = match?.[1]
  assert.ok(fallbackPath && existsSync(fallbackPath))
  rmSync(path.dirname(fallbackPath), { recursive: true, force: true })
  harness.dispose()
})

test('UI mode /better returns non-blocking, streams RPC status with sourceDraft, supports /better-cancel and ack', async () => {
  const harness = createMockContext({ withConnection: true, resolvedWorkingDir: '/hero/workspace' })
  applyHostPlugin(harness.ctx)

  let finishTurn!: () => void
  const gate = new Promise<void>((resolve) => { finishTurn = resolve })

  harness.setNextScript(async ({ emitTool, emitStreamText, appendAssistant, endTurn, signal }) => {
    emitTool('t1', 'grep', { pattern: 'apply', path: 'src/host' })
    emitStreamText('<improved-prompt>Live streaming preview ' + 'a'.repeat(130))
    await Promise.race([
      gate,
      new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve(), { once: true })),
    ])
    if (!signal?.aborted) {
      appendAssistant('<improved-prompt>Refined prompt text</improved-prompt>')
      endTurn({ kind: 'completed' })
    }
  })

  const parent = makeParentAgent('sess-ui')
  delete (parent.session.header as any).cwd
  const emptyRes = await harness.commands.get('better')!.handler({ agent: parent, rawInput: '   ' })
  assert.equal(emptyRes.kind, 'error')

  const launchRes = await harness.commands.get('better')!.handler({ agent: parent, rawInput: 'make this better' })
  assert.equal(launchRes.kind, 'success')
  await new Promise(r => setTimeout(r, 5))
  assert.equal(harness.createdAgents[0]?.options?.meta?.cwd, '/hero/workspace')

  const dupRes = await harness.commands.get('better')!.handler({ agent: parent, rawInput: 'another' })
  assert.equal(dupRes.kind, 'error')

  // Allow microtask to advance into tool + streaming delta
  await new Promise(r => setTimeout(r, 15))
  const midStatus = await harness.callRpc('status', { sessionId: 'sess-ui' })
  assert.equal(midStatus.ok, true)
  assert.equal(midStatus.value.status, 'running')
  assert.equal(midStatus.value.sourceDraft, 'make this better')
  assert.equal(midStatus.value.stage, 'deepen')
  assert.match(midStatus.value.streamingPreview, /Live streaming preview/)
  assert.equal(midStatus.value.tools[0].label, 'grep apply src/host')

  finishTurn()
  await new Promise(r => setTimeout(r, 15))

  const doneStatus = await harness.callRpc('status', { sessionId: 'sess-ui' })
  assert.equal(doneStatus.value.status, 'completed')
  assert.equal(doneStatus.value.improvedPrompt, 'Refined prompt text')

  const ack = await harness.callRpc('ack', { sessionId: 'sess-ui', runId: doneStatus.value.runId })
  assert.deepEqual(ack, { ok: true, value: { cleared: true } })

  const afterAck = await harness.callRpc('status', { sessionId: 'sess-ui' })
  assert.equal(afterAck.value, null)

  // Test /better-cancel on second run
  let holdSecond!: () => void
  const secondGate = new Promise<void>((r) => { holdSecond = r })
  harness.setNextScript(async ({ signal }) => {
    await Promise.race([
      secondGate,
      new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve(), { once: true })),
    ])
  })
  await harness.commands.get('better')!.handler({ agent: parent, rawInput: 'run 2' })
  const cancelCmd = await harness.commands.get('better-cancel')!.handler({ agent: parent })
  assert.equal(cancelCmd.kind, 'success')
  holdSecond()
  await new Promise(r => setTimeout(r, 15))
  const cancelledStatus = await harness.callRpc('status', { sessionId: 'sess-ui' })
  assert.equal(cancelledStatus.value.status, 'cancelled')

  harness.dispose()
})

test('subagent /better brief checking rewrites marked briefs and fails closed on cancellation or error', async () => {
  const harness = createMockContext({ withConnection: false })
  applyHostPlugin(harness.ctx, { briefModel: 'deepseek-official/deepseek-chat', checkSubagents: true })

  const parent = makeParentAgent('sess-sub')

  // Unmarked prompt passes through untouched without launching helper
  await harness.subagents.startActivation({
    provider: 'fork',
    parent,
    label: 'plain',
    prompt: [{ type: 'text', text: 'Regular task without marker' }],
    signal: new AbortController().signal,
  })
  assert.equal(harness.createdAgents.length, 0)
  assert.equal(harness.subagentStartCalls[0].prompt[0].text, 'Regular task without marker')

  // Marked /better prompt checks brief and preserves non-text blocks
  harness.setNextScript(async ({ appendAssistant, endTurn }) => {
    appendAssistant('<checked-brief>Checked brief referencing src/core/better.ts</checked-brief>')
    endTurn({ kind: 'completed' })
  })
  await harness.subagents.startActivation({
    provider: 'fork',
    parent,
    label: 'checked',
    prompt: [
      { type: 'text', text: '/better check src/better.ts' },
      { type: 'image', mediaType: 'image/png', data: 'abc' },
    ],
    signal: new AbortController().signal,
  })
  assert.equal(harness.createdAgents.length, 1)
  assert.deepEqual(harness.subagentStartCalls[1].prompt, [
    { type: 'text', text: 'Checked brief referencing src/core/better.ts' },
    { type: 'image', mediaType: 'image/png', data: 'abc' },
  ])

  // Cancelled check fails closed and does not dispatch activation
  const abortController = new AbortController()
  abortController.abort()
  await assert.rejects(
    () => harness.subagents.startActivation({
      provider: 'fork',
      parent,
      label: 'aborted',
      prompt: [{ type: 'text', text: '/better do not leak raw' }],
      signal: abortController.signal,
    }),
    /cancelled/i,
  )
  assert.equal(harness.subagentStartCalls.length, 2)

  harness.dispose()
})

test('Host defers /api/dsh-better/* Fetch routes until webServer arrives, validates HTTP envelopes, and includes details: {}', async () => {
  const harness = createMockContext({ withConnection: true, withWebServer: false })
  applyHostPlugin(harness.ctx)

  // Before webServer is provided, /better falls back cleanly to synchronous headless mode instead of
  // advertising an unmounted background UI channel.
  harness.setNextScript(async ({ appendAssistant, endTurn }) => {
    appendAssistant('<improved-prompt>Headless fallback result</improved-prompt>')
    endTurn({ kind: 'completed' })
  })
  const headlessRes = await harness.commands.get('better')!.handler({ agent: makeParentAgent('sess-pre'), rawInput: 'draft' })
  assert.deepEqual(headlessRes, { kind: 'success', text: 'Headless fallback result' })

  // Once webServer is provided asynchronously, /api/dsh-better/* routes mount and rpcError includes details: {}
  harness.provideService('webServer', { register() { return () => {} } })
  assert.equal(harness.hasFetchRoute('status'), true)
  assert.equal(harness.hasFetchRoute('cancel'), true)
  assert.equal(harness.hasFetchRoute('ack'), true)
  assert.equal(harness.hasFetchRoute('settings-get'), true)
  assert.equal(harness.hasFetchRoute('settings-set'), true)
  assert.equal(harness.hasFetchRoute('nonexistent'), false)

  const invalidRes = await harness.callRpc('status', {})
  assert.deepEqual(invalidRes, {
    ok: false,
    error: { code: 'INVALID_REQUEST', message: 'sessionId is required', details: {} },
  })

  const badTypeRes = await harness.callRawFetch('status', {
    headers: { 'content-type': 'text/plain' },
    body: '{}',
  })
  assert.equal(badTypeRes.status, 415)

  const badJsonRes = await harness.callRawFetch('status', {
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  })
  assert.equal(badJsonRes.status, 400)

  const wrongMethodRes = await harness.callRawFetch('status', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: 'rpc-mismatch',
      method: 'dsh-better/wrong',
      payload: { sessionId: 'sess-1' },
    }),
  })
  assert.equal(wrongMethodRes.status, 200)
  assert.deepEqual(await wrongMethodRes.json(), {
    type: 'server-response',
    rpcId: 'rpc-mismatch',
    result: {
      ok: false,
      error: {
        code: 'gateway/bad-request',
        message: 'method "dsh-better/wrong" does not match endpoint "dsh-better/status"',
        details: {},
      },
    },
  })

  harness.dispose()
})

test('forked helper inherits Web/Desktop preset, preserves KV cache without tools.restrict, clamps default effort to low, and propagates Hero routing-group model', async () => {
  const harness = createMockContext({ withConnection: false, parentPreset: 'standard' })
  applyHostPlugin(harness.ctx)

  harness.setNextScript(async ({ appendAssistant, endTurn }) => {
    appendAssistant('<improved-prompt>Hero deepened prompt</improved-prompt>')
    endTurn({ kind: 'aborted' })
  })

  const parentCtx = {
    get(service: string) {
      if (service === 'agentPresets') {
        return { composedPreset: () => 'standard' }
      }
      return undefined
    },
  }
  const heroParent: any = {
    id: 'hero-1',
    ctx: parentCtx,
    model: {
      current: () => ({
        provider: 'deepseek-routing',
        model: 'routing-group-max',
        reasoningEffort: 'high',
      }),
    },
    options: { provider: 'fallback', model: 'fallback-model', maxTokens: 4096 },
    session: {
      id: 'hero-1',
      seq: 0,
      header: { cwd: '/repo/mundo-kids' },
      snapshotEvents: () => [],
    },
    followup() {},
    cancel() {},
    whenIdle: async () => {},
  }

  const res = await harness.commands.get('better')!.handler({ agent: heroParent, rawInput: 'refactor hero' })
  assert.deepEqual(res, { kind: 'error', text: '/better cancelled.' })

  const spawned = harness.createdAgents[0]!
  assert.equal(spawned.options.meta.agentPreset, 'standard')
  assert.equal(spawned.options.meta.delegationDepth, 1)
  assert.equal(spawned.composedFromParent, parentCtx)
  assert.deepEqual(spawned.options.agentOptions, {
    provider: 'deepseek-routing',
    model: 'routing-group-max',
    reasoningEffort: 'low',
    maxTokens: 4096,
    subagentDepth: 1,
  })
  assert.deepEqual(spawned.selectedModel, {
    provider: 'deepseek-routing',
    model: 'routing-group-max',
    reasoningEffort: 'low',
  })
  assert.equal(spawned.restrictedFilter, undefined, 'tools.restrict must not be called so tools.schemas() preserves KV cache parity')
  assert.equal(spawned.guardFn?.({ name: 'read' }), undefined)
  assert.equal(spawned.guardFn?.({ name: 'run_code' }), undefined)
  for (const denied of ['bash', 'write', 'edit', 'subagent', 'cua_run_code']) {
    assert.equal(typeof spawned.guardFn?.({ name: denied }), 'string')
  }
  assert.deepEqual(spawned.appendedEvents, [
    { type: 'approval/policy', data: { policy: 'never', source: 'delegation' } },
    { type: 'sandbox/mode', data: { mode: 'read-only', source: 'delegation' } },
  ])

  harness.dispose()
})

test('settings-get/set RPC enumerates llm catalog with provider failure isolation, persists to profileDir, and supports reset', async () => {
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'dsh-better-profile-'))
  try {
    const mockLlm = {
      listProviders() {
        return [
          { id: 'deepseek-official', name: 'DeepSeek' },
          { id: 'broken-provider', name: 'Broken Provider' },
        ]
      },
      async listModels(providerId: string) {
        if (providerId === 'broken-provider') {
          throw new Error('upstream timeout')
        }
        return [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General' },
          { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', badge: 'Thinking' },
        ]
      },
      async resolveModelInfo(_providerId: string, modelId: string) {
        if (modelId === 'deepseek-reasoner') {
          return {
            name: 'DeepSeek Reasoner',
            reasoning: {
              efforts: [
                { id: 'low', name: 'Low' },
                { id: 'high', name: 'High' },
              ],
              defaultEffort: 'high',
            },
          }
        }
        return { name: 'DeepSeek Chat' }
      },
    }

    const harness1 = createMockContext({ withConnection: true, profileDir, llm: mockLlm })
    applyHostPlugin(harness1.ctx, { checkSubagents: true })

    const initial = await harness1.callRpc('settings-get', {})
    assert.equal(initial.ok, true)
    assert.equal(initial.value.models.length, 2)
    assert.deepEqual(initial.value.models[1].reasoningEfforts.map((e: any) => e.id), ['low', 'high'])
    assert.deepEqual(initial.value.providerFailures, [
      { id: 'broken-provider', name: 'Broken Provider', message: 'upstream timeout' },
    ])
    assert.deepEqual(initial.value.config, {
      model: null,
      reasoningEffort: null,
      briefModel: null,
      briefReasoningEffort: null,
      checkSubagents: true,
    })

    const saved = await harness1.callRpc('settings-set', {
      config: {
        model: 'deepseek-official/deepseek-reasoner',
        reasoningEffort: 'max',
        briefModel: 'deepseek-official/deepseek-chat',
        briefReasoningEffort: 'low',
        checkSubagents: false,
      },
    })
    assert.equal(saved.ok, true)
    assert.deepEqual(saved.value.config, {
      model: 'deepseek-official/deepseek-reasoner',
      reasoningEffort: 'max',
      briefModel: 'deepseek-official/deepseek-chat',
      briefReasoningEffort: 'low',
      checkSubagents: false,
    })

    const settingsFile = path.join(profileDir, 'dsh-better.settings.json')
    assert.equal(existsSync(settingsFile), true)
    assert.equal(JSON.parse(readFileSync(settingsFile, 'utf8')).model, 'deepseek-official/deepseek-reasoner')
    harness1.dispose()

    // Fresh reload reads persisted dsh-better.settings.json automatically
    const harness2 = createMockContext({ withConnection: true, profileDir, llm: mockLlm })
    applyHostPlugin(harness2.ctx, { model: null, checkSubagents: true })
    const reloaded = await harness2.callRpc('settings-get', {})
    assert.deepEqual(reloaded.value.config, saved.value.config)

    // Reset removes persisted file and restores baseline config
    const resetRes = await harness2.callRpc('settings-set', { reset: true })
    assert.equal(resetRes.ok, true)
    assert.deepEqual(resetRes.value.config, {
      model: null,
      reasoningEffort: null,
      briefModel: null,
      briefReasoningEffort: null,
      checkSubagents: true,
    })
    assert.equal(existsSync(settingsFile), false)
    harness2.dispose()
  } finally {
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('/better-model configures model, clamps unsupported reasoningEffort cleanly, and toggles checkSubagents live', async () => {
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'dsh-better-cmd-'))
  try {
    const mockLlm = {
      listProviders: () => [{ id: 'deepseek-official', name: 'DeepSeek' }],
      listModels: async () => [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
      ],
      async resolveModelInfo(_providerId: string, modelId: string) {
        if (modelId === 'deepseek-reasoner') {
          return {
            reasoning: {
              efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }],
              defaultEffort: 'high',
            },
          }
        }
        return { name: 'DeepSeek Chat' } // No reasoning efforts supported
      },
    }

    const harness = createMockContext({ withConnection: true, profileDir, llm: mockLlm })
    applyHostPlugin(harness.ctx)

    // Inspect summary
    const infoRes = await harness.commands.get('better-model')!.handler({ rawInput: '' })
    assert.equal(infoRes.kind, 'success')
    assert.match(infoRes.text, /deepseek-official\/deepseek-reasoner/)

    // Set model + effort 'max' -> clamped to 'high' on deepseek-reasoner via resolveModelInfo
    const setRes = await harness.commands.get('better-model')!.handler({
      rawInput: 'deepseek-official/deepseek-reasoner max',
    })
    assert.equal(setRes.kind, 'success')

    let seenStatus: any
    harness.setNextScript(async ({ appendAssistant, endTurn }) => {
      seenStatus = await harness.callRpc('status', { sessionId: 'sess-1' })
      appendAssistant('<improved-prompt>Reasoned output</improved-prompt>')
      endTurn({ kind: 'completed' })
    })
    await harness.commands.get('better')!.handler({ agent: makeParentAgent('sess-1'), rawInput: 'improve' })
    await new Promise(r => setTimeout(r, 20))

    assert.equal(harness.createdAgents[0]!.options.agentOptions.model, 'deepseek-reasoner')
    assert.equal(harness.createdAgents[0]!.options.agentOptions.reasoningEffort, 'high')
    assert.equal(seenStatus.value.modelLabel, 'deepseek-official/deepseek-reasoner · high')
    await harness.callRpc('ack', { sessionId: 'sess-1' })

    // Switch to non-reasoning model while effort stays set -> helper omits reasoningEffort to avoid LlmError
    await harness.commands.get('better-model')!.handler({ rawInput: 'deepseek-official/deepseek-chat' })
    harness.setNextScript(async ({ appendAssistant, endTurn }) => {
      appendAssistant('<improved-prompt>Chat output</improved-prompt>')
      endTurn({ kind: 'completed' })
    })
    await harness.commands.get('better')!.handler({ agent: makeParentAgent('sess-1'), rawInput: 'improve 2' })
    await new Promise(r => setTimeout(r, 20))
    assert.equal(harness.createdAgents[1]!.options.agentOptions.model, 'deepseek-chat')
    assert.equal(harness.createdAgents[1]!.options.agentOptions.reasoningEffort, undefined)

    // Toggle checkSubagents off live -> /better subagent brief passes through unchecked
    await harness.commands.get('better-model')!.handler({ rawInput: 'subagents off' })
    await harness.subagents.startActivation({
      provider: 'fork',
      parent: makeParentAgent('sess-1'),
      label: 'unchecked',
      prompt: [{ type: 'text', text: '/better untouched while off' }],
    })
    assert.equal(harness.createdAgents.length, 2, 'subagent check must skip when checkSubagents=false')
    assert.equal(harness.subagentStartCalls[0].prompt[0].text, '/better untouched while off')

    // Toggle back on -> intercepts again
    await harness.commands.get('better-model')!.handler({ rawInput: 'subagents on' })
    harness.setNextScript(async ({ appendAssistant, endTurn }) => {
      appendAssistant('<checked-brief>Checked again</checked-brief>')
      endTurn({ kind: 'completed' })
    })
    await harness.subagents.startActivation({
      provider: 'fork',
      parent: makeParentAgent('sess-1'),
      label: 'checked-again',
      prompt: [{ type: 'text', text: '/better verify live toggle' }],
    })
    assert.equal(harness.createdAgents.length, 3)
    assert.equal(harness.subagentStartCalls[1].prompt[0].text, 'Checked again')

    harness.dispose()
  } finally {
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('reasoningEffort inherit preserves parent high effort, caches resolveModelInfo across runs, and tracks PTC subcall badges', async () => {
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'dsh-better-cache-'))
  let resolveCalls = 0
  try {
    const mockLlm = {
      listProviders: () => [{ id: 'deepseek-routing', name: 'DeepSeek Routing' }],
      listModels: async () => [{ id: 'routing-group-max', name: 'Max' }],
      async resolveModelInfo() {
        resolveCalls += 1
        return {
          name: 'Max',
          reasoning: {
            efforts: [
              { id: 'off', name: 'Off' },
              { id: 'low', name: 'Low' },
              { id: 'high', name: 'High' },
              { id: 'max', name: 'Max' },
            ],
            defaultEffort: 'high',
          },
        }
      },
    }

    const harness = createMockContext({ withConnection: true, profileDir, llm: mockLlm })
    applyHostPlugin(harness.ctx)

    const routingParent: any = {
      id: 'sess-ptc',
      model: {
        current: () => ({
          provider: 'deepseek-routing',
          model: 'routing-group-max',
          reasoningEffort: 'high',
        }),
      },
      options: { provider: 'deepseek-routing', model: 'routing-group-max' },
      session: {
        id: 'sess-ptc',
        seq: 0,
        header: { cwd: '/repo/demo' },
        snapshotEvents: () => [],
      },
      followup() {},
      cancel() {},
      whenIdle: async () => {},
    }

    // Configure explicit 'inherit' via /better-model and persist
    const setInheritRes = await harness.commands.get('better-model')!.handler({ rawInput: 'effort inherit' })
    assert.equal(setInheritRes.kind, 'success')
    assert.equal(JSON.parse(readFileSync(path.join(profileDir, 'dsh-better.settings.json'), 'utf8')).reasoningEffort, 'inherit')

    let midPtcStatus: any
    let finishPtc!: () => void
    const ptcGate = new Promise<void>((resolve) => { finishPtc = resolve })

    harness.setNextScript(async ({ emitPtcSubcallStart, emitPtcSubcallEnd, appendAssistant, endTurn }) => {
      emitPtcSubcallStart('ptc-1', 'read', { file_path: 'src/core/better.ts' })
      midPtcStatus = await harness.callRpc('status', { sessionId: 'sess-ptc' })
      emitPtcSubcallEnd('ptc-1', 'read', false)
      await ptcGate
      appendAssistant('<improved-prompt>Inherited high effort with PTC</improved-prompt>')
      endTurn({ kind: 'completed' })
    })

    await harness.commands.get('better')!.handler({ agent: routingParent, rawInput: 'ptc test' })
    await new Promise(r => setTimeout(r, 15))
    assert.equal(midPtcStatus.value.activeTools, 1)
    assert.equal(midPtcStatus.value.tools[0].label, 'read src/core/better.ts')
    assert.equal(midPtcStatus.value.tools[0].state, 'running')

    finishPtc()
    await new Promise(r => setTimeout(r, 15))
    const doneStatus = await harness.callRpc('status', { sessionId: 'sess-ptc' })
    assert.equal(doneStatus.value.activeTools, 0)
    assert.equal(doneStatus.value.doneTools, 1)
    assert.equal(doneStatus.value.tools[0].state, 'done')
    assert.equal(harness.createdAgents[0]!.options.agentOptions.reasoningEffort, 'high')
    assert.equal(resolveCalls, 1)
    await harness.callRpc('ack', { sessionId: 'sess-ptc' })

    // Second run with settings-set reset to default (null) -> reuses cached resolveModelInfo and clamps high -> low
    await harness.callRpc('settings-set', { reset: true })
    const resolveCallsBeforeSecondRun = resolveCalls
    harness.setNextScript(async ({ appendAssistant, endTurn }) => {
      appendAssistant('<improved-prompt>Fast default run</improved-prompt>')
      endTurn({ kind: 'completed' })
    })
    await harness.commands.get('better')!.handler({ agent: routingParent, rawInput: 'fast default' })
    await new Promise(r => setTimeout(r, 15))
    assert.equal(resolveCalls, resolveCallsBeforeSecondRun, 'resolveModelInfo should hit 5-minute TTL cache on second run')
    assert.equal(harness.createdAgents[1]!.options.agentOptions.reasoningEffort, 'low')

    harness.dispose()
  } finally {
    rmSync(profileDir, { recursive: true, force: true })
  }
})
