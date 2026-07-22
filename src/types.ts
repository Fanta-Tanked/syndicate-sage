export const DIVISIONS = ['Transportation', 'Fortification', 'Research', 'Intervention'] as const
export type Division = typeof DIVISIONS[number]
export type Assignment = Division | 'Unassigned' | 'Absent'

export type MemberName =
  | 'Aisling' | 'Cameria' | 'Elreon' | 'Gravicius' | 'Guff' | 'Haku'
  | 'Hillock' | 'It That Fled' | 'Janus' | 'Jorgin' | 'Korell' | 'Leo'
  | 'Riker' | 'Rin' | 'Tora' | 'Vagan' | 'Vorici'

export interface MemberState {
  name: MemberName
  division: Assignment
  rank: 0 | 1 | 2 | 3
  leader: boolean
  imprisonedTurns?: 0 | 1 | 2 | 3
  interrogationOrder?: number
}

export interface BoardState {
  members: MemberState[]
  relationships?: Relationship[]
  intelligence?: Record<Division, number>
  strategy?: StrategySettings
  updatedAt: number
}

export interface StrategySettings {
  enforceShape: boolean
  runDivisions: Division[]
  preserveReady: boolean
}

export type RelationshipStatus = 'trusted' | 'rival'
export interface Relationship {
  a: MemberName
  b: MemberName
  status: RelationshipStatus
}

export type GoalWeights = Partial<Record<MemberName, Partial<Record<Division, number>>>>

export type ActionKind = 'execute' | 'interrogate' | 'release' | 'move' | 'swap' | 'remove' | 'rank' | 'relationship' | 'intelligence' | 'custom'

export interface EncounterOption {
  id: string
  label: string
  detail: string
  kind: ActionKind
  actor?: MemberName
  target?: MemberName
  destination?: Assignment
  actorRankDelta?: number
  targetRankDelta?: number
  relationshipStatus?: RelationshipStatus | 'neutral'
  intelligenceDelta?: number
}

export interface ScoredOption extends EncounterOption {
  score: number
  reasons: string[]
  projected: BoardState
  outlook?: string[]
}

export interface BoardSnapshot {
  id: string
  label: string
  createdAt: number
  board: BoardState
  goals: GoalWeights
}
