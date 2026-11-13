import type { BetterClientCopy } from './locales.ts'
import type {
  BetterModelOption,
  BetterPluginConfig,
  BetterReasoningEffortOption,
  BetterSettingsPayload,
} from '../shared/types.ts'

export interface SettingsStoreState {
  readonly loading: boolean
  readonly saving: boolean
  readonly loaded: boolean
  readonly error?: string
  readonly payload?: BetterSettingsPayload
  readonly config: Required<BetterPluginConfig>
}

export interface BetterSettingsStore {
  getState(): SettingsStoreState
  subscribe(listener: () => void): () => void
  load(force?: boolean): Promise<void>
  applyPatch(patch: Partial<BetterPluginConfig>): Promise<void>
  reset(): Promise<void>
}

const DEFAULT_CONFIG: Required<BetterPluginConfig> = {
  model: null,
  reasoningEffort: null,
  briefModel: null,
  briefReasoningEffort: null,
  checkSubagents: true,
}

const FALLBACK_EFFORTS: readonly BetterReasoningEffortOption[] = [
  { id: 'none', name: 'none' },
  { id: 'low', name: 'low' },
  { id: 'medium', name: 'medium' },
  { id: 'high', name: 'high' },
  { id: 'max', name: 'max' },
]

const SETTINGS_CSS = `
.dsh-better-settings {
  display: flex;
  flex-direction: column;
  width: 100%;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-plugin-heading {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-rows {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.dsh-better-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 0;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.16));
}
.dsh-better-rows > .dsh-better-row:last-child {
  border-bottom: none;
}
.dsh-better-row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsh-better-row-title {
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-row-desc {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary, rgba(127, 127, 127, 0.78));
}
.dsh-better-row-control {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.dsh-better-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}
.dsh-better-select {
  appearance: none;
  -webkit-appearance: none;
  height: 36px;
  min-width: 188px;
  max-width: 260px;
  padding: 0 34px 0 14px;
  border: none;
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-module-platform, rgba(127, 127, 127, 0.12));
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (hover: hover) {
  .dsh-better-select:not(:disabled):hover {
    background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.18));
  }
}
.dsh-better-select:disabled {
  opacity: 0.5;
  cursor: default;
}
.dsh-better-select-chevron {
  position: absolute;
  right: 12px;
  pointer-events: none;
  color: var(--dsw-alias-label-secondary, inherit);
  display: flex;
  align-items: center;
}
.dsh-better-switch {
  box-sizing: border-box;
  position: relative;
  flex: 0 0 auto;
  width: 36px;
  height: 20px;
  padding: 2px;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3, rgba(127, 127, 127, 0.35));
  cursor: pointer;
}
.dsh-better-switch[aria-checked='true'] {
  background: var(--dsw-alias-brand-primary, #3b82f6);
}
.dsh-better-switch:disabled {
  cursor: default;
  opacity: 0.5;
}
.dsh-better-switch-thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, var(--dsw-alias-label-primary-foreground, #ffffff));
  transition: transform 120ms ease;
}
.dsh-better-switch[aria-checked='true'] .dsh-better-switch-thumb {
  background: var(--dsw-alias-label-primary-foreground, #ffffff);
  transform: translateX(16px);
}
.dsh-better-custom-box {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.dsh-better-custom-input {
  height: 32px;
  width: 240px;
  max-width: 100%;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l4, rgba(127, 127, 127, 0.3));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-3, rgba(127, 127, 127, 0.1));
  color: var(--dsw-alias-label-primary, inherit);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  box-sizing: border-box;
}
.dsh-better-inline-btn {
  height: 32px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(127, 127, 127, 0.25));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-module-platform, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-better-inline-btn-primary {
  border-color: var(--dsw-alias-brand-primary, #3b82f6);
  background: var(--dsw-alias-brand-primary, #3b82f6);
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
}
.dsh-better-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
.dsh-better-reset-btn {
  border: none;
  background: none;
  padding: 4px 2px;
  color: var(--dsw-alias-label-secondary, rgba(127, 127, 127, 0.8));
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-better-reset-btn:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-error {
  margin-top: 6px;
  color: var(--dsw-alias-state-error-primary, #ef4444);
  font-size: 12px;
  line-height: 18px;
}
`

function normalizeClientNullable(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isDefaultConfig(config: Required<BetterPluginConfig>): boolean {
  return (
    config.model === null
    && config.reasoningEffort === null
    && config.briefModel === null
    && config.briefReasoningEffort === null
    && config.checkSubagents === true
  )
}

function groupModelsByProvider(models: readonly BetterModelOption[]): ReadonlyArray<{
  readonly provider: string
  readonly providerName: string
  readonly items: readonly BetterModelOption[]
}> {
  const byProvider = new Map<string, { providerName: string; items: BetterModelOption[] }>()
  for (const model of models) {
    let group = byProvider.get(model.provider)
    if (!group) {
      group = { providerName: model.providerName, items: [] }
      byProvider.set(model.provider, group)
    }
    group.items.push(model)
  }
  return Array.from(byProvider.entries()).map(([provider, group]) => ({
    provider,
    providerName: group.providerName,
    items: group.items,
  }))
}

function resolveEffortChoices(
  selectedModelValue: string | null,
  models: readonly BetterModelOption[],
  currentEffort: string | null,
): {
  readonly efforts: readonly BetterReasoningEffortOption[]
  readonly modelHasNoEfforts: boolean
} {
  if (selectedModelValue !== null) {
    const matched = models.find(m => m.value === selectedModelValue || m.model === selectedModelValue)
    if (matched) {
      if (matched.reasoningEfforts.length === 0) {
        return { efforts: [], modelHasNoEfforts: true }
      }
      const list = [...matched.reasoningEfforts]
      if (currentEffort !== null && currentEffort !== 'inherit' && !list.some(e => e.id === currentEffort)) {
        list.push({ id: currentEffort, name: currentEffort })
      }
      return { efforts: list, modelHasNoEfforts: false }
    }
  }

  const merged = new Map<string, BetterReasoningEffortOption>()
  for (const opt of FALLBACK_EFFORTS) merged.set(opt.id, opt)
  for (const m of models) {
    for (const opt of m.reasoningEfforts) {
      if (!merged.has(opt.id)) merged.set(opt.id, opt)
    }
  }
  if (currentEffort !== null && currentEffort !== 'inherit' && !merged.has(currentEffort)) {
    merged.set(currentEffort, { id: currentEffort, name: currentEffort })
  }
  return { efforts: Array.from(merged.values()), modelHasNoEfforts: false }
}

export function createBetterSettingsStore(
  ctx: any,
  getCopy: () => BetterClientCopy,
): BetterSettingsStore {
  let state: SettingsStoreState = {
    loading: false,
    saving: false,
    loaded: false,
    config: { ...DEFAULT_CONFIG },
  }
  const listeners = new Set<() => void>()
  let inFlightLoad: Promise<void> | undefined
  let mutationGeneration = 0

  const emit = (): void => {
    for (const listener of listeners) {
      try {
        listener()
      } catch {
        // Keep other subscribers healthy
      }
    }
  }

  const rpcCall = async (endpoint: string, payload: unknown) => {
    if (!ctx?.connection?.rpc?.call) {
      throw new Error(getCopy().rpcHostUnavailable)
    }
    return await ctx.connection.rpc.call('/api', endpoint, payload)
  }

  const load = async (force = false): Promise<void> => {
    if (inFlightLoad && !force) return await inFlightLoad
    const genAtStart = mutationGeneration
    const task = (async () => {
      state = { ...state, loading: true }
      emit()
      try {
        const res = await rpcCall('dsh-better/settings-get', {})
        if (!res?.ok) {
          throw new Error(res?.error?.message ?? 'Failed to load settings')
        }
        const payload = res.value as BetterSettingsPayload
        state = {
          ...state,
          loading: false,
          loaded: true,
          payload,
          // Preserve newer optimistic config if user changed something mid-load
          config: genAtStart === mutationGeneration ? { ...payload.config } : state.config,
          error: undefined,
        }
      } catch (err: unknown) {
        state = {
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }
      } finally {
        emit()
      }
    })().finally(() => {
      inFlightLoad = undefined
    })
    inFlightLoad = task
    return await task
  }

  const applyPatch = async (patch: Partial<BetterPluginConfig>): Promise<void> => {
    const gen = ++mutationGeneration
    const prevConfig = state.config
    const nextConfig: Required<BetterPluginConfig> = {
      model: Object.hasOwn(patch, 'model') ? normalizeClientNullable(patch.model) : prevConfig.model,
      reasoningEffort: Object.hasOwn(patch, 'reasoningEffort')
        ? normalizeClientNullable(patch.reasoningEffort)
        : prevConfig.reasoningEffort,
      briefModel: Object.hasOwn(patch, 'briefModel') ? normalizeClientNullable(patch.briefModel) : prevConfig.briefModel,
      briefReasoningEffort: Object.hasOwn(patch, 'briefReasoningEffort')
        ? normalizeClientNullable(patch.briefReasoningEffort)
        : prevConfig.briefReasoningEffort,
      checkSubagents: typeof patch.checkSubagents === 'boolean' ? patch.checkSubagents : prevConfig.checkSubagents,
    }

    state = {
      ...state,
      saving: true,
      config: nextConfig,
      error: undefined,
    }
    emit()

    try {
      const res = await rpcCall('dsh-better/settings-set', { config: nextConfig })
      if (!res?.ok) {
        throw new Error(res?.error?.message ?? 'Failed to save settings')
      }
      if (gen !== mutationGeneration) return
      const payload = res.value as BetterSettingsPayload
      state = {
        ...state,
        saving: false,
        loaded: true,
        payload,
        config: { ...payload.config },
        error: undefined,
      }
    } catch (err: unknown) {
      if (gen !== mutationGeneration) return
      state = {
        ...state,
        saving: false,
        config: prevConfig,
        error: err instanceof Error ? err.message : String(err),
      }
    } finally {
      emit()
    }
  }

  const reset = async (): Promise<void> => {
    const gen = ++mutationGeneration
    const prevConfig = state.config
    state = {
      ...state,
      saving: true,
      config: { ...DEFAULT_CONFIG },
      error: undefined,
    }
    emit()

    try {
      const res = await rpcCall('dsh-better/settings-set', { reset: true })
      if (!res?.ok) {
        throw new Error(res?.error?.message ?? 'Failed to reset settings')
      }
      if (gen !== mutationGeneration) return
      const payload = res.value as BetterSettingsPayload
      state = {
        ...state,
        saving: false,
        loaded: true,
        payload,
        config: { ...payload.config },
        error: undefined,
      }
    } catch (err: unknown) {
      if (gen !== mutationGeneration) return
      state = {
        ...state,
        saving: false,
        config: prevConfig,
        error: err instanceof Error ? err.message : String(err),
      }
    } finally {
      emit()
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    load,
    applyPatch,
    reset,
  }
}

function createChevronSvg(React: any) {
  const h = React.createElement
  return h('svg', {
    viewBox: '0 0 16 16',
    width: 14,
    height: 14,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }, h('path', { d: 'M4 6l4 4 4-4' }))
}

export function createBetterSettingsPanel(
  React: any,
  store: BetterSettingsStore,
  getCopy: () => BetterClientCopy,
  subscribeLocale?: (listener: () => void) => () => void,
) {
  const h = React.createElement
  const { useCallback, useEffect, useState } = React

  function BetterSettingsForm(props: { readonly isPluginPage: boolean }) {
    const copy = getCopy()
    const [tick, setTick] = useState(0)
    const [customField, setCustomField] = useState(null as 'model' | 'briefModel' | null)
    const [customText, setCustomText] = useState('')

    useEffect(() => {
      const bump = () => {
        setTick((v: number) => v + 1)
      }
      const unsubscribeStore = store.subscribe(bump)
      const unsubscribeLocale = subscribeLocale?.(bump)
      void store.load(true)
      return () => {
        unsubscribeStore()
        unsubscribeLocale?.()
      }
    }, [])

    const snapshot = store.getState()
    const models = snapshot.payload?.models ?? []
    const groups = groupModelsByProvider(models)
    const config = snapshot.config

    const promptEffortInfo = resolveEffortChoices(config.model, models, config.reasoningEffort)
    const briefEffortInfo = resolveEffortChoices(config.briefModel ?? config.model, models, config.briefReasoningEffort)

    const onReset = useCallback(() => {
      setCustomField(null)
      setCustomText('')
      void store.reset()
    }, [])

    const renderSelectControl = (opts: {
      readonly testId: 'model' | 'briefModel' | 'reasoningEffort' | 'briefReasoningEffort'
      readonly value: string
      readonly ariaLabel: string
      readonly disabled?: boolean
      readonly children: any
      readonly onChange: (val: string) => void
    }) => {
      return h('div', { className: 'dsh-better-select-wrap' },
        h('select', {
          className: 'dsh-better-select',
          'data-dsh-better-field': opts.testId,
          'aria-label': opts.ariaLabel,
          value: opts.value,
          disabled: opts.disabled,
          onChange: (event: any) => {
            opts.onChange(String(event?.target?.value ?? ''))
          },
        }, opts.children),
        h('span', { className: 'dsh-better-select-chevron' }, createChevronSvg(React)),
      )
    }

    const renderCustomInput = (field: 'model' | 'briefModel') => {
      if (customField !== field) return null
      const commitCustom = () => {
        const val = normalizeClientNullable(customText)
        setCustomField(null)
        setCustomText('')
        if (val !== null) {
          void store.applyPatch(field === 'model' ? { model: val } : { briefModel: val })
        }
      }
      return h('div', { className: 'dsh-better-custom-box' },
        h('input', {
          type: 'text',
          className: 'dsh-better-custom-input',
          'data-dsh-better-field': `${field}-custom`,
          placeholder: 'provider/model',
          value: customText,
          onChange: (event: any) => {
            setCustomText(String(event?.target?.value ?? ''))
          },
          onKeyDown: (event: any) => {
            if (event?.key === 'Enter') {
              event.preventDefault?.()
              commitCustom()
            } else if (event?.key === 'Escape') {
              setCustomField(null)
              setCustomText('')
            }
          },
        }),
        h('button', {
          type: 'button',
          className: 'dsh-better-inline-btn dsh-better-inline-btn-primary',
          'data-dsh-better-custom-confirm': field,
          onClick: commitCustom,
        }, copy.apply),
        h('button', {
          type: 'button',
          className: 'dsh-better-inline-btn',
          onClick: () => {
            setCustomField(null)
            setCustomText('')
          },
        }, copy.cancel),
      )
    }

    const renderModelOptions = (
      inheritLabel: string,
      savedValue: string | null,
    ) => {
      const inCatalog = savedValue !== null && models.some(m => m.value === savedValue)
      return [
        h('option', { key: '__inherit__', value: '' }, inheritLabel),
        !inCatalog && savedValue !== null
          ? h('option', { key: `saved:${savedValue}`, value: savedValue }, savedValue)
          : null,
        ...groups.map(group =>
          h('optgroup', { key: group.provider, label: group.providerName },
            group.items.map(item =>
              h('option', { key: item.value, value: item.value },
                `${item.modelName}${item.badge ? ` · ${item.badge}` : ''}`),
            ),
          ),
        ),
        h('option', { key: '__custom__', value: '__custom__' },
          copy.customModelOption),
      ]
    }

    const handleModelSelect = (field: 'model' | 'briefModel', val: string) => {
      if (val === '__custom__') {
        const current = field === 'model' ? config.model : config.briefModel
        setCustomText(current ?? '')
        setCustomField(field)
        return
      }
      if (customField === field) {
        setCustomField(null)
        setCustomText('')
      }
      const nextVal = val === '' ? null : val
      void store.applyPatch(field === 'model' ? { model: nextVal } : { briefModel: nextVal })
    }

    return h('div', {
      className: 'dsh-better-settings',
      'data-dsh-better-settings': String(tick),
    },
      h('style', null, SETTINGS_CSS),
      props.isPluginPage
        ? h('h3', { className: 'dsh-better-plugin-heading' }, copy.settingsTitle)
        : null,
      h('div', { className: 'dsh-better-rows' },
        // Row 1: Prompt model
        h('div', { className: 'dsh-better-row' },
          h('div', { className: 'dsh-better-row-text' },
            h('div', { className: 'dsh-better-row-title' }, copy.modelLabel),
            h('div', { className: 'dsh-better-row-desc' }, copy.modelDesc),
            renderCustomInput('model'),
          ),
          h('div', { className: 'dsh-better-row-control' },
            renderSelectControl({
              testId: 'model',
              value: config.model ?? '',
              ariaLabel: copy.modelLabel,
              children: renderModelOptions(copy.inheritChat, config.model),
              onChange: val => handleModelSelect('model', val),
            }),
          ),
        ),

        // Row 2: Reasoning effort
        h('div', { className: 'dsh-better-row' },
          h('div', { className: 'dsh-better-row-text' },
            h('div', { className: 'dsh-better-row-title' }, copy.reasoningEffortLabel),
            promptEffortInfo.modelHasNoEfforts
              ? h('div', { className: 'dsh-better-row-desc' }, copy.noReasoningLevels)
              : null,
          ),
          h('div', { className: 'dsh-better-row-control' },
            renderSelectControl({
              testId: 'reasoningEffort',
              value: config.reasoningEffort ?? '',
              ariaLabel: copy.reasoningEffortLabel,
              disabled: promptEffortInfo.modelHasNoEfforts && config.reasoningEffort === null,
              children: [
                h('option', { key: '__default__', value: '' }, copy.defaultEffort),
                h('option', { key: '__inherit__', value: 'inherit' }, copy.inheritChat),
                ...promptEffortInfo.efforts.map(eff =>
                  h('option', { key: eff.id, value: eff.id }, eff.name),
                ),
              ],
              onChange: (val) => {
                void store.applyPatch({ reasoningEffort: val === '' ? null : val })
              },
            }),
          ),
        ),

        // Row 3: Subagent brief check toggle (DSH native capsule Switch)
        h('div', { className: 'dsh-better-row' },
          h('div', { className: 'dsh-better-row-text' },
            h('div', { className: 'dsh-better-row-title' }, copy.subagentCheckLabel),
            h('div', { className: 'dsh-better-row-desc' }, copy.subagentCheckDesc),
          ),
          h('div', { className: 'dsh-better-row-control' },
            h('button', {
              type: 'button',
              role: 'switch',
              'aria-checked': config.checkSubagents,
              'aria-label': copy.subagentCheckLabel,
              'data-dsh-better-field': 'checkSubagents',
              className: 'dsh-better-switch',
              onClick: () => {
                void store.applyPatch({ checkSubagents: !config.checkSubagents })
              },
            }, h('span', { className: 'dsh-better-switch-thumb' })),
          ),
        ),

        // Row 4: Subagent brief model (hidden when disabled)
        config.checkSubagents
          ? h('div', { className: 'dsh-better-row' },
              h('div', { className: 'dsh-better-row-text' },
                h('div', { className: 'dsh-better-row-title' }, copy.briefModelLabel),
                renderCustomInput('briefModel'),
              ),
              h('div', { className: 'dsh-better-row-control' },
                renderSelectControl({
                  testId: 'briefModel',
                  value: config.briefModel ?? '',
                  ariaLabel: copy.briefModelLabel,
                  children: renderModelOptions(copy.sameAsAbove, config.briefModel),
                  onChange: val => handleModelSelect('briefModel', val),
                }),
              ),
            )
          : null,

        // Row 5: Subagent brief reasoning effort (hidden when disabled)
        config.checkSubagents
          ? h('div', { className: 'dsh-better-row' },
              h('div', { className: 'dsh-better-row-text' },
                h('div', { className: 'dsh-better-row-title' }, copy.briefEffortLabel),
              ),
              h('div', { className: 'dsh-better-row-control' },
                renderSelectControl({
                  testId: 'briefReasoningEffort',
                  value: config.briefReasoningEffort ?? '',
                  ariaLabel: copy.briefEffortLabel,
                  disabled: briefEffortInfo.modelHasNoEfforts && config.briefReasoningEffort === null,
                  children: [
                    h('option', { key: '__same__', value: '' }, copy.sameAsAbove),
                    h('option', { key: '__inherit__', value: 'inherit' }, copy.inheritChat),
                    ...briefEffortInfo.efforts.map(eff =>
                      h('option', { key: eff.id, value: eff.id }, eff.name),
                    ),
                  ],
                  onChange: (val) => {
                    void store.applyPatch({ briefReasoningEffort: val === '' ? null : val })
                  },
                }),
              ),
            )
          : null,
      ),

      snapshot.error
        ? h('div', { className: 'dsh-better-error', role: 'alert' }, snapshot.error)
        : null,

      !isDefaultConfig(config)
        ? h('div', { className: 'dsh-better-footer' },
            h('button', {
              type: 'button',
              className: 'dsh-better-reset-btn',
              'data-dsh-better-reset': 'true',
              onClick: onReset,
            }, copy.resetDefaults))
        : null,
    )
  }

  return function BetterSettingsPanel(props: any) {
    if (props?.view === 'summary') {
      const copy = getCopy()
      const config = store.getState().config
      return config.model ?? copy.inheritChat
    }
    return h(BetterSettingsForm, { isPluginPage: props?.view === 'page' })
  }
}
