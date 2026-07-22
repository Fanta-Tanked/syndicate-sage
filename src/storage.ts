import { DIVISIONS, type BoardSnapshot, type BoardState, type Division, type GoalWeights, type MemberState } from './types'
import { MEMBERS } from './data'

const BOARD_KEY = 'syndicate-sage-board-v2'
const LEGACY_BOARD_KEY = 'syndicate-sage-board-v1'
const GOALS_KEY = 'syndicate-sage-goals-v1'
const HISTORY_KEY = 'syndicate-sage-history-v1'
const SNAPSHOTS_KEY = 'syndicate-sage-snapshots-v1'

const zeroIntel = (): Record<Division, number> => ({ Transportation: 0, Fortification: 0, Research: 0, Intervention: 0 })

export function migrateBoard(input: unknown): BoardState | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<BoardState> & { members?: Array<Partial<MemberState> & { division?: string }> }
  if (!Array.isArray(raw.members)) return null
  const byName = new Map(raw.members.map(member => [member.name, member]))
  const members: MemberState[] = MEMBERS.map(name => {
    const old = byName.get(name)
    const legacyPrison = (old?.division as string | undefined) === 'Prison'
    const validDivision = [...DIVISIONS, 'Unassigned', 'Absent'].includes(old?.division ?? '')
    const division = (legacyPrison ? 'Unassigned' : validDivision ? old!.division : 'Absent') as MemberState['division']
    const rank = Math.max(0, Math.min(3, Number(old?.rank ?? 0))) as MemberState['rank']
    return {
      name, division, rank: division === 'Absent' ? 0 : rank, leader: Boolean(old?.leader) && DIVISIONS.includes(division as never),
      imprisonedTurns: legacyPrison ? 3 : Math.max(0, Math.min(3, Number(old?.imprisonedTurns ?? 0))) as MemberState['imprisonedTurns'],
      interrogationOrder: old?.interrogationOrder,
    }
  })
  return {
    members,
    relationships: Array.isArray(raw.relationships) ? raw.relationships : [],
    intelligence: { ...zeroIntel(), ...(raw.intelligence ?? {}) },
    strategy: raw.strategy ?? { enforceShape: true, runDivisions: ['Transportation', 'Research'], preserveReady: true },
    updatedAt: Number(raw.updatedAt) || Date.now(),
  }
}

export const loadBoard = (): BoardState | null => {
  try {
    const current = localStorage.getItem(BOARD_KEY)
    const legacy = localStorage.getItem(LEGACY_BOARD_KEY)
    const board = migrateBoard(JSON.parse(current || legacy || 'null'))
    if (board && !current) saveBoard(board)
    return board
  } catch { return null }
}
export const saveBoard = (board: BoardState) => localStorage.setItem(BOARD_KEY, JSON.stringify(board))
export const loadGoals = (): GoalWeights => { try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '{}') } catch { return {} } }
export const saveGoals = (goals: GoalWeights) => localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
export const loadHistory = (): BoardState[] => { try { return (JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as unknown[]).map(migrateBoard).filter(Boolean) as BoardState[] } catch { return [] } }
export const saveHistory = (history: BoardState[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-50)))
export const loadSnapshots = (): BoardSnapshot[] => { try { return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || '[]') } catch { return [] } }
export const saveSnapshots = (snapshots: BoardSnapshot[]) => localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots))

export function exportBackup(board: BoardState, goals: GoalWeights, snapshots: BoardSnapshot[]): string {
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), board, goals, snapshots }, null, 2)
}

export function importBackup(text: string): { board: BoardState; goals: GoalWeights; snapshots: BoardSnapshot[] } {
  const data = JSON.parse(text) as { board?: unknown; goals?: GoalWeights; snapshots?: BoardSnapshot[] }
  const board = migrateBoard(data.board)
  if (!board) throw new Error('This file does not contain a valid Syndicate Sage board.')
  return { board, goals: data.goals ?? {}, snapshots: Array.isArray(data.snapshots) ? data.snapshots : [] }
}
