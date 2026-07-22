import { DIVISIONS, type BoardState, type Division, type EncounterOption, type GoalWeights, type MemberState, type ScoredOption } from './types'

export const SHAPE_TARGETS: Record<Division, number> = { Transportation: 2, Fortification: 5, Research: 2, Intervention: 5 }
const SMALL_HOUSES = new Set<Division>(['Transportation', 'Research'])

export function shapeUtility(board: BoardState): number {
  return DIVISIONS.reduce((score, division) => {
    const count = board.members.filter(member => member.division === division).length
    const difference = Math.abs(count - SHAPE_TARGETS[division])
    return score - difference * 2.5
  }, 0)
}

export function relationshipUtility(board: BoardState): number {
  const byName = new Map(board.members.map(member => [member.name, member]))
  let score = (board.relationships ?? []).reduce((total, relationship) => {
    const a = byName.get(relationship.a), b = byName.get(relationship.b)
    if (!a || !b || !DIVISIONS.includes(a.division as never) || !DIVISIONS.includes(b.division as never)) return total
    const crossesGroups = SMALL_HOUSES.has(a.division as Division) !== SMALL_HOUSES.has(b.division as Division)
    if (crossesGroups) return total + (relationship.status === 'rival' ? 2.25 : .75)
    return total - (relationship.status === 'rival' ? 2.25 : 1.25)
  }, 0)
  const activeSmall = board.members.filter(member => DIVISIONS.includes(member.division as never) && SMALL_HOUSES.has(member.division as Division))
  for (const member of activeSmall) {
    const crossLinks = (board.relationships ?? []).filter(edge => {
      if (edge.a !== member.name && edge.b !== member.name) return false
      const other = byName.get(edge.a === member.name ? edge.b : edge.a)
      return other && DIVISIONS.includes(other.division as never) && !SMALL_HOUSES.has(other.division as Division)
    })
    if (!crossLinks.length) score -= 1.5
    else score += Math.min(1.5, crossLinks.length * .25)
  }
  return score
}

const clampRank = (rank: number): 0 | 1 | 2 | 3 => Math.max(0, Math.min(3, rank)) as 0 | 1 | 2 | 3

export function applyOption(board: BoardState, option: EncounterOption): BoardState {
  const members = board.members.map(member => ({ ...member }))
  let relationships = [...(board.relationships ?? [])]
  const intelligence = { Transportation: 0, Fortification: 0, Research: 0, Intervention: 0, ...(board.intelligence ?? {}) }
  const actor = members.find(member => member.name === option.actor)
  const target = members.find(member => member.name === option.target)

  if (actor) {
    if (option.kind === 'execute') {
      actor.rank = clampRank(actor.rank + 1)
      if (actor.division === 'Unassigned' && option.destination && DIVISIONS.includes(option.destination as never)) {
        actor.division = option.destination
      }
    } else if (option.kind === 'interrogate') {
      const wasLeader = actor.leader
      actor.leader = false
      actor.imprisonedTurns = 3
      actor.interrogationOrder = Math.max(0, ...members.map(member => member.interrogationOrder ?? 0)) + 1
      const prisoners = members.filter(member => (member.imprisonedTurns ?? 0) > 0).sort((a, b) => (a.interrogationOrder ?? 0) - (b.interrogationOrder ?? 0))
      if (prisoners.length > 3) {
        const released = prisoners[0]
        released.imprisonedTurns = 0; released.rank = clampRank(released.rank - 1); released.interrogationOrder = undefined
        if (released.rank === 0) released.division = 'Unassigned'
      }
      if (wasLeader && DIVISIONS.includes(actor.division as never)) {
        const replacement = members.filter(member => member.name !== actor.name && member.division === actor.division && !(member.imprisonedTurns ?? 0)).sort((a, b) => b.rank - a.rank)[0]
        if (replacement) replacement.leader = true
      }
    } else if (option.kind === 'move' && option.destination) {
      actor.division = option.destination
      if (option.destination === 'Unassigned') actor.rank = 0
      else if (actor.rank === 0) actor.rank = 1
    } else if (option.kind === 'remove') {
      actor.division = 'Unassigned'
      actor.rank = 0
      actor.leader = false
    }
    if (option.actorRankDelta) actor.rank = clampRank(actor.rank + option.actorRankDelta)
  }

  if (option.kind === 'swap' && actor && target) {
    const division = actor.division
    actor.division = target.division
    target.division = division
  }
  if (target && option.targetRankDelta) target.rank = clampRank(target.rank + option.targetRankDelta)
  if (option.kind === 'relationship' && actor && target && option.relationshipStatus) {
    relationships = relationships.filter(edge => !((edge.a === actor.name && edge.b === target.name) || (edge.a === target.name && edge.b === actor.name)))
    if (option.relationshipStatus !== 'neutral') relationships.push({ a: actor.name, b: target.name, status: option.relationshipStatus })
  }
  if (option.kind === 'intelligence' && option.destination && DIVISIONS.includes(option.destination as never)) {
    const division = option.destination as Division
    intelligence[division] = Math.min(100, intelligence[division] + Math.max(0, option.intelligenceDelta ?? 0))
  }
  return { ...board, members, relationships, intelligence, updatedAt: Date.now() }
}

export function advanceEncounter(board: BoardState): BoardState {
  const members = board.members.map(member => ({ ...member }))
  const intelligence = { Transportation: 0, Fortification: 0, Research: 0, Intervention: 0, ...(board.intelligence ?? {}) }
  for (const prisoner of members.filter(member => (member.imprisonedTurns ?? 0) > 0)) {
    if (DIVISIONS.includes(prisoner.division as never)) intelligence[prisoner.division as Division] = Math.min(100, intelligence[prisoner.division as Division] + Math.max(1, prisoner.rank))
    prisoner.imprisonedTurns = Math.max(0, (prisoner.imprisonedTurns ?? 0) - 1) as MemberState['imprisonedTurns']
    if (prisoner.imprisonedTurns === 0) {
      prisoner.rank = clampRank(prisoner.rank - 1)
      if (prisoner.rank === 0) prisoner.division = 'Unassigned'
      prisoner.interrogationOrder = undefined
    }
  }
  return { ...board, members, intelligence, updatedAt: Date.now() }
}

export function boardUtility(board: BoardState, goals: GoalWeights): number {
  const rewardValue = board.members.reduce((total, member) => {
    if (!DIVISIONS.includes(member.division as never)) return total
    const weight = goals[member.name]?.[member.division as keyof typeof goals[typeof member.name]] ?? 0
    const effectiveRank = (member.imprisonedTurns ?? 0) > 0 ? Math.max(0, member.rank - 1) : member.rank
    const rankValue = effectiveRank === 3 ? 1.35 : effectiveRank === 2 ? 1 : effectiveRank === 1 ? 0.6 : 0
    const leaderBonus = member.leader ? 0.15 : 0
    return total + weight * (rankValue + leaderBonus)
  }, 0)
  const strategic = board.strategy?.enforceShape === false ? 0 : shapeUtility(board) + relationshipUtility(board)
  const runDivisions = board.strategy?.runDivisions ?? ['Transportation', 'Research']
  const intelligenceValue = runDivisions.reduce((total, division) => total + Math.min(100, board.intelligence?.[division] ?? 0) / 100, 0)
  return rewardValue + strategic + intelligenceValue
}

export function boardOutlook(board: BoardState, goals: GoalWeights): string[] {
  const messages: string[] = []
  const wrongCounts = DIVISIONS.filter(division => board.members.filter(member => member.division === division).length !== SHAPE_TARGETS[division])
  if (wrongCounts.length) messages.push(`${wrongCounts.length} division${wrongCounts.length > 1 ? 's are' : ' is'} still outside the 2/5/2/5 target.`)
  const badLinks = (board.relationships ?? []).filter(edge => {
    const a = board.members.find(member => member.name === edge.a), b = board.members.find(member => member.name === edge.b)
    return a && b && DIVISIONS.includes(a.division as never) && DIVISIONS.includes(b.division as never) && SMALL_HOUSES.has(a.division as Division) === SMALL_HOUSES.has(b.division as Division)
  }).length
  if (badLinks) messages.push(`${badLinks} same-group relationship${badLinks > 1 ? 's need' : ' needs'} clearing.`)
  const misplaced = board.members.filter(member => DIVISIONS.includes(member.division as never) && Object.values(goals[member.name] ?? {}).some(Boolean) && !(goals[member.name]?.[member.division as Division] ?? 0)).length
  if (misplaced) messages.push(`${misplaced} selected reward member${misplaced > 1 ? 's are' : ' is'} in the wrong division.`)
  const prisoners = board.members.filter(member => (member.imprisonedTurns ?? 0) > 0).length
  if (prisoners) messages.push(`${prisoners}/3 interrogation slots occupied.`)
  if (!messages.length) messages.push('The board is structurally ready; prioritize rank and safehouse timing.')
  return messages
}

export function scoreOptions(board: BoardState, goals: GoalWeights, options: EncounterOption[]): ScoredOption[] {
  const before = boardUtility(board, goals)
  return options.map(option => {
    const projected = applyOption(board, option)
    const actorBefore = board.members.find(m => m.name === option.actor)
    const actorAfter = projected.members.find(m => m.name === option.actor)
    const targetBefore = board.members.find(m => m.name === option.target)
    const scoreDelta = boardUtility(projected, goals) - before
    let score = scoreDelta * 10
    const reasons: string[] = []

    const shapeBefore = shapeUtility(board), shapeAfter = shapeUtility(projected)
    const relationshipsBefore = relationshipUtility(board), relationshipsAfter = relationshipUtility(projected)
    const actorDivision = actorBefore && DIVISIONS.includes(actorBefore.division as never) ? actorBefore.division as Division : undefined

    if (scoreDelta > 0.01) reasons.push(`Improves your target-board value by ${scoreDelta.toFixed(1)}.`)
    if (scoreDelta < -0.01) reasons.push(`Moves the board away from your targets by ${Math.abs(scoreDelta).toFixed(1)}.`)
    if (shapeAfter > shapeBefore) reasons.push('Moves the division counts closer to the 2/5/2/5 shape.')
    if (shapeAfter < shapeBefore) reasons.push('Damages the 2/5/2/5 division shape.')
    if (relationshipsAfter > relationshipsBefore) reasons.push('Improves the cross-group relationship pattern.')
    if (relationshipsAfter < relationshipsBefore) reasons.push('Creates or preserves an inefficient same-group relationship.')
    if (option.kind === 'interrogate' && actorDivision && (board.intelligence?.[actorDivision] ?? 0) >= 100) reasons.push(`${actorDivision} is already ready; its interrogation intelligence would be wasted until you run it.`)
    if (option.kind === 'release') {
      score -= 0.15
      reasons.push('Preserves the current board with no positioning progress.')
    }
    if (option.kind === 'interrogate' && actorBefore) {
      const wantedHere = DIVISIONS.includes(actorBefore.division as never)
        ? (goals[actorBefore.name]?.[actorBefore.division as never] ?? 0) : 0
      if (wantedHere > 0) reasons.push(`Costs ${actorBefore.name} a rank in a wanted division.`)
      else reasons.push(`${actorBefore.name} is misplaced, so losing a rank helps unassign them.`)
      if (wantedHere === 0) score += actorBefore.rank === 1 ? 4 : 1.5
    }
    if (option.kind === 'execute' && actorAfter) {
      const wantedHere = DIVISIONS.includes(actorAfter.division as never)
        ? (goals[actorAfter.name]?.[actorAfter.division as never] ?? 0) : 0
      if (wantedHere > 0) {
        score += 3
        reasons.push(`Raises ${actorAfter.name} toward rank 3 in a wanted division.`)
      } else {
        score -= 1
        reasons.push(`Adds rank to ${actorAfter.name} without advancing a selected reward.`)
      }
    }
    if ((option.kind === 'swap' || option.kind === 'move') && scoreDelta > 0) {
      reasons.push('Direct positioning actions are usually the fastest route to the target setup.')
    }
    if (option.kind === 'remove') {
      const hadGoal = actorBefore ? Object.values(goals[actorBefore.name] ?? {}).some(Boolean) : false
      score += hadGoal ? -5 : 2
      reasons.push(hadGoal ? 'Removes a member you selected as a target.' : 'Creates a slot for a more useful missing member.')
    }
    if (targetBefore && option.targetRankDelta && option.targetRankDelta < 0) {
      reasons.push(`${targetBefore.name} loses rank as part of this outcome.`)
    }
    if (!reasons.length) reasons.push(option.detail || 'No meaningful target-board change detected.')
    return { ...option, score, reasons, projected, outlook: boardOutlook(projected, goals) }
  }).sort((a, b) => b.score - a.score)
}

export function makeBasicOptions(actor: MemberState, encounterDivision: MemberState['division']): EncounterOption[] {
  return [
    { id: crypto.randomUUID(), label: 'Interrogate', detail: 'Gain intelligence over three encounters; lose one rank on release.', kind: 'interrogate', actor: actor.name },
    { id: crypto.randomUUID(), label: 'Release', detail: 'Take the default loot and leave the board unchanged.', kind: 'release', actor: actor.name },
  ]
}
