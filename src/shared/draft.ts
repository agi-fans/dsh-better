/**
 * Place the improved prompt above any draft text typed after `/better` was launched,
 * separated by a blank line so nothing the user wrote is overwritten.
 */
export function insertIntoDraft(improved: string, existingDraft: string): string {
  const cleanImproved = improved.trim()
  if (existingDraft.trim().length === 0) return cleanImproved
  return `${cleanImproved}\n\n${existingDraft}`
}

export function formatElapsedClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
