import { formatElapsedClock, insertIntoDraft } from '../shared/draft.ts'
import type { BetterRunSnapshot, DepthStage, ToolBadge } from '../shared/types.ts'
import { type BetterClientCopy, getClientCopy, LOCALE_DICTS } from './locales.ts'
import { createBetterSettingsPanel, createBetterSettingsStore } from './settings-panel.ts'

interface WindowModuleLoader {
  load(spec: {
    readonly id: string
    factory(require: (id: string) => any): {
      readonly inject: readonly string[]
      apply(ctx: any): void
    }
  }): void
}

declare global {
  interface Window {
    __ModuleLoader__?: WindowModuleLoader
  }
}

const PACKAGE_NAME = '@agi-fans/dsh-better'
const RPC_CHANNEL = '/api'
const STAGE_ORDER: readonly DepthStage[] = ['explore', 'surface', 'deepen', 'sharpen']

type TrackerSnapshot = BetterRunSnapshot & { readonly optimistic?: boolean }

interface SessionTrackerState {
  readonly snapshot: TrackerSnapshot | null
  readonly fetchedAt: number
  readonly cancelling: boolean
  readonly fastSignal: boolean
}

function filledMeterCells(snapshot: TrackerSnapshot): number {
  switch (snapshot.stage) {
    case 'explore':
      return snapshot.doneTools > 0 ? 2 : 1
    case 'surface':
      return 3
    case 'deepen':
      return snapshot.streamingChars >= 160 ? 5 : 4
    case 'sharpen':
      return 6
  }
}

function truncateLine(text: string, maxChars = 110): string {
  const single = text.replace(/\s+/g, ' ').trim()
  if (single.length <= maxChars) return single
  return `${single.slice(0, maxChars - 1)}…`
}

function hasOpenOverlay(): boolean {
  if (typeof document === 'undefined') return false
  return document.querySelector('[role="dialog"], [role="menu"], [role="listbox"], [data-modal], [data-approval-key]') !== null
}

function resolveSessionId(props: any): string | undefined {
  return props?.sessionId ?? props?.session?.sessionId ?? props?.session?.id
}

function extractBetterCommandDraft(rawDraft: unknown): string | undefined {
  if (typeof rawDraft !== 'string') return undefined
  const match = /^\s*\/better\s+([\s\S]+)$/i.exec(rawDraft)
  if (!match) return undefined
  const trimmed = match[1]!.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function createSpinnerSvg(React: any, size: number, color = 'currentColor') {
  const h = React.createElement
  return h('svg', {
    viewBox: '0 0 16 16',
    width: size,
    height: size,
    'aria-hidden': true,
    style: {
      display: 'block',
      flexShrink: 0,
      animation: 'dsh-better-spin 0.9s linear infinite',
    },
  },
    h('circle', {
      cx: 8,
      cy: 8,
      r: 5.5,
      fill: 'none',
      stroke: color,
      strokeOpacity: 0.25,
      strokeWidth: 2,
    }),
    h('path', {
      d: 'M8 2.5A5.5 5.5 0 0 1 13.5 8',
      fill: 'none',
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: 'round',
    }),
  )
}

if (typeof window !== 'undefined' && window.__ModuleLoader__) {
  window.__ModuleLoader__.load({
    id: PACKAGE_NAME,
    factory(require) {
      const React = require('react')
      const h = React.createElement
      const { useCallback, useEffect, useRef, useState } = React

      return {
        inject: ['slots', 'connection', 'locale'],
        apply(ctx: any) {
          if (typeof ctx.locale?.register === 'function') {
            ctx.effect?.(() => ctx.locale.register('dsh-better', LOCALE_DICTS))
          }

          const subscribeLocaleChange = (listener: () => void): (() => void) => {
            const unsubs: Array<() => void> = []
            if (typeof ctx.locale?.subscribe === 'function') {
              const u = ctx.locale.subscribe(listener)
              if (typeof u === 'function') unsubs.push(u)
            }
            if (typeof ctx.on === 'function') {
              const u = ctx.on('locale/change', listener)
              if (typeof u === 'function') unsubs.push(u)
            }
            return () => {
              for (const u of unsubs) u()
            }
          }

          function useLocaleCopy(): BetterClientCopy {
            const [, setLocaleTick] = useState(0)
            useEffect(() => subscribeLocaleChange(() => {
              setLocaleTick((v: number) => v + 1)
            }), [])
            return getClientCopy(ctx.locale)
          }

          interface TrackerEntry {
            state: SessionTrackerState
            listeners: Set<() => void>
            ackedRunIds: Set<string>
            consecutiveErrors: number
            lastSubmittedDraft: string
            timer?: ReturnType<typeof setTimeout>
            inFlight?: Promise<TrackerSnapshot | null>
          }

          const trackers = new Map<string, TrackerEntry>()
          let disposed = false

          const getOrCreateEntry = (sessionId: string): TrackerEntry => {
            let entry = trackers.get(sessionId)
            if (!entry) {
              entry = {
                state: { snapshot: null, fetchedAt: 0, cancelling: false, fastSignal: false },
                listeners: new Set(),
                ackedRunIds: new Set(),
                consecutiveErrors: 0,
                lastSubmittedDraft: '',
              }
              trackers.set(sessionId, entry)
            }
            return entry
          }

          const notify = (entry: TrackerEntry): void => {
            for (const listener of entry.listeners) {
              try {
                listener()
              } catch {
                // Keep sibling subscribers alive
              }
            }
          }

          const schedulePoll = (sessionId: string, entry: TrackerEntry): void => {
            if (entry.timer !== undefined) {
              clearTimeout(entry.timer)
              entry.timer = undefined
            }
            if (disposed || entry.listeners.size === 0) return
            const isFast = entry.state.snapshot?.status === 'running' || entry.state.fastSignal
            const delay = isFast ? 160 : 1500
            entry.timer = setTimeout(async () => {
              entry.timer = undefined
              if (disposed || entry.listeners.size === 0) return
              if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
                await fetchStatus(sessionId)
              }
              schedulePoll(sessionId, entry)
            }, delay)
          }

          const fetchStatus = async (sessionId: string): Promise<TrackerSnapshot | null> => {
            if (disposed || !ctx.connection?.rpc?.call) return null
            const entry = getOrCreateEntry(sessionId)
            if (entry.inFlight) return await entry.inFlight

            const req = (async () => {
              let rawError: string | undefined
              try {
                const res = await ctx.connection.rpc.call(RPC_CHANNEL, 'dsh-better/status', { sessionId })
                if (res && res.ok) {
                  entry.consecutiveErrors = 0
                  const rawSnapshot = (res.value ?? null) as BetterRunSnapshot | null
                  const serverSnapshot = rawSnapshot !== null && entry.ackedRunIds.has(rawSnapshot.runId)
                    ? null
                    : rawSnapshot
                  const tick = Date.now()
                  const current = entry.state.snapshot
                  // Keep fresh optimistic state for up to 2s until Host creates record
                  const keepOptimistic =
                    serverSnapshot === null
                    && current?.optimistic === true
                    && tick - current.startedAt < 2000
                  const nextSnapshot: TrackerSnapshot | null = keepOptimistic ? current : serverSnapshot
                  entry.state = {
                    ...entry.state,
                    snapshot: nextSnapshot,
                    fetchedAt: tick,
                    cancelling: nextSnapshot?.status === 'running' ? entry.state.cancelling : false,
                  }
                  notify(entry)
                  return nextSnapshot
                }
                rawError = res?.error?.message ?? 'Host RPC returned an error.'
              } catch (err: unknown) {
                rawError = err instanceof Error ? err.message : String(err)
              }

              entry.consecutiveErrors += 1
              const tick = Date.now()
              const current = entry.state.snapshot
              if (
                rawError !== undefined
                && current?.optimistic === true
                && entry.consecutiveErrors >= 4
                && tick - current.startedAt >= 1500
              ) {
                const activeCopy = getClientCopy(ctx.locale)
                const formattedError = /HTTP (404|405)\b/.test(rawError)
                  ? `${activeCopy.rpcUnavailable} (${rawError})`
                  : rawError
                const failedSnapshot: TrackerSnapshot = {
                  ...current,
                  optimistic: false,
                  status: 'failed',
                  updatedAt: tick,
                  elapsedMs: Math.max(0, tick - current.startedAt),
                  error: formattedError,
                }
                entry.state = {
                  ...entry.state,
                  snapshot: failedSnapshot,
                  fetchedAt: tick,
                  cancelling: false,
                  fastSignal: false,
                }
                notify(entry)
                return failedSnapshot
              }
              return entry.state.snapshot
            })().finally(() => {
              entry.inFlight = undefined
            })

            entry.inFlight = req
            return await req
          }

          const ackRun = async (sessionId: string, runId: string): Promise<void> => {
            const entry = getOrCreateEntry(sessionId)
            entry.ackedRunIds.add(runId)
            if (entry.state.snapshot?.runId === runId) {
              entry.state = { ...entry.state, snapshot: null, fastSignal: false }
              notify(entry)
            }
            if (!ctx.connection?.rpc?.call) return
            try {
              await ctx.connection.rpc.call(RPC_CHANNEL, 'dsh-better/ack', { sessionId, runId })
            } catch {
              // Ignore transient ack failure
            }
          }

          const cancelRun = async (sessionId: string): Promise<void> => {
            const entry = trackers.get(sessionId)
            const snapshot = entry?.state.snapshot
            if (!entry || !snapshot || snapshot.status !== 'running' || !ctx.connection?.rpc?.call) return
            entry.state = { ...entry.state, cancelling: true }
            notify(entry)
            try {
              await ctx.connection.rpc.call(RPC_CHANNEL, 'dsh-better/cancel', {
                sessionId,
                ...(snapshot.optimistic ? {} : { runId: snapshot.runId }),
              })
              await fetchStatus(sessionId)
            } finally {
              entry.state = { ...entry.state, cancelling: false }
              notify(entry)
            }
          }

          const setFastSignal = (sessionId: string, fast: boolean): void => {
            const entry = getOrCreateEntry(sessionId)
            if (entry.state.fastSignal === fast) return
            entry.state = { ...entry.state, fastSignal: fast }
            if (fast) void fetchStatus(sessionId)
            schedulePoll(sessionId, entry)
          }

          const subscribeSession = (sessionId: string, listener: () => void): (() => void) => {
            const entry = getOrCreateEntry(sessionId)
            const first = entry.listeners.size === 0
            entry.listeners.add(listener)
            if (first) {
              void fetchStatus(sessionId)
              schedulePoll(sessionId, entry)
            }
            return () => {
              entry.listeners.delete(listener)
              if (entry.listeners.size === 0 && entry.timer !== undefined) {
                clearTimeout(entry.timer)
                entry.timer = undefined
              }
            }
          }

          if (typeof ctx.on === 'function') {
            ctx.effect?.(() => ctx.on('command/executed', (execSessionId: string, name: string, result: any) => {
              if (!execSessionId) return
              if (name === 'better' && result?.kind === 'success') {
                const entry = getOrCreateEntry(execSessionId)
                const now = Date.now()
                const capturedDraft = entry.lastSubmittedDraft
                entry.lastSubmittedDraft = ''
                entry.consecutiveErrors = 0
                if (entry.state.snapshot?.status !== 'running') {
                  entry.state = {
                    snapshot: {
                      runId: `pending-${now}`,
                      sessionId: execSessionId,
                      sourceDraft: capturedDraft,
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
                      optimistic: true,
                    },
                    fetchedAt: now,
                    cancelling: false,
                    fastSignal: true,
                  }
                  notify(entry)
                }
                void fetchStatus(execSessionId)
                schedulePoll(execSessionId, entry)
              } else if (name === 'better-cancel') {
                void fetchStatus(execSessionId)
              }
            }), 'dsh-better:command-executed')
          }

          ctx.effect?.(() => () => {
            disposed = true
            for (const entry of trackers.values()) {
              if (entry.timer !== undefined) clearTimeout(entry.timer)
              entry.listeners.clear()
            }
            trackers.clear()
          }, 'dsh-better:trackers')

          function useSessionTracker(sessionId: string | undefined): SessionTrackerState {
            const [, setVersion] = useState(0)

            useEffect(() => {
              if (!sessionId) return undefined
              return subscribeSession(sessionId, () => {
                setVersion((v: number) => v + 1)
              })
            }, [sessionId])

            if (!sessionId) {
              return { snapshot: null, fetchedAt: 0, cancelling: false, fastSignal: false }
            }
            return getOrCreateEntry(sessionId).state
          }

          function BetterComposerDock(props: any) {
            const liveInput = typeof props.useInput === 'function'
              ? props.useInput((s: any) => s)
              : props.input
            const sessionId = resolveSessionId(props)
            const inputActions = props.inputActions

            const trackerState = useSessionTracker(sessionId)
            const { snapshot, fetchedAt, cancelling } = trackerState

            const [nowMs, setNowMs] = useState(() => Date.now())
            const [notice, setNotice] = useState(null as {
              readonly kind: 'success' | 'info'
              readonly text: string
              readonly restoreText?: string
            } | null)

            const handledRunIdRef = useRef(null as string | null)
            const prevPhaseRef = useRef(liveInput?.phase as string | undefined)
            const copy = useLocaleCopy()

            // Capture `/better <draft>` text so optimistic status shows and backs up sourceDraft.
            useEffect(() => {
              if (!sessionId) return
              const extracted = extractBetterCommandDraft(liveInput?.draft)
              if (extracted !== undefined) {
                getOrCreateEntry(sessionId).lastSubmittedDraft = extracted
              }
            }, [sessionId, liveInput?.draft])

            // Trigger fast poll when user submits a slash command.
            useEffect(() => {
              if (!sessionId) return
              const prev = prevPhaseRef.current
              const current = liveInput?.phase
              prevPhaseRef.current = current
              const fast = current === 'submitting' || current === 'adjudicating'
              setFastSignal(sessionId, fast)
              if (prev === 'submitting' && current === 'plain') {
                void fetchStatus(sessionId)
              }
            }, [sessionId, liveInput?.phase])

            // Smooth elapsed timer while running.
            useEffect(() => {
              if (snapshot?.status !== 'running') return undefined
              setNowMs(Date.now())
              const timer = setInterval(() => {
                setNowMs(Date.now())
              }, 250)
              return () => clearInterval(timer)
            }, [snapshot?.status, snapshot?.runId])

            // Auto-dismiss transient success/cancelled notice (longer when restore is offered).
            useEffect(() => {
              if (!notice) return undefined
              const timeoutMs = notice.restoreText ? 8000 : 4000
              const timer = setTimeout(() => {
                setNotice(null)
              }, timeoutMs)
              return () => clearTimeout(timer)
            }, [notice])

            // Hand off completed / cancelled / failed state once composer settles into 'plain'.
            useEffect(() => {
              if (!sessionId || !snapshot || snapshot.optimistic) return
              if (handledRunIdRef.current === snapshot.runId) return

              if (snapshot.status === 'completed' && snapshot.improvedPrompt) {
                if (liveInput?.phase !== 'plain') return
                handledRunIdRef.current = snapshot.runId
                const existingDraft = liveInput?.draft ?? ''
                const merged = insertIntoDraft(snapshot.improvedPrompt, existingDraft)
                inputActions?.setDraft?.(merged)
                inputActions?.persistDraft?.()
                const restoreText = snapshot.sourceDraft
                  ? insertIntoDraft(snapshot.sourceDraft, existingDraft)
                  : undefined
                setNotice({ kind: 'success', text: copy.done, restoreText })
                void ackRun(sessionId, snapshot.runId)
                return
              }

              if (snapshot.status === 'cancelled') {
                if (liveInput?.phase !== 'plain') return
                handledRunIdRef.current = snapshot.runId
                const existingDraft = liveInput?.draft ?? ''
                let text = copy.cancelled
                if (existingDraft.trim().length === 0 && snapshot.sourceDraft.trim().length > 0) {
                  inputActions?.setDraft?.(snapshot.sourceDraft)
                  inputActions?.persistDraft?.()
                  text = copy.cancelledRestored
                }
                setNotice({ kind: 'info', text })
                void ackRun(sessionId, snapshot.runId)
                return
              }

              if (snapshot.status === 'failed' && liveInput?.phase === 'plain') {
                handledRunIdRef.current = snapshot.runId
                const existingDraft = liveInput?.draft ?? ''
                if (existingDraft.trim().length === 0 && snapshot.sourceDraft.trim().length > 0) {
                  inputActions?.setDraft?.(snapshot.sourceDraft)
                  inputActions?.persistDraft?.()
                }
              }
            }, [
              sessionId,
              snapshot,
              liveInput?.phase,
              liveInput?.draft,
              inputActions,
              copy.done,
              copy.cancelled,
              copy.cancelledRestored,
            ])

            // Escape cancels active helper unless an overlay/menu/approval is open.
            useEffect(() => {
              if (!sessionId || snapshot?.status !== 'running' || typeof window === 'undefined') return undefined
              const onKeyDown = (event: KeyboardEvent): void => {
                if (
                  event.key !== 'Escape'
                  || event.repeat
                  || event.isComposing
                  || event.defaultPrevented
                  || event.metaKey
                  || event.ctrlKey
                  || event.altKey
                  || event.shiftKey
                  || hasOpenOverlay()
                ) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                void cancelRun(sessionId)
              }
              window.addEventListener('keydown', onKeyDown, true)
              return () => window.removeEventListener('keydown', onKeyDown, true)
            }, [sessionId, snapshot?.status])

            const onCancelClick = useCallback(() => {
              if (sessionId) void cancelRun(sessionId)
            }, [sessionId])

            if (!snapshot && !notice) return null

            const outerStyle = {
              width: 'min(100%, var(--dsh-composer-card-max-width, 760px))',
              margin: '0 auto',
              padding: '0 var(--dsh-composer-side-clearance, 0px) 8px',
              boxSizing: 'border-box' as const,
            }

            const keyframesStyle = h('style', null, `
              @keyframes dsh-better-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes dsh-better-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
            `)

            if (!snapshot && notice) {
              return h('div', { style: outerStyle, 'data-dsh-better-dock': 'notice', role: 'status' },
                keyframesStyle,
                h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.25))',
                    backgroundColor: 'var(--dsw-alias-surface-secondary, rgba(127, 127, 127, 0.08))',
                    color: 'var(--dsw-alias-text-primary, inherit)',
                    fontSize: '12px',
                  },
                },
                  h('span', { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 } },
                    h('span', {
                      style: {
                        width: '7px',
                        height: '7px',
                        borderRadius: '999px',
                        flexShrink: 0,
                        backgroundColor: notice.kind === 'success'
                          ? 'var(--dsw-alias-status-success, #22c55e)'
                          : 'var(--dsw-alias-text-secondary, #888)',
                      },
                    }),
                    h('span', null, notice.text),
                  ),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 } },
                    notice.restoreText
                      ? h('button', {
                          type: 'button',
                          onClick: () => {
                            inputActions?.setDraft?.(notice.restoreText!)
                            inputActions?.persistDraft?.()
                            setNotice({ kind: 'info', text: copy.restored })
                          },
                          style: {
                            border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.3))',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: 'var(--dsw-alias-text-primary, inherit)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '2px 8px',
                          },
                        }, copy.restore)
                      : null,
                    h('button', {
                      type: 'button',
                      onClick: () => setNotice(null),
                      style: {
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--dsw-alias-text-secondary, inherit)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '2px 6px',
                      },
                    }, copy.dismiss),
                  ),
                ),
              )
            }

            const openSettingsPage = (): void => {
              const pluginNav = ctx.get?.('pluginNavigation')
              if (typeof pluginNav?.openBundle === 'function') {
                pluginNav.openBundle(PACKAGE_NAME)
              }
            }
            const canOpenSettings = typeof ctx.get?.('pluginNavigation')?.openBundle === 'function'

            if (snapshot && snapshot.status === 'failed') {
              return h('div', { style: outerStyle, 'data-dsh-better-dock': 'failed', role: 'alert' },
                keyframesStyle,
                h('div', {
                  style: {
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: '4px',
                    padding: '9px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--dsw-alias-status-danger, rgba(239, 68, 68, 0.5))',
                    backgroundColor: 'var(--dsw-alias-surface-secondary, rgba(239, 68, 68, 0.08))',
                    color: 'var(--dsw-alias-text-primary, inherit)',
                    fontSize: '12px',
                  },
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
                    h('span', { style: { fontWeight: 600, color: 'var(--dsw-alias-status-danger, #ef4444)' } },
                      `${copy.failedPrefix} ${snapshot.error ?? ''}`,
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 } },
                      canOpenSettings
                        ? h('button', {
                            type: 'button',
                            onClick: openSettingsPage,
                            style: {
                              border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.3))',
                              borderRadius: '6px',
                              background: 'transparent',
                              color: 'var(--dsw-alias-text-primary, inherit)',
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '2px 8px',
                            },
                          }, copy.settingsButton)
                        : null,
                      h('button', {
                        type: 'button',
                        onClick: () => {
                          if (sessionId) {
                            handledRunIdRef.current = snapshot.runId
                            void ackRun(sessionId, snapshot.runId)
                          }
                        },
                        style: {
                          border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.3))',
                          borderRadius: '6px',
                          background: 'transparent',
                          color: 'var(--dsw-alias-text-primary, inherit)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          padding: '2px 8px',
                        },
                      }, copy.dismiss),
                    ),
                  ),
                  snapshot.fallbackPath
                    ? h('div', {
                        style: {
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: '11px',
                          color: 'var(--dsw-alias-text-secondary, inherit)',
                          wordBreak: 'break-all' as const,
                        },
                      }, `${copy.fallbackPrefix} ${snapshot.fallbackPath}`)
                    : null,
                ),
              )
            }

            if (!snapshot) return null

            const liveElapsedMs = snapshot.status === 'running'
              ? snapshot.elapsedMs + Math.max(0, nowMs - fetchedAt)
              : snapshot.elapsedMs
            const filled = filledMeterCells(snapshot)
            const activeStageIdx = STAGE_ORDER.indexOf(snapshot.stage)
            const visibleTools = snapshot.tools.slice(-6)

            return h('div', { style: outerStyle, 'data-dsh-better-dock': 'running', role: 'status', 'aria-live': 'polite' },
              keyframesStyle,
              h('div', {
                style: {
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: '7px',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--dsw-alias-accent-primary, rgba(59, 130, 246, 0.5))',
                  backgroundColor: 'var(--dsw-alias-surface-secondary, rgba(59, 130, 246, 0.06))',
                  color: 'var(--dsw-alias-text-primary, inherit)',
                  fontSize: '12px',
                },
              },
                // Row 1: Spinner + /better badge + 6-cell meter + 4 Depth stages + elapsed + Esc Cancel
                h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap' as const,
                  },
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const } },
                    h('span', {
                      style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontWeight: 600,
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--dsw-alias-accent-primary, #2563eb)',
                        color: '#ffffff',
                      },
                    },
                      createSpinnerSvg(React, 11, '#ffffff'),
                      h('span', null, copy.badge),
                    ),
                    h('span', {
                      'aria-label': `progress ${filled}/6`,
                      style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      },
                    },
                      Array.from({ length: 6 }, (_, idx) =>
                        h('span', {
                          key: idx,
                          style: {
                            width: '8px',
                            height: '8px',
                            borderRadius: '2px',
                            backgroundColor: idx < filled
                              ? 'var(--dsw-alias-accent-primary, #3b82f6)'
                              : 'var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.28))',
                            animation: idx === filled - 1 ? 'dsh-better-pulse 1.2s ease-in-out infinite' : undefined,
                          },
                        }),
                      ),
                    ),
                    h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } },
                      STAGE_ORDER.map((stage, idx) => {
                        const isActive = idx === activeStageIdx
                        const isPast = idx < activeStageIdx
                        return h('span', {
                          key: stage,
                          style: {
                            fontSize: '11px',
                            fontWeight: isActive ? 600 : 400,
                            padding: '1px 7px',
                            borderRadius: '999px',
                            color: isActive
                              ? 'var(--dsw-alias-text-primary, inherit)'
                              : 'var(--dsw-alias-text-secondary, rgba(127, 127, 127, 0.85))',
                            backgroundColor: isActive
                              ? 'var(--dsw-alias-surface-primary, rgba(127, 127, 127, 0.16))'
                              : 'transparent',
                            opacity: isPast || isActive ? 1 : 0.65,
                          },
                        }, copy.stages[stage])
                      }),
                    ),
                  ),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    snapshot.modelLabel
                      ? h('span', {
                          'data-dsh-better-model': snapshot.modelLabel,
                          style: {
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: '11px',
                            padding: '1px 7px',
                            borderRadius: '999px',
                            border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.25))',
                            color: 'var(--dsw-alias-text-secondary, inherit)',
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' as const,
                          },
                          title: snapshot.modelLabel,
                        }, snapshot.modelLabel)
                      : null,
                    canOpenSettings
                      ? h('button', {
                          type: 'button',
                          onClick: openSettingsPage,
                          style: {
                            border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.35))',
                            borderRadius: '6px',
                            backgroundColor: 'var(--dsw-alias-surface-primary, transparent)',
                            color: 'var(--dsw-alias-text-secondary, inherit)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '2px 7px',
                          },
                        }, copy.settingsButton)
                      : null,
                    h('span', {
                      style: {
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '11px',
                        color: 'var(--dsw-alias-text-secondary, inherit)',
                      },
                    }, formatElapsedClock(liveElapsedMs)),
                    h('button', {
                      type: 'button',
                      disabled: cancelling,
                      onClick: onCancelClick,
                      style: {
                        border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.35))',
                        borderRadius: '6px',
                        backgroundColor: 'var(--dsw-alias-surface-primary, transparent)',
                        color: 'var(--dsw-alias-text-primary, inherit)',
                        cursor: cancelling ? 'default' : 'pointer',
                        fontSize: '11px',
                        padding: '2px 8px',
                      },
                    }, cancelling ? copy.cancelling : `Esc · ${copy.cancel}`),
                  ),
                ),
                // Row 2: Source draft being deepened
                snapshot.sourceDraft
                  ? h('div', {
                      style: {
                        fontSize: '11px',
                        color: 'var(--dsw-alias-text-secondary, inherit)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      },
                    }, `${copy.deepening}: “${truncateLine(snapshot.sourceDraft, 96)}”`)
                  : null,
                // Row 3: Live tool badges & streaming output preview
                h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap' as const,
                    minHeight: '20px',
                    color: 'var(--dsw-alias-text-secondary, inherit)',
                    fontSize: '11px',
                  },
                },
                  visibleTools.length > 0
                    ? visibleTools.map((tool: ToolBadge) =>
                        h('span', {
                          key: tool.id,
                          style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '1px 7px',
                            borderRadius: '999px',
                            border: '1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.22))',
                            backgroundColor: 'var(--dsw-alias-surface-primary, rgba(127, 127, 127, 0.08))',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: '11px',
                          },
                        },
                          h('span', {
                            style: {
                              width: '6px',
                              height: '6px',
                              borderRadius: '999px',
                              backgroundColor: tool.state === 'error'
                                ? 'var(--dsw-alias-status-danger, #ef4444)'
                                : tool.state === 'done'
                                  ? 'var(--dsw-alias-status-success, #22c55e)'
                                  : 'var(--dsw-alias-accent-primary, #3b82f6)',
                            },
                          }),
                          h('span', null, tool.label),
                        ),
                      )
                    : h('span', null, snapshot.optimistic ? copy.starting : copy.readingRepo),
                  snapshot.streamingChars > 0
                    ? h('span', {
                        style: {
                          marginLeft: 'auto',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: '11px',
                          color: 'var(--dsw-alias-text-primary, inherit)',
                        },
                      }, `${copy.drafting} (${snapshot.streamingChars} ${copy.chars})`)
                    : null,
                ),
                snapshot.streamingPreview
                  ? h('div', {
                      style: {
                        padding: '5px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--dsw-alias-surface-primary, rgba(127, 127, 127, 0.1))',
                        color: 'var(--dsw-alias-text-secondary, inherit)',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      },
                    }, snapshot.streamingPreview)
                  : null,
              ),
            )
          }

          function BetterToolbarPill(props: any) {
            const sessionId = resolveSessionId(props)
            const trackerState = useSessionTracker(sessionId)
            const { snapshot, fetchedAt, cancelling } = trackerState
            const [nowMs, setNowMs] = useState(() => Date.now())
            const copy = useLocaleCopy()

            useEffect(() => {
              if (snapshot?.status !== 'running') return undefined
              setNowMs(Date.now())
              const timer = setInterval(() => { setNowMs(Date.now()) }, 500)
              return () => clearInterval(timer)
            }, [snapshot?.status, snapshot?.runId])

            if (!snapshot || snapshot.status !== 'running') return null

            const liveElapsedMs = snapshot.elapsedMs + Math.max(0, nowMs - fetchedAt)
            return h('button', {
              type: 'button',
              disabled: cancelling,
              onClick: () => { if (sessionId) void cancelRun(sessionId) },
              title: `${copy.badge} · ${copy.stages[snapshot.stage]} (${copy.cancel})`,
              'data-dsh-better-pill': 'running',
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid var(--dsw-alias-accent-primary, rgba(59, 130, 246, 0.45))',
                backgroundColor: 'var(--dsw-alias-surface-secondary, rgba(59, 130, 246, 0.1))',
                color: 'var(--dsw-alias-text-primary, inherit)',
                fontSize: '11px',
                lineHeight: '1.4',
                cursor: cancelling ? 'default' : 'pointer',
              },
            },
              createSpinnerSvg(React, 10, 'var(--dsw-alias-accent-primary, #3b82f6)'),
              h('span', { style: { fontWeight: 600 } }, copy.stages[snapshot.stage]),
              h('span', {
                style: {
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: 'var(--dsw-alias-text-secondary, inherit)',
                },
              }, formatElapsedClock(liveElapsedMs)),
            )
          }

          const settingsStore = createBetterSettingsStore(ctx, () => getClientCopy(ctx.locale))
          const BetterSettingsPanel = createBetterSettingsPanel(
            React,
            settingsStore,
            () => getClientCopy(ctx.locale),
            subscribeLocaleChange,
          )

          function BetterSectionIcon(iconProps: any) {
            const size = typeof iconProps?.size === 'number' ? iconProps.size : 16
            return h('svg', {
              viewBox: '0 0 16 16',
              width: size,
              height: size,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': true,
            },
              h('path', { d: 'M8 2.2 9.4 6l3.8 1.4-3.8 1.4L8 12.6 6.6 8.8 2.8 7.4 6.6 6 8 2.2Z' }),
            )
          }

          ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
            name: 'conversation.input.dock',
            id: 'dsh-better',
            order: 15,
            locale: 'dsh-better',
          }, BetterComposerDock))

          ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
            name: 'conversation.input.left',
            id: 'dsh-better-pill',
            order: 50,
            locale: 'dsh-better',
          }, BetterToolbarPill))

          ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section',
            id: 'dsh-better',
            order: 55,
            label: () => getClientCopy(ctx.locale).settingsTitle,
            locale: 'dsh-better',
          }, BetterSettingsPanel))

          ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
            name: 'settings.section.icon',
            id: 'dsh-better',
            locale: 'dsh-better',
          }, BetterSectionIcon))

          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: PACKAGE_NAME,
            locale: 'dsh-better',
          }, BetterSettingsPanel))

          ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
            name: 'plugins.row.config',
            key: `${PACKAGE_NAME}#dsh-better`,
            locale: 'dsh-better',
          }, BetterSettingsPanel))
        },
      }
    },
  })
}
