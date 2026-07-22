import { describe, expect, it } from 'vitest'
import { importBackup, migrateBoard } from './storage'

describe('board persistence', () => {
  it('migrates old missing members to Absent and preserves known members', () => {
    const board = migrateBoard({ members: [{ name: 'Haku', division: 'Intervention', rank: 3, leader: true }], updatedAt: 1 })!
    expect(board.members.find(member => member.name === 'Haku')).toMatchObject({ division: 'Intervention', rank: 3, leader: true })
    expect(board.members.find(member => member.name === 'Vorici')).toMatchObject({ division: 'Absent', rank: 0 })
    expect(board.intelligence).toEqual({ Transportation: 0, Fortification: 0, Research: 0, Intervention: 0 })
  })

  it('rejects invalid backup files', () => {
    expect(() => importBackup('{"notABoard":true}')).toThrow(/valid Syndicate Sage board/)
  })
})
