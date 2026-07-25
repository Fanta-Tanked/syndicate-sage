import { describe, expect, it } from 'vitest'
import { MEMBERS, MEMBER_TIERS, REWARDS, REWARD_TIERS, rewardWeight, SHEET_RECOMMENDED, TIERS } from './data'
import { SHAPE_TARGETS } from './planner'
import { DIVISIONS, type Division, type MemberName } from './types'

describe('3.29 reward grid', () => {
  it('has a reward and a known band for every member and division', () => {
    for (const member of MEMBERS) {
      expect(TIERS).toContain(MEMBER_TIERS[member])
      for (const division of DIVISIONS) {
        expect(REWARDS[member][division]).toMatch(/\S/)
        expect(TIERS).toContain(REWARD_TIERS[member][division])
      }
    }
  })

  it('keeps the 3.29 standouts on the sheet', () => {
    expect(REWARD_TIERS['It That Fled'].Transportation).toBe('Great')
    expect(REWARD_TIERS.Leo.Research).toBe('Great')
    expect(REWARD_TIERS.Vorici.Intervention).toBe('Great')
    expect(REWARDS.Vagan.Transportation).toBe('Trarthan Scarabs')
    expect(REWARD_TIERS.Elreon.Fortification).toBe('Worst')
  })
})

describe('suggested layout', () => {
  it('fills exactly the 2/5/2/5 shape', () => {
    for (const division of DIVISIONS) {
      const count = Object.values(SHEET_RECOMMENDED).filter(value => value === division).length
      expect(count).toBe(SHAPE_TARGETS[division])
    }
    expect(Object.keys(SHEET_RECOMMENDED)).toHaveLength(14)
  })

  it('puts the best available rewards in the two farmed houses', () => {
    const farmed: Division[] = ['Transportation', 'Research']
    for (const [member, division] of Object.entries(SHEET_RECOMMENDED)) {
      if (!division || !farmed.includes(division)) continue
      expect(REWARD_TIERS[member as MemberName][division]).not.toBe('Average')
    }
  })

  it('seats each Great cell in the house that can actually deliver it', () => {
    expect(SHEET_RECOMMENDED['It That Fled']).toBe('Transportation')
    expect(SHEET_RECOMMENDED.Leo).toBe('Research')
    for (const member of ['Guff', 'Haku', 'Vorici'] as const) {
      expect(SHEET_RECOMMENDED[member]).toBe('Intervention')
    }
  })

  it('benches the members with nothing better than an Average cell', () => {
    const benched = MEMBERS.filter(member => !SHEET_RECOMMENDED[member])
    for (const member of benched) {
      const best = Math.max(...DIVISIONS.map(division => rewardWeight(member, division)))
      expect(best).toBeLessThanOrEqual(rewardWeight('Aisling', 'Transportation'))
    }
  })
})
