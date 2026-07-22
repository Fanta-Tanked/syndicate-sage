import { describe, expect, it } from 'vitest'
import { advanceEncounter, applyOption, relationshipUtility, scoreOptions, shapeUtility } from './planner'
import type { BoardState, EncounterOption, GoalWeights, MemberState, Relationship } from './types'

const member = (name: MemberState['name'], division: MemberState['division'], rank: MemberState['rank']): MemberState => ({ name, division, rank, leader: false })
const board = (...members: MemberState[]): BoardState => ({ members, updatedAt: 1 })

describe('Betrayal planner', () => {
  it('prefers executing a wanted correctly-positioned member', () => {
    const state = board(member('Gravicius', 'Transportation', 1))
    const goals: GoalWeights = { Gravicius: { Transportation: 3 } }
    const options: EncounterOption[] = [
      { id: 'execute', label: 'Execute', detail: '', kind: 'execute', actor: 'Gravicius' },
      { id: 'interrogate', label: 'Interrogate', detail: '', kind: 'interrogate', actor: 'Gravicius' },
      { id: 'release', label: 'Release', detail: '', kind: 'release', actor: 'Gravicius' },
    ]
    expect(scoreOptions(state, goals, options)[0].kind).toBe('execute')
  })

  it('prefers moving a member into its selected division', () => {
    const state = board(member('Vorici', 'Research', 2))
    const goals: GoalWeights = { Vorici: { Transportation: 3 } }
    const options: EncounterOption[] = [
      { id: 'move', label: 'Move', detail: '', kind: 'move', actor: 'Vorici', destination: 'Transportation' },
      { id: 'release', label: 'Release', detail: '', kind: 'release', actor: 'Vorici' },
    ]
    expect(scoreOptions(state, goals, options)[0].id).toBe('move')
  })

  it('keeps a prisoner associated until release, then unassigns at rank zero', () => {
    const state = board(member('Haku', 'Research', 1), member('Cameria', 'Intervention', 1))
    let result = applyOption(state, { id: 'i', label: 'Interrogate', detail: '', kind: 'interrogate', actor: 'Haku' })
    expect(result.members[0]).toMatchObject({ rank: 1, division: 'Research', imprisonedTurns: 3 })
    for (let turn = 0; turn < 3; turn++) result = advanceEncounter(result)
    expect(result.members[0]).toMatchObject({ rank: 0, division: 'Unassigned', imprisonedTurns: 0 })
  })

  it('swaps both assignments', () => {
    const state = board(member('Riker', 'Fortification', 2), member('Rin', 'Research', 2))
    const result = applyOption(state, { id: 's', label: 'Swap', detail: '', kind: 'swap', actor: 'Riker', target: 'Rin' })
    expect(result.members.map(m => m.division)).toEqual(['Research', 'Fortification'])
  })

  it('scores the exact 2/5/2/5 shape above a damaged shape', () => {
    const members: MemberState[] = []
    const names = ['Aisling', 'Cameria', 'Elreon', 'Gravicius', 'Guff', 'Haku', 'Hillock', 'It That Fled', 'Janus', 'Jorgin', 'Korell', 'Leo', 'Riker', 'Rin'] as MemberState['name'][]
    const divisions = ['Transportation', 'Transportation', 'Fortification', 'Fortification', 'Fortification', 'Fortification', 'Fortification', 'Research', 'Research', 'Intervention', 'Intervention', 'Intervention', 'Intervention', 'Intervention'] as MemberState['division'][]
    names.forEach((name, index) => members.push(member(name, divisions[index], 1)))
    const correct = board(...members)
    const damaged = applyOption(correct, { id: 'm', label: 'Move', detail: '', kind: 'move', actor: 'Aisling', destination: 'Fortification' })
    expect(shapeUtility(correct)).toBe(0)
    expect(shapeUtility(damaged)).toBeLessThan(shapeUtility(correct))
  })

  it('rewards cross-group rivalries and penalizes relationships inside one group', () => {
    const state = board(member('Gravicius', 'Transportation', 3), member('Haku', 'Intervention', 1), member('Riker', 'Research', 3))
    const cross = { ...state, relationships: [{ a: 'Gravicius', b: 'Haku', status: 'rival' }] as Relationship[] }
    const sameGroup = { ...state, relationships: [{ a: 'Gravicius', b: 'Riker', status: 'rival' }] as Relationship[] }
    expect(relationshipUtility(cross)).toBeGreaterThan(0)
    expect(relationshipUtility(sameGroup)).toBeLessThan(0)
  })

  it('forces the oldest prisoner out when a fourth is added in one encounter', () => {
    let state = board(member('Haku', 'Intervention', 2), member('Cameria', 'Intervention', 2), member('Riker', 'Research', 2), member('Rin', 'Fortification', 2))
    for (const name of ['Haku', 'Cameria', 'Riker', 'Rin'] as MemberState['name'][]) state = applyOption(state, { id: name, label: 'Interrogate', detail: '', kind: 'interrogate', actor: name })
    expect(state.members.find(item => item.name === 'Haku')).toMatchObject({ imprisonedTurns: 0, rank: 1 })
    expect(state.members.filter(item => (item.imprisonedTurns ?? 0) > 0)).toHaveLength(3)
  })

  it('advances all prisoners once and adds intelligence once per encounter', () => {
    let state = board(member('Haku', 'Intervention', 2), member('Riker', 'Research', 1))
    state = applyOption(state, { id: 'h', label: 'Interrogate', detail: '', kind: 'interrogate', actor: 'Haku' })
    state = applyOption(state, { id: 'r', label: 'Interrogate', detail: '', kind: 'interrogate', actor: 'Riker' })
    state = advanceEncounter(state)
    expect(state.intelligence).toMatchObject({ Intervention: 2, Research: 1 })
    expect(state.members.filter(item => (item.imprisonedTurns ?? 0) === 2)).toHaveLength(2)
  })
})
