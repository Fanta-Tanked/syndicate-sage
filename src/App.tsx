import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Archive, ArrowRightLeft, Check, ChevronRight, Crown, Download, ExternalLink, Redo2, RotateCcw, Save, Sparkles, Swords, Target, Undo2, Upload, X } from 'lucide-react'
import { DIVISION_COLORS, LEAGUE_VERSION, MEMBER_TIERS, MEMBERS, REWARD_TIERS, REWARDS, rewardWeight, SHEET_RECOMMENDED, TIER_COLORS, TIERS } from './data'
import { advanceEncounter, makeBasicOptions, scoreOptions, setInterrogation, SHAPE_TARGETS } from './planner'
import { exportBackup, importBackup, loadBoard, loadGoals, loadHistory, loadSnapshots, saveBoard, saveGoals, saveHistory, saveSnapshots } from './storage'
import { DIVISIONS, type Assignment, type BoardSnapshot, type BoardState, type Division, type EncounterOption, type GoalWeights, type MemberName, type MemberState } from './types'

const emptyBoard = (): BoardState => ({
  members: MEMBERS.map(name => ({ name, division: 'Absent', rank: 0, leader: false, imprisonedTurns: 0 })),
  relationships: [], intelligence: { Transportation: 0, Fortification: 0, Research: 0, Intervention: 0 },
  strategy: { enforceShape: true, runDivisions: ['Transportation', 'Research'], preserveReady: true },
  updatedAt: Date.now(),
})

const ASSIGNMENTS: Assignment[] = [...DIVISIONS, 'Unassigned', 'Absent']

function Header({ step, setStep }: { step: number; setStep: (step: number) => void }) {
  return <>
    <header className="topbar">
      <button className="brand" onClick={() => setStep(1)} aria-label="Syndicate Sage home">
        <span className="brand-mark"><Swords size={19} /></span>
        <span><strong>Syndicate Sage</strong><small>Betrayal Board Planner · {LEAGUE_VERSION}</small></span>
      </button>
      <nav className="steps" aria-label="Workflow">
        {['Import board', 'Set targets', 'Pick an option'].map((label, index) => {
          const n = index + 1
          return <button key={label} className={step === n ? 'active' : step > n ? 'done' : ''} onClick={() => setStep(n)}>
            <span>{step > n ? <Check size={13} /> : n}</span>{label}
          </button>
        })}
      </nav>
      <a className="source-link" href="https://elrincondelexiliado.com/syndicate" target="_blank" rel="noreferrer">
        {LEAGUE_VERSION} cheat sheet <ExternalLink size={14} />
      </a>
    </header>
  </>
}

function DataTools({ board, goals, history, futureCount, snapshots, onUndo, onRedo, onImport, onSnapshot, onRestore, onRestoreHistory }: { board: BoardState; goals: GoalWeights; history: BoardState[]; futureCount: number; snapshots: BoardSnapshot[]; onUndo: () => void; onRedo: () => void; onImport: (board: BoardState, goals: GoalWeights, snapshots: BoardSnapshot[]) => void; onSnapshot: () => void; onRestore: (snapshot: BoardSnapshot) => void; onRestoreHistory: (board: BoardState) => void }) {
  const importRef = useRef<HTMLInputElement>(null)
  const download = () => {
    const blob = new Blob([exportBackup(board, goals, snapshots)], { type: 'application/json' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `syndicate-sage-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href)
  }
  const readImport = async (file?: File) => {
    if (!file) return
    try { const backup = importBackup(await file.text()); onImport(backup.board, backup.goals, backup.snapshots) }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Could not import that backup.') }
  }
  return <div className="data-tools">
    <button disabled={!history.length} onClick={onUndo} title="Undo last board change"><Undo2 size={14} /> Undo</button>
    <button disabled={!futureCount} onClick={onRedo} title="Redo board change"><Redo2 size={14} /> Redo</button>
    {!!history.length && <select defaultValue="" title="Restore an earlier automatic history point" onChange={event => { const item = history[Number(event.target.value)]; if (item) onRestoreHistory(item); event.target.value = '' }}><option value="" disabled>History ({history.length})…</option>{history.map((item, index) => <option value={index} key={`${item.updatedAt}-${index}`}>{new Date(item.updatedAt).toLocaleTimeString()} · {item.members.filter(member => member.division !== 'Absent').length} roster</option>)}</select>}
    <span />
    <button onClick={onSnapshot}><Archive size={14} /> Snapshot</button>
    {!!snapshots.length && <select defaultValue="" onChange={event => { const snapshot = snapshots.find(item => item.id === event.target.value); if (snapshot) onRestore(snapshot); event.target.value = '' }}><option value="" disabled>Restore snapshot…</option>{snapshots.map(snapshot => <option value={snapshot.id} key={snapshot.id}>{snapshot.label}</option>)}</select>}
    <button onClick={download}><Download size={14} /> Backup</button>
    <button onClick={() => importRef.current?.click()}><Upload size={14} /> Restore</button>
    <input hidden ref={importRef} type="file" accept="application/json,.json" onChange={event => void readImport(event.target.files?.[0])} />
  </div>
}

function UploadStep({ board, onBoard, next }: { board: BoardState; onBoard: (b: BoardState) => void; next: () => void }) {
  const useSuggestedLayout = () => onBoard({
    ...board,
    members: board.members.map(member => {
      const division = SHEET_RECOMMENDED[member.name]
      return { ...member, division: division ?? 'Absent', rank: division ? 1 : 0, leader: false, imprisonedTurns: 0 }
    }), relationships: [], updatedAt: Date.now(),
  })

  return <main className="page">
    <div className="eyebrow"><Target size={14} /> STEP 1 OF 3</div>
    <h1>Set up your board.</h1>
    <p className="lede">Enter each member’s division, rank, leadership, and prisoner status. Your board is saved locally as you edit.</p>
    <div className="section-heading"><div><h2>Current Syndicate board</h2><p>Move absent members into their divisions, then set ranks and leaders to match the board in game.</p></div><div className="review-tools"><button className="secondary" onClick={useSuggestedLayout}><Sparkles size={14} /> Start from suggested 2/5/2/5</button></div></div>
    <div className="review-workspace"><BoardEditor board={board} onChange={onBoard} /></div>
    <div className="actions"><button className="ghost" onClick={() => onBoard(emptyBoard())}><RotateCcw size={16} /> Clear board</button><button className="primary wide" onClick={next}>Set reward targets <ChevronRight size={17} /></button></div>
  </main>
}

function BoardEditor({ board, onChange }: { board: BoardState; onChange: (b: BoardState) => void }) {
  const change = (name: MemberName, patch: Partial<MemberState>) => onChange({
    ...board, members: board.members.map(member => member.name === name ? { ...member, ...patch } : member), updatedAt: Date.now(),
  })
  const toggleLeader = (member: MemberState) => onChange({ ...board, members: board.members.map(item => item.division === member.division ? { ...item, leader: item.name === member.name ? !member.leader : false } : item), updatedAt: Date.now() })
  return <div className="board-editor">
    {ASSIGNMENTS.map(division => {
      const members = board.members.filter(m => m.division === division)
      return <section className={`division division-${division.toLowerCase()}`} key={division}>
        <div className="division-title"><span style={{ background: DIVISION_COLORS[division as Division] ?? '#777' }} />{division}<b>{members.length}</b></div>
        <div className="member-stack">
          {members.map(member => <div className="member-row" key={member.name}>
            <span className="avatar">{member.name.split(' ').map(v => v[0]).slice(0, 2).join('')}</span>
            <div className="member-name"><strong>{member.name}</strong></div>
            <select aria-label={`${member.name} division`} value={member.division} onChange={e => {
              const value = e.target.value as Assignment
              const stays = DIVISIONS.includes(value as never)
              change(member.name, { division: value, rank: stays ? member.rank || 1 : 0, leader: stays ? member.leader : false, imprisonedTurns: stays ? member.imprisonedTurns : 0, interrogationOrder: stays ? member.interrogationOrder : undefined })
            }}>{ASSIGNMENTS.map(v => <option key={v}>{v}</option>)}</select>
            <div className="rank" aria-label={`${member.name} rank`}>
              {[1, 2, 3].map(rank => <button title={`Rank ${rank}`} key={rank} className={member.rank >= rank ? 'on' : ''} onClick={() => change(member.name, { rank: rank as 1 | 2 | 3 })}>◆</button>)}
            </div>
            <button className={`crown ${member.leader ? 'on' : ''}`} disabled={!DIVISIONS.includes(member.division as never)} title="Toggle leader" onClick={() => toggleLeader(member)}><Crown size={15} /></button>
            {(DIVISIONS.includes(member.division as never) || (member.imprisonedTurns ?? 0) > 0) && <button className={`prison-toggle ${(member.imprisonedTurns ?? 0) > 0 ? 'on' : ''}`} title={(member.imprisonedTurns ?? 0) > 0 ? 'Take out of interrogation' : 'Send to interrogation (3 encounters)'} onClick={() => change(member.name, (member.imprisonedTurns ?? 0) > 0 ? { imprisonedTurns: 0, interrogationOrder: undefined } : { imprisonedTurns: 3, leader: false })}>{(member.imprisonedTurns ?? 0) > 0 ? `${member.imprisonedTurns}T` : 'Jail'}</button>}
          </div>)}
          {!members.length && <div className="empty-slot">No members</div>}
        </div>
      </section>
    })}
  </div>
}

function VirtualBoard({ board, goals, onEdit, onBoard }: { board: BoardState; goals: GoalWeights; onEdit: () => void; onBoard: (board: BoardState) => void }) {
  const assigned = board.members.filter(m => DIVISIONS.includes(m.division as never)).length
  const rosterCount = board.members.filter(m => m.division !== 'Absent').length
  const scroller = useRef<HTMLDivElement>(null)
  const dragPan = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 })
  const boardCanvas = useRef<HTMLDivElement>(null)
  const memberNodes = useRef(new Map<MemberName, HTMLDivElement>())
  const [relationshipLines, setRelationshipLines] = useState<Array<{ key: string; x1: number; y1: number; x2: number; y2: number; status: 'trusted' | 'rival' }>>([])
  const [relA, setRelA] = useState<MemberName>(board.members.find(m => DIVISIONS.includes(m.division as never))?.name ?? MEMBERS[0])
  const [relB, setRelB] = useState<MemberName>(MEMBERS.find(m => m !== relA)!)
  const [relStatus, setRelStatus] = useState<'trusted' | 'rival'>('rival')
  const relationships = board.relationships ?? []
  const smallHouses = new Set<Division>(['Transportation', 'Research'])
  const memberByName = new Map(board.members.map(member => [member.name, member]))
  const badRelationships = relationships.filter(edge => {
    const a = memberByName.get(edge.a), b = memberByName.get(edge.b)
    if (!a || !b || !DIVISIONS.includes(a.division as never) || !DIVISIONS.includes(b.division as never)) return false
    return smallHouses.has(a.division as Division) === smallHouses.has(b.division as Division)
  }).length

  useEffect(() => {
    const draw = () => {
      const canvas = boardCanvas.current; if (!canvas) return
      const root = canvas.getBoundingClientRect()
      setRelationshipLines(relationships.flatMap(edge => {
        const a = memberNodes.current.get(edge.a)?.getBoundingClientRect(), b = memberNodes.current.get(edge.b)?.getBoundingClientRect()
        if (!a || !b) return []
        return [{ key: `${edge.a}-${edge.b}`, x1: a.left + a.width / 2 - root.left, y1: a.top + a.height / 2 - root.top, x2: b.left + b.width / 2 - root.left, y2: b.top + b.height / 2 - root.top, status: edge.status }]
      }))
    }
    const timer = window.setTimeout(draw)
    window.addEventListener('resize', draw)
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', draw) }
  }, [board.members, relationships])

  const moveMember = (name: MemberName, division: Assignment) => {
    if (!name) return
    onBoard({ ...board, members: board.members.map(member => member.name === name ? { ...member, division, rank: division === 'Unassigned' || division === 'Absent' ? 0 : member.rank || 1, leader: DIVISIONS.includes(division as never) ? member.leader : false, imprisonedTurns: 0, interrogationOrder: undefined } : member), updatedAt: Date.now() })
  }
  const changeInterrogation = (name: MemberName, turns: 0 | 1 | 2 | 3) => {
    if (!name) return
    onBoard(setInterrogation(board, name, turns))
  }
  const dropIntoInterrogation = (name: MemberName) => {
    const member = board.members.find(item => item.name === name)
    if (!member || !DIVISIONS.includes(member.division as never) || (member.imprisonedTurns ?? 0) > 0) return
    changeInterrogation(name, 3)
  }
  const saveRelationship = () => {
    if (relA === relB) return
    const next = relationships.filter(edge => !((edge.a === relA && edge.b === relB) || (edge.a === relB && edge.b === relA)))
    onBoard({ ...board, relationships: [...next, { a: relA, b: relB, status: relStatus }], updatedAt: Date.now() })
  }
  const removeRelationship = (a: MemberName, b: MemberName) => onBoard({ ...board, relationships: relationships.filter(edge => !((edge.a === a && edge.b === b) || (edge.a === b && edge.b === a))), updatedAt: Date.now() })
  const runSafehouse = (division: Division) => {
    if (!window.confirm(`Mark ${division} safehouse as completed? Its intelligence will reset and its current leader will become unassigned. You should correct the new leader after checking the in-game board.`)) return
    onBoard({ ...board, intelligence: { Transportation: 0, Fortification: 0, Research: 0, Intervention: 0, ...(board.intelligence ?? {}), [division]: 0 }, members: board.members.map(member => member.division === division && member.leader ? { ...member, leader: false, division: 'Unassigned' as const, rank: 0 as const } : member), updatedAt: Date.now() })
  }
  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.virtual-member,.relationship-panel,button,select')) return
    const node = scroller.current
    if (!node) return
    dragPan.current = { active: true, x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop }
    node.setPointerCapture(event.pointerId); node.classList.add('panning')
  }
  const pan = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = scroller.current, state = dragPan.current
    if (!node || !state.active) return
    node.scrollLeft = state.left - (event.clientX - state.x); node.scrollTop = state.top - (event.clientY - state.y)
  }
  const stopPan = (event: React.PointerEvent<HTMLDivElement>) => {
    dragPan.current.active = false; scroller.current?.classList.remove('panning')
    if (scroller.current?.hasPointerCapture(event.pointerId)) scroller.current.releasePointerCapture(event.pointerId)
  }
  return <section className="virtual-board-section">
    <div className="virtual-board-head">
      <div><h2>Current virtual board</h2><p>This is the exact state the recommendation engine is using.</p></div>
      <div className="board-legend"><span><i className="goal-dot" /> In target position</span><span><i className="wrong-dot" /> Targeted elsewhere</span><span>Drag cards to move members</span><button className="ghost" onClick={onEdit}>Edit details</button></div>
    </div>
    <div className="shape-strip">
      {DIVISIONS.map(division => { const count = board.members.filter(member => member.division === division).length; const correct = count === SHAPE_TARGETS[division]; return <span className={correct ? 'correct' : 'wrong'} key={division}><b>{division.slice(0, 1)}</b>{count}/{SHAPE_TARGETS[division]}{correct ? <Check size={12} /> : <AlertTriangle size={12} />}</span> })}
      <span className={rosterCount === 14 ? 'correct' : 'wrong'}><b>Roster</b>{rosterCount}/14{rosterCount === 14 ? <Check size={12} /> : <AlertTriangle size={12} />}</span>
      <strong className={badRelationships ? 'relationship-warning' : 'relationship-ok'}>{badRelationships ? `${badRelationships} same-group relationship${badRelationships > 1 ? 's' : ''}` : 'Relationship groups clean'}</strong>
    </div>
    <div className="intel-strip">
      <strong>Safehouse intelligence</strong>
      {DIVISIONS.map(division => <label className={(board.intelligence?.[division] ?? 0) >= 100 ? 'ready' : ''} key={division}><span>{division.slice(0, 1)}</span><input aria-label={`${division} intelligence`} type="number" min="0" max="100" value={board.intelligence?.[division] ?? 0} onChange={event => onBoard({ ...board, intelligence: { Transportation: 0, Fortification: 0, Research: 0, Intervention: 0, ...(board.intelligence ?? {}), [division]: Math.max(0, Math.min(100, Number(event.target.value))) }, updatedAt: Date.now() })} /><i>%</i>{(board.intelligence?.[division] ?? 0) >= 100 && <button title={`Run ${division} safehouse`} onClick={() => runSafehouse(division)}>Run</button>}</label>)}
      <span className="farm-label">Farm:</span>{DIVISIONS.map(division => <button className={board.strategy?.runDivisions.includes(division) ? 'on' : ''} key={division} title={`Toggle ${division} as a safehouse you intend to run`} onClick={() => { const current = board.strategy?.runDivisions ?? ['Transportation', 'Research']; const runDivisions = current.includes(division) ? current.filter(item => item !== division) : [...current, division]; onBoard({ ...board, strategy: { enforceShape: board.strategy?.enforceShape ?? true, preserveReady: board.strategy?.preserveReady ?? true, runDivisions }, updatedAt: Date.now() }) }}>{division.slice(0, 1)}</button>)}
    </div>
    <div className="board-scroller" ref={scroller} onPointerDown={startPan} onPointerMove={pan} onPointerUp={stopPan} onPointerCancel={stopPan}>
      <div className="virtual-board" ref={boardCanvas}>
       <svg className="relationship-lines" aria-hidden="true"><defs><filter id="line-shadow"><feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".7" /></filter></defs>{relationshipLines.map(line => <line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className={line.status} />)}</svg>
       <div className="virtual-columns">
        {DIVISIONS.map(division => {
          const allMembers = board.members.filter(m => m.division === division)
          const members = allMembers.filter(m => !(m.imprisonedTurns ?? 0)).sort((a, b) => Number(b.leader) - Number(a.leader) || b.rank - a.rank)
          return <div className="virtual-division" key={division} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); moveMember(event.dataTransfer.getData('text/member') as MemberName, division) }}>
            <div className="virtual-title"><i style={{ background: DIVISION_COLORS[division] }} /><span>{division}</span><b>{allMembers.length}/5</b></div>
            <div className="virtual-members">
              {members.map(member => {
                const targetHere = !!goals[member.name]?.[division]
                const targetedElsewhere = !targetHere && Object.values(goals[member.name] ?? {}).some(Boolean)
                const tier = REWARD_TIERS[member.name][division]
                return <div ref={node => { if (node) memberNodes.current.set(member.name, node); else memberNodes.current.delete(member.name) }} draggable onDragStart={event => { event.dataTransfer.setData('text/member', member.name); event.dataTransfer.effectAllowed = 'move' }} className={`virtual-member ${targetHere ? 'target-here' : targetedElsewhere ? 'target-elsewhere' : ''}`} key={member.name} title={`${REWARDS[member.name][division]} — ${tier} in ${LEAGUE_VERSION}`}>
                  <i className="tier-bar" style={{ background: TIER_COLORS[tier] }} />
                  <span className="avatar">{member.name.split(' ').map(v => v[0]).slice(0, 2).join('')}</span>
                  <div><strong>{member.name}</strong><span className="virtual-rank">{[1, 2, 3].map(rank => <i className={member.rank >= rank ? 'on' : ''} key={rank}>◆</i>)}</span></div>
                  {member.leader && <Crown size={14} className="leader-crown" />}
                  {targetHere && <Check size={14} className="target-check" />}
                </div>
              })}
              {!members.length && <div className="virtual-empty">Empty division</div>}
            </div>
          </div>
        })}
       </div>
      <div className="bench-row">
        {(['Unassigned', 'Absent'] as Assignment[]).map(group => {
          const members = board.members.filter(m => m.division === group)
          return <div className="bench-group" key={group} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); moveMember(event.dataTransfer.getData('text/member') as MemberName, group) }}><strong>{group}</strong><div>{members.map(member => <span draggable onDragStart={event => event.dataTransfer.setData('text/member', member.name)} className="bench-member" key={member.name} title={`${member.name} — rank ${member.rank}`}><span className="avatar">{member.name.split(' ').map(v => v[0]).slice(0, 2).join('')}</span>{member.name}</span>)}{!members.length && <em>Drop a member here</em>}</div></div>
        })}
        <div className="bench-group prison-group" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); dropIntoInterrogation(event.dataTransfer.getData('text/member') as MemberName) }}>
          <strong>Interrogating <b>{board.members.filter(member => (member.imprisonedTurns ?? 0) > 0).length}/3</b></strong>
          <div>{board.members.filter(member => (member.imprisonedTurns ?? 0) > 0).map(member => <span draggable onDragStart={event => event.dataTransfer.setData('text/member', member.name)} className="bench-member prisoner" key={member.name} title={`${member.name} — drag onto a division to take them out of interrogation`}>
            <span className="avatar">{member.name.split(' ').map(v => v[0]).slice(0, 2).join('')}</span>{member.name}<small>{member.division}</small>
            <span className="prison-turns" aria-label={`${member.name} interrogation turns remaining`}>{[1, 2, 3].map(turns => <button key={turns} className={member.imprisonedTurns === turns ? 'on' : ''} title={`${turns} encounter${turns > 1 ? 's' : ''} remaining`} onClick={() => changeInterrogation(member.name, turns as 1 | 2 | 3)}>{turns}</button>)}</span>
            <button className="prison-release" title={`Take ${member.name} out of interrogation (keeps rank)`} onClick={() => changeInterrogation(member.name, 0)}><X size={11} /></button>
          </span>)}{!board.members.some(member => (member.imprisonedTurns ?? 0) > 0) && <em>Drag a division member here to interrogate them</em>}</div>
        </div>
        <span className="board-count">{assigned} assigned</span>
      </div>
      <div className="relationship-panel">
        <div className="relationship-heading"><div><strong>Relationships</strong><span>For 2/5/2/5, connect a 2-house member (T/R) only to a 5-house member (F/I). Rival is the finished state; Trusted is the setup step.</span></div></div>
        <div className="relationship-add"><select value={relA} onChange={event => { const value = event.target.value as MemberName; setRelA(value); if (value === relB) setRelB(MEMBERS.find(member => member !== value)!) }}>{board.members.filter(m => DIVISIONS.includes(m.division as never)).map(m => <option key={m.name}>{m.name}</option>)}</select><span>and</span><select value={relB} onChange={event => setRelB(event.target.value as MemberName)}>{board.members.filter(m => DIVISIONS.includes(m.division as never) && m.name !== relA).map(m => <option key={m.name}>{m.name}</option>)}</select><select value={relStatus} onChange={event => setRelStatus(event.target.value as 'trusted' | 'rival')}><option value="rival">Rivals</option><option value="trusted">Trusted</option></select><button className="secondary" onClick={saveRelationship}>Add / update</button></div>
        <div className="relationship-list">{relationships.map(edge => {
          const a = memberByName.get(edge.a), b = memberByName.get(edge.b); const bad = a && b && DIVISIONS.includes(a.division as never) && DIVISIONS.includes(b.division as never) && smallHouses.has(a.division as Division) === smallHouses.has(b.division as Division)
          return <span className={`${edge.status} ${bad ? 'bad' : ''}`} key={`${edge.a}-${edge.b}`}><i />{edge.a} ↔ {edge.b}<b>{edge.status}</b>{bad && <AlertTriangle size={12} />}<button onClick={() => removeRelationship(edge.a, edge.b)} title="Remove relationship"><X size={12} /></button></span>
        })}{!relationships.length && <em>No relationships entered yet. Add the red and green lines from your in-game board.</em>}</div>
      </div>
     </div>
    </div>
  </section>
}

function TargetsStep({ board, goals, onGoals, next }: { board: BoardState; goals: GoalWeights; onGoals: (g: GoalWeights) => void; next: () => void }) {
  const selectedCount = Object.values(goals).reduce((n, divisions) => n + Object.values(divisions ?? {}).filter(Boolean).length, 0)
  const toggle = (member: MemberName, division: Division) => {
    const updated = structuredClone(goals)
    const active = updated[member]?.[division]
    updated[member] = { ...(updated[member] ?? {}), [division]: active ? 0 : rewardWeight(member, division) }
    onGoals(updated)
  }
  const preset = () => {
    const updated: GoalWeights = {}
    for (const [member, division] of Object.entries(SHEET_RECOMMENDED)) {
      updated[member as MemberName] = { [division as Division]: rewardWeight(member as MemberName, division as Division) }
    }
    onGoals(updated)
  }
  return <main className="page wide-page">
    <div className="eyebrow"><Target size={14} /> STEP 2 OF 3</div>
    <div className="title-row"><div><h1>What are you building toward?</h1><p className="lede">Select the rewards you value. Cells are shaded by their {LEAGUE_VERSION} priority, and a higher-priority cell counts for more once its member ranks up.</p></div><button className="secondary" onClick={preset}><Sparkles size={16} /> Use sheet’s suggested setup</button></div>
    <div className="tier-legend">{TIERS.map(tier => <span key={tier}><i style={{ background: TIER_COLORS[tier] }} />{tier}</span>)}<span className="tier-legend-note">{LEAGUE_VERSION} priorities</span></div>
    <div className="reward-table-wrap">
      <table className="reward-table">
        <thead><tr><th>Member</th>{DIVISIONS.map(d => <th key={d}><span style={{ background: DIVISION_COLORS[d] }} />{d}</th>)}</tr></thead>
        <tbody>{MEMBERS.map(member => {
          const current = board.members.find(m => m.name === member)
          return <tr key={member}><th><span className="avatar small" style={{ boxShadow: `inset 0 0 0 2px ${TIER_COLORS[MEMBER_TIERS[member]]}` }}>{member.split(' ').map(v => v[0]).slice(0, 2).join('')}</span><span>{member}<small>{current?.division === 'Unassigned' ? 'Not on board / unassigned' : `${current?.division} · Rank ${current?.rank}`}</small></span><i className="member-tier" title={`${MEMBER_TIERS[member]} overall in ${LEAGUE_VERSION}`} style={{ background: TIER_COLORS[MEMBER_TIERS[member]] }}>{MEMBER_TIERS[member][0]}</i></th>
            {DIVISIONS.map(division => {
              const active = !!goals[member]?.[division]
              const tier = REWARD_TIERS[member][division]
              return <td key={division}><button className={`reward tier-${tier.toLowerCase()} ${active ? 'selected' : ''}`} title={`${tier} priority in ${LEAGUE_VERSION}`} onClick={() => toggle(member, division)}><span className="check">{active && <Check size={13} />}</span>{REWARDS[member][division]}</button></td>
            })}
          </tr>
        })}</tbody>
      </table>
    </div>
    <div className="sticky-actions"><span><strong>{selectedCount}</strong> target rewards selected</span><button className="primary wide" disabled={!selectedCount} onClick={next}>Compare encounter options <ChevronRight size={17} /></button></div>
  </main>
}

type AddKind = 'execute' | 'move' | 'swap' | 'remove' | 'rank' | 'relationship' | 'intelligence' | 'custom'

function PlannerStep({ board, goals, onBoard, onEdit }: { board: BoardState; goals: GoalWeights; onBoard: (b: BoardState) => void; onEdit: () => void }) {
  const active = board.members.filter(m => m.division !== 'Absent' && !(m.imprisonedTurns ?? 0))
  const [actorName, setActorName] = useState<MemberName>(active.find(m => DIVISIONS.includes(m.division as never))?.name ?? active[0]?.name ?? MEMBERS[0])
  const actor = board.members.find(m => m.name === actorName)!
  const [options, setOptions] = useState<EncounterOption[]>(() => makeBasicOptions(actor, actor.division))
  const [adding, setAdding] = useState(false)
  const [addKind, setAddKind] = useState<AddKind>('move')
  const [target, setTarget] = useState<MemberName>(MEMBERS.find(m => m !== actorName)!)
  const [destination, setDestination] = useState<Assignment>('Transportation')
  const [offeredRelationship, setOfferedRelationship] = useState<'trusted' | 'rival' | 'neutral'>('rival')
  const [intelligenceDelta, setIntelligenceDelta] = useState(10)
  const [label, setLabel] = useState('')
  const scored = useMemo(() => scoreOptions(board, goals, options), [board, goals, options])
  const recommendation = scored[0]

  const changeActor = (name: MemberName) => {
    const nextActor = board.members.find(m => m.name === name)!
    setActorName(name); setOptions(makeBasicOptions(nextActor, nextActor.division)); setTarget(MEMBERS.find(m => m !== name)!)
  }
  const addOption = () => {
    const base = { id: crypto.randomUUID(), actor: actorName }
    let option: EncounterOption
    if (addKind === 'execute') option = { ...base, kind: 'execute', label: label || 'Execute', detail: `${actorName} gains one rank.` }
    else if (addKind === 'move') option = { ...base, kind: 'move', destination, label: label || `Move to ${destination}`, detail: `${actorName} moves to ${destination}.` }
    else if (addKind === 'swap') option = { ...base, kind: 'swap', target, label: label || `Swap with ${target}`, detail: `${actorName} and ${target} swap divisions.` }
    else if (addKind === 'remove') option = { ...base, kind: 'remove', label: label || 'Leave the Syndicate', detail: `${actorName} is removed and can be replaced.` }
    else if (addKind === 'rank') option = { ...base, kind: 'rank', target, actorRankDelta: 1, targetRankDelta: -1, label: label || `Steal rank from ${target}`, detail: `${actorName} gains a rank; ${target} loses one.` }
    else if (addKind === 'relationship') option = { ...base, kind: 'relationship', target, relationshipStatus: offeredRelationship, label: label || `${offeredRelationship === 'neutral' ? 'Remove relationship with' : offeredRelationship === 'rival' ? 'Become rivals with' : 'Become trusted with'} ${target}`, detail: `${actorName} and ${target} become ${offeredRelationship}.` }
    else if (addKind === 'intelligence') option = { ...base, kind: 'intelligence', destination, intelligenceDelta, label: label || `Gain ${intelligenceDelta} ${destination} intelligence`, detail: `Adds ${intelligenceDelta} intelligence to ${destination}.` }
    else option = { ...base, kind: 'custom', label: label || 'Other reward / no board change', detail: 'This option does not change a tracked board position.' }
    setOptions(v => [...v, option]); setAdding(false); setLabel('')
  }
  const accept = (option: EncounterOption) => {
    const projected = scored.find(s => s.id === option.id)!.projected
    onBoard(projected); setOptions([])
    const nextActor = projected.members.find(member => member.division !== 'Absent' && !(member.imprisonedTurns ?? 0))
    if (nextActor) setActorName(nextActor.name)
  }
  return <main className="page">
    <div className="eyebrow"><Sparkles size={14} /> STEP 3 OF 3</div>
    <h1>Which option should you take?</h1>
    <p className="lede">Choose the defeated member, then add the exact Betray or Bargain text shown in game. The highest-scoring outcome is your pick.</p>
    <VirtualBoard board={board} goals={goals} onEdit={onEdit} onBoard={onBoard} />
    <section className="encounter-card">
      <div className="encounter-head"><div><span className="live-dot" /> Current encounter</div><small>Board changes are saved after you confirm a choice</small></div>
      <div className="encounter-controls"><label>Defeated member<select value={actorName} onChange={e => changeActor(e.target.value as MemberName)}>{active.map(m => <option key={m.name}>{m.name}</option>)}</select></label><div className="current-position"><small>CURRENT POSITION</small><strong>{actor.division}</strong><span>Rank {actor.rank || '—'} {actor.leader && '· Leader'}</span></div><div className="current-reward"><small>SAFEHOUSE REWARD</small><strong>{DIVISIONS.includes(actor.division as never) ? REWARDS[actor.name][actor.division as Division] : 'No assigned reward'}</strong>{DIVISIONS.includes(actor.division as never) && <span className="reward-tier-chip" style={{ background: TIER_COLORS[REWARD_TIERS[actor.name][actor.division as Division]] }}>{REWARD_TIERS[actor.name][actor.division as Division]} in {LEAGUE_VERSION}</span>}</div></div>
    </section>

    {options.length > 0 && <section className="recommendation">
      <div className="rec-kicker"><Sparkles size={15} /> RECOMMENDED CHOICE · INCLUDES 2/5/2/5 + RELATIONSHIPS</div>
      <div className="rec-main"><div className="rec-rank">1</div><div><h2>{recommendation.label}</h2><p>{recommendation.detail}</p></div><div className={`score ${recommendation.score >= 0 ? 'positive' : 'negative'}`}>{recommendation.score >= 0 ? '+' : ''}{recommendation.score.toFixed(1)}<small>plan score</small></div></div>
      <ul>{recommendation.reasons.map(reason => <li key={reason}><Check size={15} />{reason}</li>)}</ul>
      {!!recommendation.outlook?.length && <div className="outlook"><strong>After this choice</strong>{recommendation.outlook.map(item => <span key={item}>{item}</span>)}</div>}
      <button className="primary" onClick={() => accept(recommendation)}>I picked this — update board <Save size={16} /></button>
    </section>}

    <div className="options-heading"><div><h2>Options shown in game</h2><p>Add any special Betray or Bargain outcomes exactly as they appear in game.</p></div><div className="option-actions"><button className="secondary" onClick={() => setAdding(true)}>+ Add outcome</button></div></div>
    <div className="option-list">{scored.map((option, index) => <article className={`option-card ${index === 0 ? 'best' : ''}`} key={option.id}>
      <span className="option-rank">{index + 1}</span><div className="option-copy"><div><strong>{option.label}</strong>{index === 0 && <em>Best choice</em>}</div><p>{option.detail}</p><small>{option.reasons[0]}</small></div><div className="option-score">{option.score >= 0 ? '+' : ''}{option.score.toFixed(1)}</div><button className="icon-btn" title="Remove option" onClick={() => setOptions(v => v.filter(o => o.id !== option.id))}><X size={16} /></button>
    </article>)}</div>
    {!options.length && <div className="empty-options"><ArrowRightLeft size={28} /><h2>Member resolved</h2><p>If reinforcements were defeated, process another member before advancing the encounter.</p><div className="empty-option-actions"><button className="secondary" onClick={() => setOptions(makeBasicOptions(actor, actor.division))}>Process selected member</button><button className="primary" onClick={() => { const next = advanceEncounter(board); onBoard(next); const nextActor = next.members.find(member => member.division !== 'Absent' && !(member.imprisonedTurns ?? 0)); if (nextActor) { setActorName(nextActor.name); setOptions(makeBasicOptions(nextActor, nextActor.division)) } }}>Finish encounter · advance prisoners</button></div></div>}

      {adding && <div className="modal-backdrop" onMouseDown={() => setAdding(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAdding(false)}><X /></button><h2>Add the offered outcome</h2><p>Translate Jun’s text into the board change it describes.</p><label>Outcome type<select value={addKind} onChange={e => setAddKind(e.target.value as AddKind)}><option value="execute">Execute / gain rank</option><option value="move">Move actor to a division</option><option value="swap">Swap divisions with another member</option><option value="remove">Actor leaves the Syndicate</option><option value="rank">Steal rank from another member</option><option value="relationship">Create / change a relationship</option><option value="intelligence">Gain safehouse intelligence</option><option value="custom">Loot / other outcome</option></select></label>
        {addKind === 'move' && <label>Destination<select value={destination} onChange={e => setDestination(e.target.value as Assignment)}>{ASSIGNMENTS.map(v => <option key={v}>{v}</option>)}</select></label>}
        {(addKind === 'swap' || addKind === 'rank' || addKind === 'relationship') && <label>Other member<select value={target} onChange={e => setTarget(e.target.value as MemberName)}>{MEMBERS.filter(m => m !== actorName).map(m => <option key={m}>{m}</option>)}</select></label>}
        {addKind === 'relationship' && <label>New relationship<select value={offeredRelationship} onChange={e => setOfferedRelationship(e.target.value as 'trusted' | 'rival' | 'neutral')}><option value="rival">Rivals (red)</option><option value="trusted">Trusted (green)</option><option value="neutral">Neutral / remove line</option></select></label>}
        {addKind === 'intelligence' && <><label>Division<select value={destination} onChange={e => setDestination(e.target.value as Division)}>{DIVISIONS.map(division => <option key={division}>{division}</option>)}</select></label><label>Intelligence gained<input type="number" min="1" max="100" value={intelligenceDelta} onChange={e => setIntelligenceDelta(Math.max(1, Math.min(100, Number(e.target.value))))} /></label></>}
        <label>Label shown in game <span>(optional)</span><input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Move to Research" /></label>
        <button className="primary wide" onClick={addOption}>Add to comparison</button></div></div>}
  </main>
}

export default function App() {
  const [step, setStep] = useState(() => loadBoard() ? 2 : 1)
  const [board, setBoard] = useState<BoardState>(() => loadBoard() ?? emptyBoard())
  const [goals, setGoals] = useState<GoalWeights>(() => loadGoals())
  const [history, setHistory] = useState<BoardState[]>(() => loadHistory())
  const [future, setFuture] = useState<BoardState[]>([])
  const [snapshots, setSnapshots] = useState<BoardSnapshot[]>(() => loadSnapshots())
  const commitBoard = (value: BoardState, remember = true) => {
    if (remember) setHistory(items => { const next = [...items, board].slice(-50); saveHistory(next); return next })
    setFuture([]); setBoard(value); saveBoard(value)
  }
  const updateBoard = (value: BoardState) => commitBoard(value)
  const updateGoals = (value: GoalWeights) => { setGoals(value); saveGoals(value) }
  const undo = () => {
    const previous = history.at(-1); if (!previous) return
    const nextHistory = history.slice(0, -1); setHistory(nextHistory); saveHistory(nextHistory); setFuture(items => [board, ...items]); setBoard(previous); saveBoard(previous)
  }
  const redo = () => {
    const next = future[0]; if (!next) return
    const nextHistory = [...history, board].slice(-50); setHistory(nextHistory); saveHistory(nextHistory); setFuture(items => items.slice(1)); setBoard(next); saveBoard(next)
  }
  const createSnapshot = () => {
    const label = window.prompt('Snapshot name', `Board ${new Date().toLocaleString()}`)?.trim(); if (!label) return
    const next = [{ id: crypto.randomUUID(), label, createdAt: Date.now(), board: structuredClone(board), goals: structuredClone(goals) }, ...snapshots].slice(0, 20); setSnapshots(next); saveSnapshots(next)
  }
  const restoreSnapshot = (snapshot: BoardSnapshot) => { commitBoard(structuredClone(snapshot.board)); updateGoals(structuredClone(snapshot.goals)) }
  const restoreBackup = (nextBoard: BoardState, nextGoals: GoalWeights, nextSnapshots: BoardSnapshot[]) => { commitBoard(nextBoard); updateGoals(nextGoals); setSnapshots(nextSnapshots); saveSnapshots(nextSnapshots) }
  return <><Header step={step} setStep={setStep} />
    <DataTools board={board} goals={goals} history={history} futureCount={future.length} snapshots={snapshots} onUndo={undo} onRedo={redo} onImport={restoreBackup} onSnapshot={createSnapshot} onRestore={restoreSnapshot} onRestoreHistory={value => commitBoard(structuredClone(value))} />
    {step === 1 && <UploadStep board={board} onBoard={updateBoard} next={() => setStep(2)} />}
    {step === 2 && <TargetsStep board={board} goals={goals} onGoals={updateGoals} next={() => setStep(3)} />}
    {step === 3 && <PlannerStep board={board} goals={goals} onBoard={updateBoard} onEdit={() => setStep(1)} />}
    <footer>Unofficial fan tool. Path of Exile and its assets are property of Grinding Gear Games.</footer>
  </>
}
