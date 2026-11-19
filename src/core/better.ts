import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { DepthStage } from '../shared/types.ts'
export { insertIntoDraft, formatElapsedClock } from '../shared/draft.ts'

export const IMPROVED_OPEN = '<improved-prompt>'
export const IMPROVED_CLOSE = '</improved-prompt>'
export const BRIEF_OPEN = '<checked-brief>'
export const BRIEF_CLOSE = '</checked-brief>'
export const BRIEF_MARK = '/better'

export const DEPTH_STAGES: readonly DepthStage[] = ['explore', 'surface', 'deepen', 'sharpen']

export const HELPER_READ_ONLY_TOOLS = new Set<string>([
  'read',
  'read_image',
  'grep',
  'glob',
  'lsp',
  'run_code',
  'web_search',
  'web_fetch',
  'list_mcp_resources',
  'list_mcp_resource_templates',
  'read_mcp_resource',
  'session_search',
  'session_event_search',
  'session_trace',
  'session_event_trace',
  'session_event_read',
  'get_goal',
  'job_list',
  'job_output',
  'list_agents',
  'list_subagent_models',
  'schedule_list',
  'schedule_view',
  'team_task_list',
  'team_task_get',
  'terminal_list',
  'terminal_read',
  'user_terminal_list',
  'user_terminal_read',
  'cordis_inspect_list',
  'cordis_inspect_query',
  'timeline_tree',
  'timeline_tasks',
  'timeline_read',
  'skill',
])

export function extractTaggedBlock(raw: string, openTag: string, closeTag: string): string | undefined {
  const start = raw.lastIndexOf(openTag)
  if (start === -1) return undefined
  const contentStart = start + openTag.length
  const end = raw.indexOf(closeTag, contentStart)
  if (end === -1) return undefined
  const body = raw.slice(contentStart, end).trim()
  return body.length > 0 ? body : undefined
}

export function parseImproved(raw: string): string | undefined {
  return extractTaggedBlock(raw, IMPROVED_OPEN, IMPROVED_CLOSE)
}

export function parseCheckedBrief(raw: string): string | undefined {
  return extractTaggedBlock(raw, BRIEF_OPEN, BRIEF_CLOSE)
}

/**
 * Strip `<improved-prompt>` / `</improved-prompt>` wrapper tags from partial
 * streamed output and return a single clean trailing snippet for live preview.
 */
export function extractStreamingPreview(raw: string, maxChars = 220): string {
  const withoutTags = raw
    .replace(/<\/?improved-prompt>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (withoutTags.length <= maxChars) return withoutTags
  return `…${withoutTags.slice(-(maxChars - 1))}`
}

export interface BriefMarkMatch {
  readonly matched: boolean
  readonly brief: string
}

/**
 * Detect whether a subagent prompt begins with the `/better` opt-in marker.
 * Bare `/better` with no body returns `{ matched: true, brief: '' }` so callers
 * can skip or preserve empty invocations cleanly without crashing.
 */
export function matchBriefMark(task: string): BriefMarkMatch {
  const match = /^\s*\/better(?=$|\s)([\s\S]*)$/i.exec(task)
  if (!match) return { matched: false, brief: task }
  return { matched: true, brief: (match[1] ?? '').trim() }
}

export function shortPath(value: string, maxLen = 28): string {
  const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '')
  if (normalized.length <= maxLen) return normalized
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length >= 2) {
    const tail = parts.slice(-2).join('/')
    if (tail.length <= maxLen) return tail
  }
  if (parts.length >= 1) {
    const base = parts[parts.length - 1]!
    if (base.length <= maxLen) return base
  }
  return `…${normalized.slice(-(maxLen - 1))}`
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function stringProp(obj: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  }
  return undefined
}

export function toolLabel(name: string, args: unknown): string {
  const rec = asRecord(args)
  switch (name) {
    case 'read':
    case 'read_image': {
      const target = stringProp(rec, 'file_path', 'path')
      return target ? `${name} ${shortPath(target)}` : name
    }
    case 'grep': {
      const pattern = stringProp(rec, 'pattern')
      const target = stringProp(rec, 'path')
      if (pattern && target) return `grep ${shortPath(pattern, 16)} ${shortPath(target, 16)}`
      if (pattern) return `grep ${shortPath(pattern, 24)}`
      return 'grep'
    }
    case 'glob': {
      const pattern = stringProp(rec, 'pattern')
      return pattern ? `glob ${shortPath(pattern, 24)}` : 'glob'
    }
    case 'lsp': {
      const op = stringProp(rec, 'operation') ?? 'query'
      const target = stringProp(rec, 'file_path', 'path')
      return target ? `lsp:${op} ${shortPath(target, 20)}` : `lsp:${op}`
    }
    case 'web_search': {
      const queries = rec?.['queries']
      const first = Array.isArray(queries) && typeof queries[0] === 'string' ? queries[0].trim() : stringProp(rec, 'query')
      return first ? `search ${shortPath(first, 22)}` : 'web_search'
    }
    case 'web_fetch': {
      const url = stringProp(rec, 'url')
      if (!url) return 'web_fetch'
      const stripped = url.replace(/^https?:\/\//i, '')
      return `fetch ${shortPath(stripped, 24)}`
    }
    case 'working_directory':
      return 'cwd'
    case 'run_code':
      return 'run_code'
    default: {
      const fallbackArg = stringProp(rec, 'file_path', 'path', 'pattern', 'uri', 'name')
      return fallbackArg ? `${name} ${shortPath(fallbackArg, 20)}` : name
    }
  }
}

export interface ProgressSnapshotInput {
  readonly activeTools: number
  readonly doneTools: number
  readonly completedTurnCount: number
  readonly streamingChars: number
}

export function computeDepthStage(input: ProgressSnapshotInput): DepthStage {
  if (input.streamingChars >= 320) return 'sharpen'
  if (input.streamingChars >= 100) return 'deepen'
  if (input.streamingChars > 0) return 'deepen'
  if (input.doneTools >= 3 || input.completedTurnCount >= 2) return 'surface'
  if (input.doneTools > 0 || input.activeTools > 0) return 'explore'
  return 'explore'
}

/**
 * Deterministic read-only guard for the forked helper agent. Denying inside
 * `agent.ctx.tools.guard()` keeps `tools.schemas()` byte-for-byte identical to the
 * parent session so provider prompt caches stay warm.
 */
export function helperToolGuard(toolName: string): string | undefined {
  if (HELPER_READ_ONLY_TOOLS.has(toolName)) return undefined
  return `Tool "${toolName}" is disabled inside the read-only /better helper. Use read, grep, glob, lsp, or read-only inspection tools only.`
}

export interface ModelOverride {
  readonly provider?: string
  readonly model: string
}

const INHERIT_SENTINELS = new Set(['inherit', 'default', 'auto'])

export function isInheritSentinel(value: string): boolean {
  return INHERIT_SENTINELS.has(value.trim().toLowerCase())
}

export function resolveModelSelection(spec: string | null | undefined): ModelOverride | undefined {
  if (typeof spec !== 'string') return undefined
  const trimmed = spec.trim()
  if (trimmed.length === 0 || isInheritSentinel(trimmed)) return undefined
  const slash = trimmed.indexOf('/')
  if (slash > 0 && slash < trimmed.length - 1) {
    return {
      provider: trimmed.slice(0, slash).trim(),
      model: trimmed.slice(slash + 1).trim(),
    }
  }
  return { model: trimmed }
}

export const DEFAULT_HELPER_REASONING_EFFORT = 'low'

export type ReasoningEffortSelection =
  | { readonly mode: 'default' }
  | { readonly mode: 'inherit' }
  | { readonly mode: 'explicit'; readonly effort: string }

export function parseReasoningEffortSetting(spec: string | null | undefined): ReasoningEffortSelection {
  if (typeof spec !== 'string') return { mode: 'default' }
  const trimmed = spec.trim()
  if (trimmed.length === 0) return { mode: 'default' }
  const lower = trimmed.toLowerCase()
  if (lower === 'default' || lower === 'auto') return { mode: 'default' }
  if (lower === 'inherit') return { mode: 'inherit' }
  return { mode: 'explicit', effort: trimmed }
}

export function normalizeReasoningEffort(spec: string | null | undefined): string | undefined {
  if (typeof spec !== 'string') return undefined
  const trimmed = spec.trim()
  if (trimmed.length === 0 || isInheritSentinel(trimmed)) return undefined
  return trimmed
}

const EFFORT_RANK = new Map<string, number>([
  ['none', 0],
  ['off', 0],
  ['minimal', 1],
  ['low', 2],
  ['medium', 3],
  ['high', 4],
  ['xhigh', 5],
  ['max', 6],
])

export function clampReasoningEffort(
  effort: string | undefined,
  maxEffort = DEFAULT_HELPER_REASONING_EFFORT,
): string | undefined {
  if (effort === undefined) return undefined
  const rank = EFFORT_RANK.get(effort.trim().toLowerCase())
  const maxRank = EFFORT_RANK.get(maxEffort.trim().toLowerCase())
  if (rank === undefined || maxRank === undefined) return effort
  return rank <= maxRank ? effort : maxEffort
}

export function matchSupportedReasoningEffort(
  requested: string | undefined,
  reasoning: {
    readonly efforts: readonly { readonly id: string }[]
    readonly defaultEffort?: string
  } | undefined,
): string | undefined {
  if (requested === undefined) return undefined
  if (reasoning === undefined || reasoning.efforts.length === 0) return undefined

  const supported = reasoning.efforts.map(e => e.id)
  if (supported.includes(requested)) return requested

  const lower = requested.toLowerCase()
  const caseMatch = supported.find(id => id.toLowerCase() === lower)
  if (caseMatch !== undefined) return caseMatch

  if (lower === 'off' || lower === 'none') {
    const alias = lower === 'off' ? 'none' : 'off'
    const aliasMatch = supported.find(id => id.toLowerCase() === alias)
    if (aliasMatch !== undefined) return aliasMatch
  }

  const targetRank = EFFORT_RANK.get(lower)
  if (targetRank !== undefined) {
    const ranked = supported
      .map(id => ({ id, rank: EFFORT_RANK.get(id.toLowerCase()) }))
      .filter((item): item is { id: string; rank: number } => item.rank !== undefined)

    if (ranked.length > 0) {
      let bestUnderOrEqual: { id: string; rank: number } | undefined
      let lowestOverall = ranked[0]!
      for (const item of ranked) {
        if (item.rank < lowestOverall.rank) lowestOverall = item
        if (item.rank <= targetRank && (!bestUnderOrEqual || item.rank > bestUnderOrEqual.rank)) {
          bestUnderOrEqual = item
        }
      }
      return (bestUnderOrEqual ?? lowestOverall).id
    }
  }

  return reasoning.defaultEffort ?? supported[0]
}

export function buildHelperUserPrompt(
  helperInstructions: string,
  draft: string,
  hasInheritedHistory: boolean,
): string {
  const contextNote = hasInheritedHistory
    ? 'The conversation history above is from the parent session where the user is about to send this draft. Resolve references and constraints against both that history and the repository.'
    : 'This session has no prior turns yet. Ground everything by inspecting the repository directly.'
  return [
    helperInstructions.trim(),
    '',
    '## Session Context',
    contextNote,
    '',
    '## Raw Prompt Draft',
    draft.trim(),
    '',
    `Output ONLY ${IMPROVED_OPEN}...${IMPROVED_CLOSE} with no text before or after the tags.`,
  ].join('\n')
}

export function buildBriefUserPrompt(
  briefInstructions: string,
  rawBrief: string,
  hasInheritedHistory: boolean,
): string {
  const contextNote = hasInheritedHistory
    ? 'The conversation history above is the parent session delegating this brief to a subagent. Carry forward relevant verified facts, paths, and constraints from that history when the brief omits them.'
    : 'No prior parent turns exist yet. Verify every file, symbol, and test convention directly against the repository.'
  return [
    briefInstructions.trim(),
    '',
    '## Delegation Context',
    contextNote,
    '',
    '## Subagent Brief to Check',
    rawBrief.trim(),
    '',
    `Output ONLY ${BRIEF_OPEN}...${BRIEF_CLOSE} with no text before or after the tags.`,
  ].join('\n')
}

export function writeFallbackReply(
  rawReply: string,
  kind: 'prompt' | 'brief',
  baseDir = path.join(os.tmpdir(), 'dsh-better'),
): string {
  mkdirSync(baseDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const suffix = Math.random().toString(36).slice(2, 8)
  const filePath = path.join(baseDir, `${kind}-reply-${stamp}-${suffix}.md`)
  writeFileSync(filePath, rawReply, 'utf8')
  return filePath
}
