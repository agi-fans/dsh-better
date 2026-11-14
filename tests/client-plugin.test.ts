import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadClientBundle() {
  const bundleCode = readFileSync(path.join(rootDir, 'dist/client.js'), 'utf8')
  let loadedSpec: any

  const keyListeners = new Map<string, Set<(e: any) => void>>()
  let dialogOpen = false
  let timeOffsetMs = 0
  const RealDate = Date
  const FakeDate: any = class extends RealDate {
    static now() {
      return RealDate.now() + timeOffsetMs
    }
  }

  const sandbox: any = {
    Date: FakeDate,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    navigator: { language: 'zh-CN' },
    document: {
      visibilityState: 'visible',
      querySelector(selector: string) {
        if (dialogOpen && selector.includes('[role="dialog"]')) return {}
        return null
      },
    },
    window: {
      __ModuleLoader__: {
        load(spec: any) {
          loadedSpec = spec
        },
      },
      addEventListener(type: string, fn: (e: any) => void) {
        let set = keyListeners.get(type)
        if (!set) {
          set = new Set()
          keyListeners.set(type, set)
        }
        set.add(fn)
      },
      removeEventListener(type: string, fn: (e: any) => void) {
        keyListeners.get(type)?.delete(fn)
      },
    },
  }

  vm.runInNewContext(bundleCode, sandbox, { filename: 'dist/client.js' })
  assert.ok(loadedSpec, 'client.js should register via window.__ModuleLoader__.load')

  return {
    loadedSpec,
    advanceTime(ms: number) { timeOffsetMs += ms },
    setDialogOpen(open: boolean) { dialogOpen = open },
    dispatchKeyDown(ev: Record<string, unknown>) {
      for (const fn of keyListeners.get('keydown') ?? []) {
        fn({
          repeat: false,
          isComposing: false,
          defaultPrevented: false,
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          preventDefault() { (this as any).defaultPrevented = true },
          stopPropagation() {},
          ...ev,
        })
      }
    },
  }
}

function createFakeReact() {
  let activeInstance: {
    states: any[]
    refs: Array<{ current: any }>
    effects: Array<{ fn: () => (() => void) | void; deps?: readonly unknown[] }>
    cleanups: Array<(() => void) | undefined>
    prevDeps: Array<readonly unknown[] | undefined>
  } | undefined

  const instances = new Map<string, NonNullable<typeof activeInstance>>()
  let stateIndex = 0
  let refIndex = 0

  const React: any = {
    createElement(type: any, props: any, ...children: any[]) {
      return { type, props, children }
    },
    useState(init: any) {
      const inst = activeInstance!
      const idx = stateIndex++
      if (!(idx in inst.states)) {
        inst.states[idx] = typeof init === 'function' ? init() : init
      }
      const setState = (val: any) => {
        inst.states[idx] = typeof val === 'function' ? val(inst.states[idx]) : val
      }
      return [inst.states[idx], setState]
    },
    useRef(init: any) {
      const inst = activeInstance!
      const idx = refIndex++
      if (!(idx in inst.refs)) inst.refs[idx] = { current: init }
      return inst.refs[idx]
    },
    useCallback(fn: any) {
      return fn
    },
    useEffect(fn: any, deps?: readonly unknown[]) {
      activeInstance!.effects.push({ fn, deps })
    },
  }

  return {
    React,
    render(key: string, Component: any, props: any) {
      let inst = instances.get(key)
      if (!inst) {
        inst = { states: [], refs: [], effects: [], cleanups: [], prevDeps: [] }
        instances.set(key, inst)
      }
      activeInstance = inst
      stateIndex = 0
      refIndex = 0
      inst.effects = []
      let tree = Component(props)
      while (typeof tree?.type === 'function') {
        tree = tree.type(tree.props ?? {})
      }
      inst.effects.forEach((eff, idx) => {
        const old = inst!.prevDeps[idx]
        const changed = !old || !eff.deps || old.length !== eff.deps.length || eff.deps.some((d, i) => d !== old[i])
        if (changed) {
          inst!.cleanups[idx]?.()
          inst!.cleanups[idx] = eff.fn() || undefined
          inst!.prevDeps[idx] = eff.deps
        }
      })
      activeInstance = undefined
      return tree
    },
    unmountAll() {
      for (const inst of instances.values()) {
        for (const c of inst.cleanups) c?.()
        inst.cleanups = []
      }
      instances.clear()
    },
  }
}

function findNodes(tree: any, predicate: (node: any) => boolean): any[] {
  if (!tree || typeof tree !== 'object') return []
  const matches: any[] = []
  if (predicate(tree)) matches.push(tree)
  for (const child of tree.children ?? []) {
    if (Array.isArray(child)) {
      for (const item of child) matches.push(...findNodes(item, predicate))
    } else {
      matches.push(...findNodes(child, predicate))
    }
  }
  return matches
}

test('client plugin fixes useInput selector & /api/dsh-better/* RPC, renders dock + toolbar pill, and restores drafts safely', async () => {
  const runtime = loadClientBundle()
  const fakeReact = createFakeReact()
  const plugin = runtime.loadedSpec.factory((id: string) => {
    assert.equal(id, 'react')
    return fakeReact.React
  })

  assert.deepEqual([...plugin.inject], ['slots', 'connection', 'locale'])

  const registeredSlots = new Map<string, { def: any; Component: any }>()
  const rpcCalls: Array<{ channel: string; endpoint: string; payload: any }> = []
  const registeredLocales: Record<string, any> = {}
  const ctxDisposers: Array<() => void> = []
  const ctxEvents = new EventEmitter()
  let currentStatus: any = null

  const ctx = {
    effect(fn: () => any) {
      const cleanup = fn()
      if (typeof cleanup === 'function') ctxDisposers.push(cleanup)
      return cleanup
    },
    on(event: string, listener: (...args: any[]) => void) {
      ctxEvents.on(event, listener)
      return () => ctxEvents.off(event, listener)
    },
    locale: {
      getSnapshot: () => ({ active: 'en' }),
      register(_ns: string, dicts: Record<string, Record<string, string>>) {
        for (const [lang, dict] of Object.entries(dicts)) {
          for (const [k, v] of Object.entries(dict)) {
            assert.equal(typeof v, 'string', `Locale "${lang}.${k}" must be flat string`)
          }
          registeredLocales[lang] = dict
        }
        return () => {}
      },
    },
    slots: {
      inject(_name: string, fn: () => any) { return fn() },
      register(def: any, Component: any) {
        registeredSlots.set(def.name, { def, Component })
        return () => registeredSlots.delete(def.name)
      },
    },
    connection: {
      rpc: {
        async call(channel: string, endpoint: string, payload: any) {
          assert.equal(channel, '/api', 'Client must call /api RPC channel')
          rpcCalls.push({ channel, endpoint, payload })
          if (endpoint === 'dsh-better/status') return { ok: true, value: currentStatus }
          if (endpoint === 'dsh-better/ack') {
            if (currentStatus?.runId === payload?.runId) currentStatus = null
            return { ok: true, value: { cleared: true } }
          }
          if (endpoint === 'dsh-better/cancel') {
            if (currentStatus?.status === 'running') {
              currentStatus = { ...currentStatus, status: 'cancelled' }
              return { ok: true, value: { cancelled: true } }
            }
            return { ok: true, value: { cancelled: false } }
          }
          return { ok: false, error: { code: 'UNKNOWN', message: 'unknown' } }
        },
      },
    },
  }

  plugin.apply(ctx)
  assert.equal(runtime.loadedSpec.id, '@agi-fans/dsh-better')
  assert.deepEqual(
    Object.keys(registeredLocales).sort(),
    ['de', 'en', 'es', 'fr', 'ja', 'pt', 'ru', 'zh'],
    'All 8 DSH built-in languages must be registered',
  )
  const expectedKeys = Object.keys(registeredLocales.en).sort()
  for (const lang of Object.keys(registeredLocales)) {
    assert.deepEqual(Object.keys(registeredLocales[lang]).sort(), expectedKeys, `${lang} keys must match en`)
    for (const [k, v] of Object.entries(registeredLocales[lang] as Record<string, string>)) {
      assert.ok(!/[\uFEFF\u200B]/.test(v), `${lang}.${k} must not contain BOM or zero-width space`)
    }
  }
  assert.equal(registeredSlots.get('conversation.input.dock')?.def.id, 'dsh-better')
  assert.equal(registeredSlots.get('conversation.input.left')?.def.id, 'dsh-better-pill')
  assert.equal(registeredSlots.get('settings.section')?.def.id, 'dsh-better')
  assert.equal(registeredSlots.get('settings.section')?.def.label(), 'Prompt Deepener')
  assert.equal(registeredSlots.get('settings.section.icon')?.def.id, 'dsh-better')
  assert.equal(registeredSlots.get('plugins.bundle.config')?.def.key, '@agi-fans/dsh-better')
  assert.equal(registeredSlots.get('plugins.row.config')?.def.key, '@agi-fans/dsh-better#dsh-better')

  const DockComponent = registeredSlots.get('conversation.input.dock')!.Component
  const PillComponent = registeredSlots.get('conversation.input.left')!.Component

  const draftsSet: string[] = []
  let persisted = 0
  const inputActions = {
    setDraft(text: string) { draftsSet.push(text) },
    persistDraft() { persisted += 1 },
  }

  // Strictly mimic DSH SessionStandardProps (sessionId on root & session.sessionId, NO .id;
  // useInput REQUIRES selector function).
  const baseProps = (phase: string, draft: string) => ({
    sessionId: 'sess-1',
    session: { sessionId: 'sess-1', running: false },
    useInput: (sel: (s: any) => any) => {
      assert.equal(typeof sel, 'function', 'useInput must be called with selector function')
      return sel({ phase, draft })
    },
    inputActions,
  })

  try {
    // 1. Optimistic 0ms feedback when command/executed fires before Host status arrives
    currentStatus = null
    fakeReact.render('dock', DockComponent, baseProps('plain', ''))
    fakeReact.render('pill', PillComponent, baseProps('plain', ''))
    ctxEvents.emit('command/executed', 'sess-1', 'better', { kind: 'success', text: 'Deepening prompt in background…' })
    const optDock = fakeReact.render('dock', DockComponent, baseProps('plain', ''))
    const optPill = fakeReact.render('pill', PillComponent, baseProps('plain', ''))
    assert.equal(optDock?.props?.['data-dsh-better-dock'], 'running')
    assert.equal(optPill?.props?.['data-dsh-better-pill'], 'running')

    // 2. Host running status with sourceDraft, modelLabel & Esc cancellation
    currentStatus = {
      runId: 'run-1',
      sessionId: 'sess-1',
      sourceDraft: 'fix auth bug',
      modelLabel: 'deepseek-official/deepseek-reasoner · high',
      status: 'running',
      stage: 'deepen',
      startedAt: Date.now() - 2000,
      updatedAt: Date.now(),
      elapsedMs: 2000,
      turn: 0,
      tools: [{ id: 't1', name: 'read', label: 'read src/index.ts', state: 'done' }],
      activeTools: 0,
      doneTools: 1,
      streamingChars: 140,
      streamingPreview: 'Inspecting src/auth.ts…',
    }

    fakeReact.render('dock', DockComponent, baseProps('submitting', ''))
    await new Promise(r => setTimeout(r, 15))
    fakeReact.render('dock', DockComponent, baseProps('plain', ''))
    await new Promise(r => setTimeout(r, 15))
    const treeRunning = fakeReact.render('dock', DockComponent, baseProps('plain', ''))
    assert.equal(treeRunning?.props?.['data-dsh-better-dock'], 'running')
    assert.ok(
      findNodes(treeRunning, n => n.props?.['data-dsh-better-model'] === 'deepseek-official/deepseek-reasoner · high').length === 1,
      'Running dock should display active modelLabel badge',
    )

    runtime.setDialogOpen(true)
    runtime.dispatchKeyDown({ key: 'Escape' })
    assert.equal(rpcCalls.some(c => c.endpoint === 'dsh-better/cancel'), false, 'Esc must ignore when dialog is open')

    runtime.setDialogOpen(false)
    runtime.dispatchKeyDown({ key: 'Escape' })
    await new Promise(r => setTimeout(r, 15))
    assert.equal(rpcCalls.some(c => c.endpoint === 'dsh-better/cancel'), true, 'Esc cancels active run')

    // When cancelled with empty composer draft, sourceDraft is automatically restored!
    fakeReact.render('dock', DockComponent, baseProps('plain', ''))
    await new Promise(r => setTimeout(r, 15))
    assert.deepEqual(draftsSet, ['fix auth bug'])

    // 3. Completed run waits until phase === 'plain', injects above draft, acks, and allows Restore original
    draftsSet.length = 0
    currentStatus = {
      runId: 'run-2',
      sessionId: 'sess-1',
      sourceDraft: 'original rough prompt',
      status: 'completed',
      stage: 'sharpen',
      startedAt: Date.now() - 3000,
      updatedAt: Date.now(),
      elapsedMs: 3000,
      turn: 1,
      tools: [],
      activeTools: 0,
      doneTools: 2,
      streamingChars: 420,
      improvedPrompt: 'Improved prompt body',
    }

    fakeReact.render('dock', DockComponent, baseProps('submitting', 'existing tail'))
    await new Promise(r => setTimeout(r, 15))
    fakeReact.render('dock', DockComponent, baseProps('submitting', 'existing tail'))
    assert.equal(draftsSet.length, 0, 'Must wait until phase === plain before injecting draft')

    fakeReact.render('dock', DockComponent, baseProps('plain', 'existing tail'))
    await new Promise(r => setTimeout(r, 15))
    const doneTree = fakeReact.render('dock', DockComponent, baseProps('plain', 'existing tail'))
    await new Promise(r => setTimeout(r, 15))

    assert.deepEqual(draftsSet, ['Improved prompt body\n\nexisting tail'])
    assert.ok(persisted >= 2)
    assert.ok(rpcCalls.some(c => c.endpoint === 'dsh-better/ack' && c.payload.runId === 'run-2'))

    // The restore control now lives in the tool row, where the running timer was
    const doneNotice = findNodes(doneTree, n => n.type === 'button' && n.children?.includes('Dismiss'))[0]
    assert.ok(doneNotice, 'Still offers the dismiss control on the confirmation notice')
    assert.equal(
      findNodes(doneTree, n => n.type === 'button' && n.children?.includes('Restore original')).length,
      0,
      'Restore is no longer a notice button',
    )

    const donePill = fakeReact.render('pill', PillComponent, baseProps('plain', 'existing tail'))
    const restoreBtn = findNodes(donePill, n => n.type === 'button' && n.children?.includes('Restore original'))[0]
    assert.ok(restoreBtn, 'Should render the Restore original pill in the tool row after deepening')
    assert.equal(restoreBtn.props?.['data-dsh-better-pill'], 'restore')
    restoreBtn.props.onClick()
    assert.equal(draftsSet.at(-1), 'original rough prompt\n\nexisting tail')
    const afterRestore = fakeReact.render('pill', PillComponent, baseProps('plain', 'existing tail'))
    assert.equal(findNodes(afterRestore, n => n.type === 'button' && n.children?.includes('Restore original')).length, 0)
  } finally {
    fakeReact.unmountAll()
    for (const d of ctxDisposers) d()
  }
})

test('client leaves optimistic state into failed and restores draft when /api/dsh-better/* returns HTTP 404', async () => {
  const runtime = loadClientBundle()
  const fakeReact = createFakeReact()
  const plugin = runtime.loadedSpec.factory(() => fakeReact.React)

  const registeredSlots = new Map<string, { def: any; Component: any }>()
  const ctxDisposers: Array<() => void> = []
  const ctxEvents = new EventEmitter()
  let statusCalls = 0

  const ctx = {
    effect(fn: () => any) {
      const cleanup = fn()
      if (typeof cleanup === 'function') ctxDisposers.push(cleanup)
      return cleanup
    },
    on(event: string, listener: (...args: any[]) => void) {
      ctxEvents.on(event, listener)
      return () => ctxEvents.off(event, listener)
    },
    locale: {
      getSnapshot: () => ({ active: 'zh' }),
      register: () => () => {},
    },
    slots: {
      inject(_name: string, fn: () => any) { return fn() },
      register(def: any, Component: any) {
        registeredSlots.set(def.name, { def, Component })
        return () => registeredSlots.delete(def.name)
      },
    },
    connection: {
      rpc: {
        async call() {
          statusCalls += 1
          throw new Error('transport failure for /api/dsh-better/status: HTTP 404')
        },
      },
    },
  }

  plugin.apply(ctx)
  const DockComponent = registeredSlots.get('conversation.input.dock')!.Component

  const draftsSet: string[] = []
  let persisted = 0
  const props = (phase: string, draft: string) => ({
    sessionId: 'sess-404',
    session: { sessionId: 'sess-404' },
    useInput: (sel: (s: any) => any) => sel({ phase, draft }),
    inputActions: {
      setDraft(text: string) { draftsSet.push(text) },
      persistDraft() { persisted += 1 },
    },
  })

  try {
    // User types `/better my draft` before submitting
    fakeReact.render('dock', DockComponent, props('plain', '/better my draft'))
    await new Promise(r => setTimeout(r, 15))

    // Submission succeeds synchronously on /api, then client enters optimistic state
    ctxEvents.emit('command/executed', 'sess-404', 'better', { kind: 'success', text: 'Deepening prompt in background…' })
    const optTree = fakeReact.render('dock', DockComponent, props('plain', ''))
    assert.equal(optTree?.props?.['data-dsh-better-dock'], 'running')
    await new Promise(r => setTimeout(r, 15))

    // Advance beyond 1.5s and accumulate >= 4 RPC failures from polling without re-emitting command/executed
    runtime.advanceTime(1700)
    for (let i = 0; i < 4; i++) {
      fakeReact.render('dock', DockComponent, props('submitting', ''))
      await new Promise(r => setTimeout(r, 15))
      fakeReact.render('dock', DockComponent, props('plain', ''))
      await new Promise(r => setTimeout(r, 15))
    }

    assert.ok(statusCalls >= 4, `Expected >= 4 failed status polls, got ${statusCalls}`)
    const failedTree = fakeReact.render('dock', DockComponent, props('plain', ''))
    const alertText = JSON.stringify(failedTree)
    assert.equal(failedTree?.props?.['data-dsh-better-dock'], 'failed', 'Must NOT remain stuck on optimistic running')
    assert.match(alertText, /无法连接宿主 \/api\/dsh-better 通道.*HTTP 404/)
    assert.deepEqual(draftsSet, ['my draft'], 'Must restore captured sourceDraft when Host RPC fails')
    assert.ok(persisted >= 1)
  } finally {
    fakeReact.unmountAll()
    for (const d of ctxDisposers) d()
  }
})

test('client registers BetterSettingsPanel in Settings & Plugins slots and persists model/reasoningEffort changes via RPC', async () => {
  const runtime = loadClientBundle()
  const fakeReact = createFakeReact()
  const plugin = runtime.loadedSpec.factory(() => fakeReact.React)

  const registeredSlots = new Map<string, { def: any; Component: any }>()
  const rpcCalls: Array<{ endpoint: string; payload: any }> = []
  let savedConfig = {
    model: null as string | null,
    reasoningEffort: null as string | null,
    briefModel: null as string | null,
    briefReasoningEffort: null as string | null,
    checkSubagents: true,
  }

  const catalogModels = [
    {
      provider: 'deepseek-official',
      providerName: 'DeepSeek',
      model: 'deepseek-reasoner',
      modelName: 'DeepSeek Reasoner',
      value: 'deepseek-official/deepseek-reasoner',
      reasoningEfforts: [
        { id: 'low', name: 'Low' },
        { id: 'high', name: 'High' },
      ],
      defaultReasoningEffort: 'high',
    },
  ]

  const ctxDisposers: Array<() => void> = []
  const ctx = {
    effect(fn: () => any) {
      const cleanup = fn()
      if (typeof cleanup === 'function') ctxDisposers.push(cleanup)
      return cleanup
    },
    on: () => () => {},
    get: () => undefined,
    locale: {
      getSnapshot: () => ({ active: 'zh' }),
      register: () => () => {},
    },
    slots: {
      inject(_name: string, fn: () => any) { return fn() },
      register(def: any, Component: any) {
        registeredSlots.set(def.name, { def, Component })
        return () => registeredSlots.delete(def.name)
      },
    },
    connection: {
      rpc: {
        async call(_channel: string, endpoint: string, payload: any) {
          rpcCalls.push({ endpoint, payload })
          if (endpoint === 'dsh-better/settings-get') {
            return {
              ok: true,
              value: {
                config: { ...savedConfig },
                models: catalogModels,
                providerFailures: [],
                persistedPath: '/tmp/profile/dsh-better.settings.json',
                writable: true,
              },
            }
          }
          if (endpoint === 'dsh-better/settings-set') {
            if (payload?.reset) {
              savedConfig = { model: null, reasoningEffort: null, briefModel: null, briefReasoningEffort: null, checkSubagents: true }
            } else {
              savedConfig = { ...savedConfig, ...(payload?.config ?? {}) }
            }
            return {
              ok: true,
              value: {
                config: { ...savedConfig },
                models: catalogModels,
                providerFailures: [],
                persistedPath: '/tmp/profile/dsh-better.settings.json',
                writable: true,
              },
            }
          }
          return { ok: true, value: null }
        },
      },
    },
  }

  plugin.apply(ctx)
  assert.equal(registeredSlots.get('settings.section')?.def.label(), '提示词深化')
  const SettingsPanel = registeredSlots.get('plugins.bundle.config')!.Component

  try {
    const summaryText = SettingsPanel({ view: 'summary' })
    assert.equal(summaryText, '跟随当前对话')

    fakeReact.render('settings', SettingsPanel, { view: 'page' })
    await new Promise(r => setTimeout(r, 15))
    const loadedTree = fakeReact.render('settings', SettingsPanel, { view: 'page' })

    const modelSelect = findNodes(loadedTree, n => n.props?.['data-dsh-better-field'] === 'model')[0]
    const effortSelect = findNodes(loadedTree, n => n.props?.['data-dsh-better-field'] === 'reasoningEffort')[0]
    const subagentSwitch = findNodes(loadedTree, n => n.props?.['data-dsh-better-field'] === 'checkSubagents')[0]
    const briefModelBefore = findNodes(loadedTree, n => n.props?.['data-dsh-better-field'] === 'briefModel')[0]
    assert.ok(modelSelect && effortSelect && subagentSwitch && briefModelBefore)
    assert.equal(subagentSwitch.props.role, 'switch')
    assert.equal(subagentSwitch.props['aria-checked'], true)

    // Native DSH style: each change auto-saves immediately via dsh-better/settings-set without a Save button
    modelSelect.props.onChange({ target: { value: 'deepseek-official/deepseek-reasoner' } })
    await new Promise(r => setTimeout(r, 15))
    assert.equal(savedConfig.model, 'deepseek-official/deepseek-reasoner')

    const afterModelTree = fakeReact.render('settings', SettingsPanel, { view: 'page' })
    const renderedEffortSelect = findNodes(afterModelTree, n => n.props?.['data-dsh-better-field'] === 'reasoningEffort')[0]!
    const renderedEffortValues = findNodes(renderedEffortSelect, n => n.type === 'option').map(opt => opt.props?.value)
    assert.ok(renderedEffortValues.includes(''), 'effort select includes fast low default')
    assert.ok(renderedEffortValues.includes('inherit'), 'effort select includes explicit inherit option')

    renderedEffortSelect.props.onChange({ target: { value: 'inherit' } })
    await new Promise(r => setTimeout(r, 15))
    assert.equal(savedConfig.reasoningEffort, 'inherit')

    renderedEffortSelect.props.onChange({ target: { value: 'high' } })
    await new Promise(r => setTimeout(r, 15))
    assert.equal(savedConfig.reasoningEffort, 'high')

    const afterEffortTree = fakeReact.render('settings', SettingsPanel, { view: 'page' })
    findNodes(afterEffortTree, n => n.props?.['data-dsh-better-field'] === 'checkSubagents')[0]!.props.onClick()
    await new Promise(r => setTimeout(r, 15))
    assert.equal(savedConfig.checkSubagents, false)

    const disabledSubagentTree = fakeReact.render('settings', SettingsPanel, { view: 'page' })
    assert.equal(
      findNodes(disabledSubagentTree, n => n.props?.['data-dsh-better-field'] === 'briefModel').length,
      0,
      'Subagent model rows collapse when checkSubagents switch is turned off',
    )

    // Non-default state exposes subtle Reset button, which restores all defaults immediately
    const resetBtn = findNodes(disabledSubagentTree, n => n.props?.['data-dsh-better-reset'] === 'true')[0]
    assert.ok(resetBtn)
    resetBtn.props.onClick()
    await new Promise(r => setTimeout(r, 15))
    assert.equal(savedConfig.model, null)
    assert.equal(savedConfig.reasoningEffort, null)
    assert.equal(savedConfig.checkSubagents, true)
    assert.ok(rpcCalls.filter(c => c.endpoint === 'dsh-better/settings-set').length >= 4)
  } finally {
    fakeReact.unmountAll()
    for (const d of ctxDisposers) d()
  }
})

test('all 8 DSH languages have matching locale/*.json, docs/DETAIL*.md, and live UI locale switching', async () => {
  const expectedLangs = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ru', 'pt'] as const
  const enMeta = JSON.parse(readFileSync(path.join(rootDir, 'locale/en.json'), 'utf8'))
  const enTopKeys = Object.keys(enMeta).sort()
  const enMetaKeys = Object.keys(enMeta.meta).sort()

  for (const lang of expectedLangs) {
    const jsonPath = path.join(rootDir, 'locale', `${lang}.json`)
    assert.ok(existsSync(jsonPath), `Missing locale/${lang}.json`)
    const rawJson = readFileSync(jsonPath, 'utf8')
    assert.ok(!/[\uFEFF\u200B]/.test(rawJson), `locale/${lang}.json must not contain BOM or ZWSP`)
    const parsed = JSON.parse(rawJson)
    assert.deepEqual(Object.keys(parsed).sort(), enTopKeys, `locale/${lang}.json top-level keys mismatch`)
    assert.deepEqual(Object.keys(parsed.meta).sort(), enMetaKeys, `locale/${lang}.json meta keys mismatch`)

    const detailRel = parsed.meta.detail as string
    const detailAbs = path.join(rootDir, detailRel)
    assert.ok(existsSync(detailAbs), `Missing detail doc "${detailRel}" referenced by locale/${lang}.json`)
    const detailMd = readFileSync(detailAbs, 'utf8')
    assert.ok(!detailMd.includes('refs/'), `${detailRel} must not link into local refs/ directory`)
    assert.ok(!/[\uFEFF\u200B]/.test(detailMd), `${detailRel} must not contain BOM or ZWSP`)
  }

  const runtime = loadClientBundle()
  const fakeReact = createFakeReact()
  const plugin = runtime.loadedSpec.factory((id: string) => {
    assert.equal(id, 'react')
    return fakeReact.React
  })

  const registeredSlots = new Map<string, { def: any; Component: any }>()
  const ctxEvents = new EventEmitter()
  const ctxDisposers: Array<() => void> = []
  let activeLocale = 'en'

  const ctx = {
    effect(fn: () => any) {
      const cleanup = fn()
      if (typeof cleanup === 'function') ctxDisposers.push(cleanup)
      return cleanup
    },
    on(event: string, listener: (...args: any[]) => void) {
      ctxEvents.on(event, listener)
      return () => ctxEvents.off(event, listener)
    },
    get: () => undefined,
    locale: {
      getSnapshot: () => ({ active: activeLocale }),
      register: () => () => {},
    },
    slots: {
      inject(_name: string, fn: () => any) { return fn() },
      register(def: any, Component: any) {
        registeredSlots.set(def.name, { def, Component })
        return () => registeredSlots.delete(def.name)
      },
    },
    connection: {
      rpc: {
        async call(_channel: string, endpoint: string) {
          if (endpoint === 'dsh-better/settings-get') {
            return {
              ok: true,
              value: {
                config: { model: null, reasoningEffort: null, briefModel: null, briefReasoningEffort: null, checkSubagents: true },
                models: [],
                providerFailures: [],
                persistedPath: '/tmp/profile/dsh-better.settings.json',
                writable: true,
              },
            }
          }
          return { ok: true, value: null }
        },
      },
    },
  }

  plugin.apply(ctx)
  const sectionLabelFn = registeredSlots.get('settings.section')!.def.label
  const SettingsPanel = registeredSlots.get('plugins.bundle.config')!.Component

  const expectedTitles: Record<string, string> = {
    'en-US': 'Prompt Deepener',
    'zh-CN': '提示词深化',
    'ja-JP': 'プロンプト深化',
    'es-ES': 'Profundizar prompt',
    'fr-FR': 'Approfondir le prompt',
    'de-DE': 'Prompt-Vertiefung',
    'ru-RU': 'Углубление промпта',
    'pt-BR': 'Aprofundar prompt',
    'pt-PT': 'Aprofundar prompt',
  }

  try {
    fakeReact.render('i18n-settings', SettingsPanel, { view: 'page' })
    await new Promise(r => setTimeout(r, 15))

    for (const [localeTag, expectedTitle] of Object.entries(expectedTitles)) {
      activeLocale = localeTag
      ctxEvents.emit('locale/change', { active: localeTag })
      assert.equal(sectionLabelFn(), expectedTitle, `settings.section label for ${localeTag}`)
      const summary = SettingsPanel({ view: 'summary' })
      assert.ok(typeof summary === 'string' && summary.length > 0, `summary text for ${localeTag}`)
      const tree = fakeReact.render('i18n-settings', SettingsPanel, { view: 'page' })
      const heading = findNodes(tree, n => n.type === 'h3' && n.props?.className === 'dsh-better-plugin-heading')[0]
      assert.equal((heading?.children ?? []).join(''), expectedTitle, `Rendered heading should follow ${localeTag}`)
    }
  } finally {
    fakeReact.unmountAll()
    for (const d of ctxDisposers) d()
  }
})
