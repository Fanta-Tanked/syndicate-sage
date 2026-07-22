# Syndicate Sage

A local-first Path of Exile Betrayal board assistant. Enter your board, select the safehouse rewards you want, then compare the exact options offered after an encounter.

## Run it

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Use `npm test` for the planner tests and `npm run build` for a production bundle.

## Workflow

1. Enter each member's division, rank, leadership, and prisoner status, or start from the suggested 2/5/2/5 layout and correct it.
2. Select the member/division rewards you want, or load the supplied spreadsheet's suggested setup.
3. Enter safehouse intelligence, the divisions you intend to farm, and red/green relationships. The board draws those relationships and flags same-group links.
4. Pick a defeated member, add the exact special outcome offered, and confirm the recommended choice.
5. Resolve every defeated reinforcement before pressing **Finish encounter**. Prison turns and intelligence advance once at that point.

The current board, targets, fifty automatic history points, and up to twenty named snapshots are stored only in browser local storage. The toolbar supports undo/redo and portable JSON backup/restore. No account or API key is used.

## Planner model

- Distinguishes assigned, unassigned, absent, and interrogated members.
- Retains a prisoner's division, rank, countdown, and interrogation order; a fourth prisoner forces out the oldest.
- Scores the Transportation/Fortification/Research/Intervention `2/5/2/5` shape.
- Rewards Rival links between the T/R two-member group and F/I five-member group, treats Trusted as setup progress, and penalizes same-group links.
- Includes selected rewards, projected post-prison rank, leaders, safehouse intelligence, farm-house preferences, roster health, and structural cleanup in recommendations.
- Shows the remaining structural work after each proposed choice instead of presenting only an immediate score.

## Data

Reward descriptions and the suggested layout are transcribed from the spreadsheet specified for this project:

https://docs.google.com/spreadsheets/d/1fIs8sdvgZG7iVouPdtFkbRx5kv55_xVja8l19yubyRU/edit?gid=1814105689#gid=1814105689

This is an unofficial fan tool and is not affiliated with Grinding Gear Games.
