import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  clampReasoningEffort,
  computeDepthStage,
  extractStreamingPreview,
  helperToolGuard,
  insertIntoDraft,
  matchBriefMark,
  matchSupportedReasoningEffort,
  normalizeReasoningEffort,
  parseCheckedBrief,
  parseImproved,
  parseReasoningEffortSetting,
  resolveModelSelection,
  shortPath,
  toolLabel,
  writeFallbackReply,
} from '../src/core/better.ts'

test('parseImproved and parseCheckedBrief extract final non-empty tagged block', () => {
  assert.equal(parseImproved('Thinking...\n<improved-prompt>\nFix src/a.ts\n</improved-prompt>'), 'Fix src/a.ts')
  assert.equal(parseImproved('<improved-prompt>old</improved-prompt>\n<improved-prompt>\nfinal\n</improved-prompt>'), 'final')
  assert.equal(parseImproved('no tags here'), undefined)
  assert.equal(parseImproved('<improved-prompt>   </improved-prompt>'), undefined)

  assert.equal(parseCheckedBrief('notes\n<checked-brief>Updated brief</checked-brief>'), 'Updated brief')
  assert.equal(parseCheckedBrief('<checked-brief>unclosed'), undefined)
})

test('matchBriefMark detects leading /better opt-in only', () => {
  assert.deepEqual(matchBriefMark('/better inspect auth'), { matched: true, brief: 'inspect auth' })
  assert.deepEqual(matchBriefMark('  /BETTER\n  multiline brief '), { matched: true, brief: 'multiline brief' })
  assert.deepEqual(matchBriefMark('/better'), { matched: true, brief: '' })
  assert.deepEqual(matchBriefMark('please run /better later'), { matched: false, brief: 'please run /better later' })
})

test('insertIntoDraft places improved prompt above existing draft cleanly', () => {
  assert.equal(insertIntoDraft('New prompt', ''), 'New prompt')
  assert.equal(insertIntoDraft('  New prompt  ', '   '), 'New prompt')
  assert.equal(insertIntoDraft('New prompt', 'extra note'), 'New prompt\n\nextra note')
})

test('toolLabel formats DSH read-only tools concisely', () => {
  assert.equal(toolLabel('read', { file_path: '/repo/packages/core/agent/index.ts' }), 'read agent/index.ts')
  assert.equal(toolLabel('read_image', { path: 'docs/preview.png' }), 'read_image docs/preview.png')
  assert.equal(toolLabel('grep', { pattern: 'startActivation', path: 'packages/subagent' }), 'grep startActivation subagent')
  assert.equal(toolLabel('glob', { pattern: '**/*.ts' }), 'glob **/*.ts')
  assert.equal(toolLabel('lsp', { operation: 'findReferences', file_path: 'src/index.ts' }), 'lsp:findReferences src/index.ts')
  assert.equal(toolLabel('web_search', { queries: ['deepseek harness rpc'] }), 'search deepseek harness rpc')
  assert.equal(toolLabel('web_fetch', { url: 'https://example.com/docs/api' }), 'fetch example.com/docs/api')
  assert.equal(toolLabel('working_directory', {}), 'cwd')
  assert.ok(shortPath('/very/long/nested/directory/structure/file.ts', 20).length <= 20)
})

test('helperToolGuard allows read-only tools including run_code and denies mutating/shell/cua/subagent tools', () => {
  for (const allowed of ['read', 'read_image', 'grep', 'glob', 'lsp', 'run_code', 'web_search', 'web_fetch', 'read_mcp_resource']) {
    assert.equal(helperToolGuard(allowed), undefined, `${allowed} should be allowed`)
  }
  for (const denied of ['edit', 'write', 'apply_patch', 'str_replace_editor', 'working_directory', 'bash', 'pwsh', 'cua_run_code', 'subagent', 'subagent_fork', 'present', 'ask_user_question', 'unknown_mutator']) {
    const reason = helperToolGuard(denied)
    assert.equal(typeof reason, 'string', `${denied} should be denied`)
    assert.ok(reason!.includes(denied))
  }
})

test('computeDepthStage and resolveModelSelection map progress and overrides cleanly', () => {
  assert.equal(computeDepthStage({ activeTools: 1, doneTools: 0, completedTurnCount: 0, streamingChars: 0 }), 'explore')
  assert.equal(computeDepthStage({ activeTools: 0, doneTools: 3, completedTurnCount: 1, streamingChars: 0 }), 'surface')
  assert.equal(computeDepthStage({ activeTools: 0, doneTools: 3, completedTurnCount: 2, streamingChars: 80 }), 'deepen')
  assert.equal(computeDepthStage({ activeTools: 0, doneTools: 3, completedTurnCount: 2, streamingChars: 350 }), 'sharpen')

  assert.equal(resolveModelSelection(null), undefined)
  assert.equal(resolveModelSelection('   '), undefined)
  assert.equal(resolveModelSelection('inherit'), undefined)
  assert.equal(resolveModelSelection('DEFAULT'), undefined)
  assert.equal(resolveModelSelection('auto'), undefined)
  assert.deepEqual(resolveModelSelection('deepseek-chat'), { model: 'deepseek-chat' })
  assert.deepEqual(resolveModelSelection('deepseek-official/deepseek-reasoner'), {
    provider: 'deepseek-official',
    model: 'deepseek-reasoner',
  })

  assert.equal(normalizeReasoningEffort(null), undefined)
  assert.equal(normalizeReasoningEffort('inherit'), undefined)
  assert.equal(normalizeReasoningEffort(' high '), 'high')

  assert.deepEqual(parseReasoningEffortSetting(null), { mode: 'default' })
  assert.deepEqual(parseReasoningEffortSetting('   '), { mode: 'default' })
  assert.deepEqual(parseReasoningEffortSetting('default'), { mode: 'default' })
  assert.deepEqual(parseReasoningEffortSetting('AUTO'), { mode: 'default' })
  assert.deepEqual(parseReasoningEffortSetting('inherit'), { mode: 'inherit' })
  assert.deepEqual(parseReasoningEffortSetting(' high '), { mode: 'explicit', effort: 'high' })

  assert.equal(clampReasoningEffort('max'), 'low')
  assert.equal(clampReasoningEffort('high'), 'low')
  assert.equal(clampReasoningEffort('medium'), 'low')
  assert.equal(clampReasoningEffort('low'), 'low')
  assert.equal(clampReasoningEffort('minimal'), 'minimal')
  assert.equal(clampReasoningEffort('off'), 'off')
  assert.equal(clampReasoningEffort('none'), 'none')
  assert.equal(clampReasoningEffort(undefined), undefined)

  assert.equal(matchSupportedReasoningEffort('high', undefined), undefined)
  assert.equal(matchSupportedReasoningEffort('high', { efforts: [] }), undefined)
  assert.equal(
    matchSupportedReasoningEffort('high', { efforts: [{ id: 'low' }, { id: 'high' }], defaultEffort: 'low' }),
    'high',
  )
  assert.equal(
    matchSupportedReasoningEffort('max', { efforts: [{ id: 'low' }, { id: 'medium' }, { id: 'high' }] }),
    'high',
  )
  assert.equal(
    matchSupportedReasoningEffort('off', { efforts: [{ id: 'none' }, { id: 'low' }] }),
    'none',
  )
  assert.equal(
    matchSupportedReasoningEffort('minimal', { efforts: [{ id: 'medium' }, { id: 'high' }] }),
    'medium',
  )
})

test('writeFallbackReply writes raw text safely inside requested directory', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dsh-better-fallback-'))
  try {
    const filePath = writeFallbackReply('Untagged model output', 'prompt', dir)
    assert.ok(existsSync(filePath))
    assert.equal(readFileSync(filePath, 'utf8'), 'Untagged model output')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('extractStreamingPreview strips wrapper tags and preserves trailing context', () => {
  assert.equal(
    extractStreamingPreview('<improved-prompt>\nRefactor src/host/index.ts\n</improved-prompt>'),
    'Refactor src/host/index.ts',
  )
  const longText = '<improved-prompt>' + 'x'.repeat(300)
  const preview = extractStreamingPreview(longText, 40)
  assert.equal(preview.length, 40)
  assert.ok(preview.startsWith('…'))
})
