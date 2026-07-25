import { SHAPE_TARGETS } from './planner'
import { DIVISIONS, type Division, type MemberName } from './types'

/** League the reward grid below was transcribed for. */
export const LEAGUE_VERSION = '3.29'

export const MEMBERS: MemberName[] = [
  'Aisling', 'Cameria', 'Elreon', 'Gravicius', 'Guff', 'Haku', 'Hillock',
  'It That Fled', 'Janus', 'Jorgin', 'Korell', 'Leo', 'Riker', 'Rin', 'Tora', 'Vagan', 'Vorici',
]

/** Cheat-sheet priority bands, best first. */
export const TIERS = ['Great', 'Good', 'Average', 'Worst'] as const
export type Tier = typeof TIERS[number]

/** Planner weight applied to a selected reward at each band. */
export const TIER_WEIGHTS: Record<Tier, number> = { Great: 4, Good: 3, Average: 1.5, Worst: 0.5 }

/** Cheat-sheet band colours. */
export const TIER_COLORS: Record<Tier, string> = { Great: '#1f5f2c', Good: '#876617', Average: '#393946', Worst: '#691c24' }

type Cell = [reward: string, tier: Tier]
const G = 'Great', g = 'Good', a = 'Average', w = 'Worst'

/**
 * The 3.29 Betrayal reward grid. `tier` is the member's overall band; every cell
 * carries the reward text and its own band, exactly as coloured on the sheet.
 * Order per member: Transportation, Fortification, Research, Intervention.
 */
export const SHEET: Record<MemberName, { tier: Tier; cells: [Cell, Cell, Cell, Cell] }> = {
  Aisling: {
    tier: a,
    cells: [
      ['Double-Veiled Items', a],
      ['Veiled Exalteds on a random item', a],
      ['Veiled Chaos on a random item', a],
      ['Torment Scarabs', a],
    ],
  },
  Cameria: {
    tier: g,
    cells: [
      ['Abyss Scarabs', g],
      ['Jewels (Trapped Chest)', g],
      ['Regular Currency on a random Jewel', g],
      ['Delirium Scarabs', a],
    ],
  },
  Elreon: {
    tier: a,
    cells: [
      ['Map Fragments', a],
      ['Corrupted Items (Trapped Chest)', w],
      ['Tainted Currency on a random Corrupted Item', a],
      ['Beyond Scarabs', a],
    ],
  },
  Gravicius: {
    tier: g,
    cells: [
      ['Full Stack of Divination Cards', g],
      ['Divination Cards (Trapped Chest)', a],
      ['Swap a Divination Card', a],
      ['Divination Scarabs', a],
    ],
  },
  Guff: {
    tier: G,
    cells: [
      ['Random Currency', a],
      ['Rare Items (Trapped Chest)', w],
      ['Reflecting Mist on a random Jewellery', g],
      ['Blight Scarabs', G],
    ],
  },
  Haku: {
    tier: G,
    cells: [
      ['Unique Strongboxes', a],
      ['Domination Scarabs', a],
      ["Hinekora's Locks and Influenced Exalteds on a random item", a],
      ['Ambush Scarabs', G],
    ],
  },
  Hillock: {
    tier: a,
    cells: [
      ['Influenced Item (Trapped Chest)', a],
      ['Influenced Exalteds on a random item', a],
      ['Eldritch Currency on a random item', a],
      ['Influencing Scarabs', a],
    ],
  },
  'It That Fled': {
    tier: G,
    cells: [
      ['Foulborn Uniques (Trapped Chest)', G],
      ['Foulborn Currency on a random Breach Ring', a],
      ['Tainted Socket Currency on a random Corrupted Item', a],
      ['Breach Scarabs', g],
    ],
  },
  Janus: {
    tier: g,
    cells: [
      ['Gold Piles', g],
      ['Kalguuran Scarabs', a],
      ['Uniques for Gold (Cadiro)', g],
      ['Expedition Scarabs', a],
    ],
  },
  Jorgin: {
    tier: g,
    cells: [
      ['Sulphite Scarabs', a],
      ['Delve Items (Trapped Chest)', a],
      ['Regular Currency on a random Talisman', g],
      ['Bestiary Scarabs', a],
    ],
  },
  Korell: {
    tier: a,
    cells: [
      ['Anarchy Scarabs', a],
      ['Essence Items (Trapped Chest)', a],
      ['Essences on a random item', a],
      ['Essence Scarabs', a],
    ],
  },
  Leo: {
    tier: G,
    cells: [
      ['Incursion Scarabs', a],
      ['Corrupted Uniques (Trapped Chest)', a],
      ['Special Corruption on a random Unique', G],
      ['Ultimatum Scarabs', G],
    ],
  },
  Riker: {
    tier: g,
    cells: [
      ['Unique Items', a],
      ['Unique Items (Trapped Chest)', a],
      ['Ancient Orbs on a random Unique', g],
      ['Titanic Scarabs', a],
    ],
  },
  Rin: {
    tier: a,
    cells: [
      ['Originator Influenced Maps', a],
      ['Unique Maps (Trapped Chest)', a],
      ['Scarabs (Trapped Chest)', a],
      ['Cartography Scarabs', a],
    ],
  },
  Tora: {
    tier: a,
    cells: [
      ["Gems with Quality and Facetor's Lenses", a],
      ['All Gem types (Trapped Chest)', a],
      ['Gem Currency on a random gem', a],
      ['Ritual Scarabs', a],
    ],
  },
  Vagan: {
    tier: g,
    cells: [
      ['Trarthan Scarabs', g],
      ['Enshrouded Items (Trapped Chest)', g],
      ['Fracturing Orb on a random item', g],
      ['Legion Scarabs', g],
    ],
  },
  Vorici: {
    tier: G,
    cells: [
      ['Full Stacks of Currency', g],
      ['Reforge sockets / colours / links on your item', a],
      ['Chance and Scouring on your normal Item', a],
      ['Harvest Scarabs', G],
    ],
  },
}

const byDivision = <T,>(pick: (cell: Cell) => T) =>
  Object.fromEntries(MEMBERS.map(member => [
    member,
    Object.fromEntries(DIVISIONS.map((division, index) => [division, pick(SHEET[member].cells[index])])),
  ])) as Record<MemberName, Record<Division, T>>

export const REWARDS: Record<MemberName, Record<Division, string>> = byDivision(cell => cell[0])
export const REWARD_TIERS: Record<MemberName, Record<Division, Tier>> = byDivision(cell => cell[1])
export const MEMBER_TIERS: Record<MemberName, Tier> = Object.fromEntries(
  MEMBERS.map(member => [member, SHEET[member].tier]),
) as Record<MemberName, Tier>

export const rewardWeight = (member: MemberName, division: Division): number =>
  TIER_WEIGHTS[REWARD_TIERS[member][division]]

/**
 * A reward is only reliably farmable where you control the leader, which is the
 * point of the 2/5/2/5 shape: the two-member houses. Five-member houses still
 * prefer a better band over a worse one, but never at the cost of T/R.
 */
const HOUSE_PRIORITY: Record<Division, number> = { Transportation: 1, Fortification: .25, Research: 1, Intervention: .25 }

/**
 * Exact highest-value fill of the 2/5/2/5 shape for the sheet's bands, so a
 * league update to the grid moves the suggested layout with it. Members are
 * considered in roster order and ties keep the first division listed, which
 * makes the result stable rather than merely good.
 */
function bestLayout(): Partial<Record<MemberName, Division>> {
  const slotValue = (member: MemberName, division: Division) => rewardWeight(member, division) * HOUSE_PRIORITY[division]
  const take = (open: number[], slot: number) => open.map((count, index) => index === slot ? count - 1 : count)
  const cache = new Map<string, number>()

  /** Best achievable value placing MEMBERS[index...] into the still-open slots. */
  const best = (index: number, open: number[]): number => {
    const left = open.reduce((total, count) => total + count, 0)
    if (index === MEMBERS.length) return left ? -Infinity : 0
    if (left > MEMBERS.length - index) return -Infinity
    const key = `${index}|${open.join(',')}`
    const cached = cache.get(key)
    if (cached !== undefined) return cached
    let value = best(index + 1, open) // leave this member off the board
    DIVISIONS.forEach((division, slot) => {
      if (!open[slot]) return
      const next = take(open, slot)
      value = Math.max(value, slotValue(MEMBERS[index], division) + best(index + 1, next))
    })
    cache.set(key, value)
    return value
  }

  const layout: Partial<Record<MemberName, Division>> = {}
  let open = DIVISIONS.map(division => SHAPE_TARGETS[division])
  MEMBERS.forEach((member, index) => {
    const target = best(index, open)
    for (const [slot, division] of DIVISIONS.entries()) {
      if (!open[slot]) continue
      const next = take(open, slot)
      if (Math.abs(slotValue(member, division) + best(index + 1, next) - target) > 1e-9) continue
      layout[member] = division
      open = next
      return
    }
  })
  return layout
}

/** Suggested 2/5/2/5 layout derived from the 3.29 bands. */
export const SHEET_RECOMMENDED: Partial<Record<MemberName, Division>> = bestLayout()

export const DIVISION_COLORS: Record<Division, string> = {
  Transportation: '#c89042', Fortification: '#a45442', Research: '#719478', Intervention: '#6b809f',
}
