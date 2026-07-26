# Syndicate Sage

A local-first Path of Exile Betrayal board assistant, using the **3.29** reward grid. Enter your board, select the safehouse rewards you want, then compare the exact options offered after an encounter.

## Run it

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Use `npm test` for the planner tests and `npm run build` for a production bundle.

## Workflow

1. Enter each member's division, rank, leadership, and prisoner status, or start from the suggested 2/5/2/5 layout and correct it.
2. Select the member/division rewards you want, or load the suggested setup. Every cell is shaded with its 3.29 priority band, so the sheet's Great/Good/Average/Worst colours are visible while you choose.
3. Enter safehouse intelligence, the divisions you intend to farm, and red/green relationships. The board draws those relationships and flags same-group links.
4. Pick a defeated member, add the exact special outcome offered, and confirm the recommended choice.
5. Resolve every defeated reinforcement before pressing **Finish encounter**. Prison turns and intelligence advance once at that point.

The current board, targets, fifty automatic history points, and up to twenty named snapshots are stored only in browser local storage. The toolbar supports undo/redo and portable JSON backup/restore. No account or API key is used.

## Planner model

- Distinguishes assigned, unassigned, absent, and interrogated members.
- Retains a prisoner's division, rank, countdown, and interrogation order; a fourth prisoner forces out the oldest.
- The **Interrogating** panel is editable: set a prisoner's remaining encounters (1/2/3), release them with the `×` button, drag them onto a division to pull them out, or drag a division member in to jail them.
- Scores the Transportation/Fortification/Research/Intervention `2/5/2/5` shape.
- Rewards Rival links between the T/R two-member group and F/I five-member group, treats Trusted as setup progress, and penalizes same-group links.
- Includes selected rewards, projected post-prison rank, leaders, safehouse intelligence, farm-house preferences, roster health, and structural cleanup in recommendations.
- Shows the remaining structural work after each proposed choice instead of presenting only an immediate score.

## Data

`src/data.ts` holds the whole 3.29 grid in one table: each member's overall band plus the reward text and priority band of all four of their cells, transcribed from Ayeleth's 3.29 Betrayal cheat sheet.

https://elrincondelexiliado.com/syndicate

Everything else is derived from that table, so a league update only needs the grid edited:

- Selecting a reward weights it by its band (`Great 4`, `Good 3`, `Average 1.5`, `Worst 0.5`), so the planner prefers a Great cell over an Average one at equal rank.
- The suggested layout is the highest-value legal fill of the `2/5/2/5` shape. Transportation and Research count at full value because you control the leader there; Fortification and Intervention count at a quarter, so the two-member houses get first claim on the best rewards and the five-member houses take the rest.

Rin is listed as "Rin Yushu" on the sheet; the app keeps the shorter `Rin` so existing saved boards and backups still load.

This is an unofficial fan tool and is not affiliated with Grinding Gear Games.
