import type { Division, MemberName } from './types'

export const MEMBERS: MemberName[] = [
  'Aisling', 'Cameria', 'Elreon', 'Gravicius', 'Guff', 'Haku', 'Hillock',
  'It That Fled', 'Janus', 'Jorgin', 'Korell', 'Leo', 'Riker', 'Rin', 'Tora', 'Vagan', 'Vorici',
]

export const REWARDS: Record<MemberName, Record<Division, string>> = {
  Aisling: { Transportation: 'Double Veiled Items', Fortification: 'Veiled Exalt (Crafting Bench)', Research: 'Veiled Chaos (Crafting Bench)', Intervention: 'Torment Scarabs' },
  Cameria: { Transportation: 'Abyss Scarabs', Fortification: 'Jewel (Trapped Chest)', Research: 'Jewel (Crafting Bench)', Intervention: 'Delirium Scarabs' },
  Elreon: { Transportation: 'Fragments', Fortification: 'Corrupted Equipment (Trapped Chest)', Research: 'Tainted Currency (Crafting Bench)', Intervention: 'Beyond Scarabs' },
  Gravicius: { Transportation: 'Stack of Divination Cards', Fortification: 'Divination Card (Trapped Chest)', Research: 'Swap Divination Card', Intervention: 'Divination Scarabs' },
  Guff: { Transportation: 'Misc. Currency', Fortification: 'Rare Equipment (Trapped Chest)', Research: 'Reflecting Mist (Crafting Bench)', Intervention: 'Blight Scarabs' },
  Haku: { Transportation: 'Unique Strongbox', Fortification: 'Domination Scarabs', Research: 'Influence Crafting', Intervention: 'Ambush Scarabs' },
  Hillock: { Transportation: 'Influenced Equipment (Trapped Chest)', Fortification: 'Influenced Equipment (Crafting Bench)', Research: 'Eldritch Implicit Crafting', Intervention: 'Influencing Scarabs' },
  'It That Fled': { Transportation: 'Foulborn Uniques (Trapped Chest)', Fortification: 'Foulborn Breach Ring Craft', Research: 'Breach Ring / Socket Currency Craft', Intervention: 'Breach Scarabs' },
  Janus: { Transportation: 'Gold Piles', Fortification: 'Kalguuran Scarabs', Research: "Cadiro's Offer (Buy Unique)", Intervention: 'Expedition Scarabs' },
  Jorgin: { Transportation: 'Sulphite Scarabs', Fortification: 'Delve Equipment (Trapped Chest)', Research: 'Talisman (Crafting Bench)', Intervention: 'Bestiary Scarabs' },
  Korell: { Transportation: 'Anarchy Scarabs', Fortification: 'Essence Equipment (Trapped Chest)', Research: 'Essences (Crafting Bench)', Intervention: 'Essence Scarabs' },
  Leo: { Transportation: 'Incursion Scarabs', Fortification: 'Corrupted Unique (Trapped Chest)', Research: 'Djinn Vaal Orb (Crafting Bench)', Intervention: 'Ultimatum Scarabs' },
  Riker: { Transportation: 'Unique Items', Fortification: 'Unique Item (Trapped Chest)', Research: 'Ancient Orb (Crafting Bench)', Intervention: 'Titanic Scarabs' },
  Rin: { Transportation: 'Originator Maps', Fortification: 'Unique Map (Trapped Chest)', Research: 'Scarabs (Trapped Chest)', Intervention: 'Cartography Scarabs' },
  Tora: { Transportation: 'Quality Gems / XP Lens', Fortification: 'Gem (Trapped Chest)', Research: 'Gem (Crafting Bench)', Intervention: 'Ritual Scarabs' },
  Vagan: { Transportation: 'Incubators', Fortification: 'Incubator Progress', Research: 'Chaos + Fracture Crafting', Intervention: 'Legion Scarabs' },
  Vorici: { Transportation: 'Stack of Currency', Fortification: 'Chromatic / Jeweller / Fusing Craft', Research: 'Chance / Scour Craft', Intervention: 'Harvest Scarabs' },
}

export const SHEET_RECOMMENDED: Partial<Record<MemberName, Division>> = {
  Gravicius: 'Transportation', Tora: 'Transportation', Rin: 'Fortification', Vorici: 'Fortification',
  Vagan: 'Fortification', Guff: 'Fortification', Korell: 'Fortification', Janus: 'Research',
  Riker: 'Research', Haku: 'Intervention', Leo: 'Intervention', Hillock: 'Intervention',
  Cameria: 'Intervention', Elreon: 'Intervention',
}

export const DIVISION_COLORS: Record<Division, string> = {
  Transportation: '#c89042', Fortification: '#a45442', Research: '#719478', Intervention: '#6b809f',
}
