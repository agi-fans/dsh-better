export type DepthStage = 'explore' | 'surface' | 'deepen' | 'sharpen'

export type BetterRunStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export type ToolBadgeState = 'running' | 'done' | 'error'

export interface ToolBadge {
  readonly id: string
  readonly name: string
  readonly label: string
  readonly state: ToolBadgeState
}

export interface BetterRunSnapshot {
  readonly runId: string
  readonly sessionId: string
  readonly sourceDraft: string
  readonly status: BetterRunStatus
  readonly stage: DepthStage
  readonly startedAt: number
  readonly updatedAt: number
  readonly elapsedMs: number
  readonly turn: number
  readonly tools: readonly ToolBadge[]
  readonly activeTools: number
  readonly doneTools: number
  readonly streamingChars: number
  readonly modelLabel?: string
  readonly streamingPreview?: string
  readonly improvedPrompt?: string
  readonly error?: string
  readonly fallbackPath?: string
  readonly warning?: string
}

export interface BetterPluginConfig {
  readonly model?: string | null
  readonly reasoningEffort?: string | null
  readonly briefModel?: string | null
  readonly briefReasoningEffort?: string | null
  readonly checkSubagents?: boolean
}

export interface BetterReasoningEffortOption {
  readonly id: string
  readonly name: string
  readonly description?: string
}

export interface BetterModelOption {
  readonly provider: string
  readonly providerName: string
  readonly model: string
  readonly modelName: string
  readonly value: string
  readonly description?: string
  readonly badge?: string
  readonly reasoningEfforts: readonly BetterReasoningEffortOption[]
  readonly defaultReasoningEffort?: string
}

export interface BetterProviderFailure {
  readonly id: string
  readonly name: string
  readonly message: string
}

export interface BetterSettingsPayload {
  readonly config: Required<BetterPluginConfig>
  readonly models: readonly BetterModelOption[]
  readonly providerFailures: readonly BetterProviderFailure[]
  readonly persistedPath?: string
  readonly writable: boolean
}
