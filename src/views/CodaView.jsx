import { useState, useMemo } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
}

const cellStyle = {
  padding: '5px 10px',
  borderBottom: `1px solid ${theme.border.subtle}`,
  fontSize: 12,
  color: theme.text.secondary,
  verticalAlign: 'top',
}

const headStyle = {
  padding: '7px 10px',
  borderBottom: `1px solid ${theme.border.default}`,
  fontSize: 11,
  fontWeight: 600,
  color: theme.text.muted,
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        backgroundColor: theme.bg.input,
        border: `1px solid ${theme.border.default}`,
        borderRadius: 6,
        color: theme.text.primary,
        fontSize: 13,
        padding: '6px 12px',
        minWidth: 260,
        outline: 'none',
      }}
    />
  )
}

function StatPill({ label, value, color = theme.accent }) {
  return (
    <div style={{
      padding: '8px 16px',
      backgroundColor: theme.bg.card,
      border: `1px solid ${theme.border.default}`,
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.text.muted }}>{label}</div>
    </div>
  )
}

// ── Projects tab ──────────────────────────────────────────────────────────────
const PROJECT_STATUS_COLORS = {
  'Abgeschlossen': '#34d399',
  'In Bearbeitung': '#60a5fa',
  'Entwurf':        '#fbbf24',
  'Geplant':        '#a78bfa',
  'Pausiert':       '#f87171',
  'Archiviert':     '#8b949e',
}

function StatusBadge({ status }) {
  const color = PROJECT_STATUS_COLORS[status] || '#8b949e'
  return (
    <span style={{
      fontSize: 10, padding: '1px 7px', borderRadius: 4,
      backgroundColor: color + '20', color, border: `1px solid ${color}40`,
      whiteSpace: 'nowrap',
    }}>{status || '—'}</span>
  )
}

function ProjectsTab({ data }) {
  const projects = data.codaProjects || []
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const statuses = useMemo(() => ['all', ...Array.from(new Set(projects.map(p => p.status).filter(Boolean))).sort()], [projects])

  const filtered = useMemo(() => projects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return p.title.toLowerCase().includes(q) ||
        p.lead.toLowerCase().includes(q) ||
        p.org.toLowerCase().includes(q) ||
        p.space.toLowerCase().includes(q)
    }
    return true
  }), [projects, search, filterStatus])

  const byStatus = useMemo(() => {
    const m = {}
    projects.forEach(p => { m[p.status] = (m[p.status] || 0) + 1 })
    return m
  }, [projects])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Projekte gesamt" value={projects.length} />
        {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s, n]) => (
          <StatPill key={s} label={s} value={n} color={PROJECT_STATUS_COLORS[s] || '#8b949e'} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Titel, Lead, Organisation…" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          backgroundColor: theme.bg.input, border: `1px solid ${theme.border.default}`,
          borderRadius: 6, color: theme.text.primary, fontSize: 13, padding: '6px 10px',
        }}>
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'Alle Status' : s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>{filtered.length} Projekte</span>
      </div>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['ID', 'Titel', 'Status', 'Lead', 'Team', 'Space', 'Organisation', 'Phase', 'Start'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={i}>
                <td style={{ ...cellStyle, color: theme.text.muted, fontFamily: 'monospace', fontSize: 11 }}>{p.projectId || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.primary, fontWeight: 500, maxWidth: 280 }}>{p.title}</td>
                <td style={cellStyle}><StatusBadge status={p.status} /></td>
                <td style={{ ...cellStyle, color: '#60a5fa' }}>{p.lead || '—'}</td>
                <td style={{ ...cellStyle, maxWidth: 160 }}>
                  {p.team.length > 0 ? (
                    <span style={{ fontSize: 11, color: theme.text.muted }}>{p.team.join(', ')}</span>
                  ) : '—'}
                </td>
                <td style={{ ...cellStyle, color: '#a78bfa' }}>{p.space || '—'}</td>
                <td style={cellStyle}>{p.org || '—'}</td>
                <td style={cellStyle}>{p.phase || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.muted }}>{p.startDate || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tasks tab ──────────────────────────────────────────────────────────────
function TasksTab({ data }) {
  const tasks = data.codaTasks || []
  const [search, setSearch] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterDone, setFilterDone] = useState('open')

  const assignees = useMemo(() => ['all', ...Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))).sort()], [tasks])

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterDone === 'open' && t.isDone) return false
    if (filterDone === 'done' && !t.isDone) return false
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false
    if (search) {
      const q = search.toLowerCase()
      return t.task.toLowerCase().includes(q) ||
        t.project.toLowerCase().includes(q) ||
        t.space.toLowerCase().includes(q) ||
        t.org.toLowerCase().includes(q)
    }
    return true
  }), [tasks, search, filterAssignee, filterDone])

  const openCount = tasks.filter(t => !t.isDone).length
  const doneCount = tasks.filter(t => t.isDone).length
  const inProgressCount = tasks.filter(t => t.inProgress).length
  const byAssignee = useMemo(() => {
    const m = {}
    tasks.filter(t => !t.isDone && t.assignee).forEach(t => { m[t.assignee] = (m[t.assignee] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [tasks])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Tasks gesamt" value={tasks.length} />
        <StatPill label="Offen" value={openCount} color="#fbbf24" />
        <StatPill label="In Bearbeitung" value={inProgressCount} color="#60a5fa" />
        <StatPill label="Erledigt" value={doneCount} color="#34d399" />
        {byAssignee.map(([name, n]) => (
          <StatPill key={name} label={name.split(' ')[0]} value={n} color="#a78bfa" />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Task, Projekt, Space…" />
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{
          backgroundColor: theme.bg.input, border: `1px solid ${theme.border.default}`,
          borderRadius: 6, color: theme.text.primary, fontSize: 13, padding: '6px 10px',
        }}>
          {assignees.map(a => <option key={a} value={a}>{a === 'all' ? 'Alle Personen' : a}</option>)}
        </select>
        {['all', 'open', 'done'].map(v => (
          <button key={v} onClick={() => setFilterDone(v)} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${filterDone === v ? theme.accent : theme.border.subtle}`,
            backgroundColor: filterDone === v ? theme.accent + '20' : 'transparent',
            color: filterDone === v ? theme.accent : theme.text.secondary,
          }}>{v === 'all' ? 'Alle' : v === 'open' ? 'Offen' : 'Erledigt'}</button>
        ))}
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>{filtered.length} Tasks</span>
      </div>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Nr.', 'Task', 'Assignee', 'Projekt', 'Space', 'Status', 'Fällig', 'Typ'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((t, i) => (
              <tr key={i} style={{ opacity: t.isDone ? 0.5 : 1 }}>
                <td style={{ ...cellStyle, color: theme.text.muted, fontFamily: 'monospace', fontSize: 11 }}>{t.taskNumber || '—'}</td>
                <td style={{ ...cellStyle, color: t.isDone ? theme.text.muted : theme.text.primary, maxWidth: 260, textDecoration: t.isDone ? 'line-through' : 'none' }}>{t.task}</td>
                <td style={{ ...cellStyle, color: '#60a5fa', whiteSpace: 'nowrap' }}>{t.assignee || '—'}</td>
                <td style={{ ...cellStyle, color: '#a78bfa', maxWidth: 160 }}>{t.project || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.muted }}>{t.space || '—'}</td>
                <td style={{ ...cellStyle, color: t.inProgress ? '#fbbf24' : t.isDone ? '#34d399' : theme.text.muted }}>
                  {t.isDone ? 'Erledigt' : t.inProgress ? 'In Arbeit' : t.status || '—'}
                </td>
                <td style={{ ...cellStyle, color: theme.text.muted }}>{t.dueDate || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.muted }}>{t.type || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <div style={{ padding: '10px 10px', fontSize: 12, color: theme.text.muted, textAlign: 'center' }}>
            … {filtered.length - 200} weitere Tasks (Filter anpassen um zu sehen)
          </div>
        )}
      </div>
    </div>
  )
}

// ── People tab ──────────────────────────────────────────────────────────────
function PeopleTab({ data }) {
  const people = data.codaPeople || []
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const types = useMemo(() => ['all', ...Array.from(new Set(people.map(p => p.type).filter(Boolean))).sort()], [people])

  const filtered = useMemo(() => people.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) ||
        p.org.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    }
    return true
  }), [people, search, filterType])

  const byOrg = useMemo(() => {
    const m = {}
    people.forEach(p => { if (p.org) m[p.org] = (m[p.org] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [people])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Personen gesamt" value={people.length} />
        {byOrg.map(([org, n]) => (
          <StatPill key={org} label={org} value={n} color="#60a5fa" />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Name, Organisation, E-Mail…" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
          backgroundColor: theme.bg.input, border: `1px solid ${theme.border.default}`,
          borderRadius: 6, color: theme.text.primary, fontSize: 13, padding: '6px 10px',
        }}>
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'Alle Typen' : t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>{filtered.length} Personen</span>
      </div>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Vorname', 'Nachname', 'Organisation', 'E-Mail', 'Typ', 'Team'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={i}>
                <td style={{ ...cellStyle, color: theme.text.primary, fontWeight: 500 }}>{p.name}</td>
                <td style={cellStyle}>{p.firstname}</td>
                <td style={cellStyle}>{p.lastname}</td>
                <td style={{ ...cellStyle, color: '#60a5fa' }}>{p.org || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.muted, fontFamily: 'monospace', fontSize: 11 }}>{p.email || '—'}</td>
                <td style={cellStyle}>{p.type || '—'}</td>
                <td style={{ ...cellStyle, color: '#a78bfa' }}>{p.team || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Meetings tab ──────────────────────────────────────────────────────────────
function MeetingsTab({ data }) {
  const meetings = data.codaMeetings || []
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('all')

  const years = useMemo(() => ['all', ...Array.from(new Set(meetings.map(m => m.startDate?.slice(0, 4)).filter(Boolean))).sort().reverse()], [meetings])

  const filtered = useMemo(() => meetings.filter(m => {
    if (filterYear !== 'all' && !m.startDate?.startsWith(filterYear)) return false
    if (search) {
      const q = search.toLowerCase()
      return m.title.toLowerCase().includes(q) ||
        m.space.toLowerCase().includes(q) ||
        m.org.toLowerCase().includes(q) ||
        m.attendees.some(a => a.toLowerCase().includes(q))
    }
    return true
  }).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')), [meetings, search, filterYear])

  const byYear = useMemo(() => {
    const m = {}
    meetings.forEach(mt => { const y = mt.startDate?.slice(0, 4); if (y) m[y] = (m[y] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]))
  }, [meetings])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Meetings gesamt" value={meetings.length} />
        {byYear.slice(0, 4).map(([y, n]) => (
          <StatPill key={y} label={y} value={n} color="#60a5fa" />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Titel, Space, Organisation…" />
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{
          backgroundColor: theme.bg.input, border: `1px solid ${theme.border.default}`,
          borderRadius: 6, color: theme.text.primary, fontSize: 13, padding: '6px 10px',
        }}>
          {years.map(y => <option key={y} value={y}>{y === 'all' ? 'Alle Jahre' : y}</option>)}
        </select>
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>{filtered.length} Meetings</span>
      </div>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Datum', 'Titel', 'Space', 'Organisation', 'Typ', 'Teilnehmer'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((m, i) => (
              <tr key={i}>
                <td style={{ ...cellStyle, color: theme.text.muted, whiteSpace: 'nowrap' }}>{m.startDate || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.primary, maxWidth: 300 }}>{m.title}</td>
                <td style={{ ...cellStyle, color: '#a78bfa' }}>{m.space || '—'}</td>
                <td style={{ ...cellStyle, color: '#60a5fa' }}>{m.org || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.muted }}>{m.type || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.muted, maxWidth: 200, fontSize: 11 }}>
                  {m.attendees.slice(0, 4).join(', ')}{m.attendees.length > 4 ? ` +${m.attendees.length - 4}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <div style={{ padding: '10px', fontSize: 12, color: theme.text.muted, textAlign: 'center' }}>
            … {filtered.length - 200} weitere Meetings
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ressources tab ──────────────────────────────────────────────────────────
function RessourcesTab({ data }) {
  const ressources = data.codaRessources || []
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const types = useMemo(() => ['all', ...Array.from(new Set(ressources.map(r => r.type).filter(Boolean))).sort()], [ressources])

  const filtered = useMemo(() => ressources.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return r.name.toLowerCase().includes(q) ||
        r.space.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)
    }
    return true
  }), [ressources, search, filterType])

  const byType = useMemo(() => {
    const m = {}
    ressources.forEach(r => { if (r.type) m[r.type] = (m[r.type] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [ressources])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Ressourcen gesamt" value={ressources.length} />
        {byType.slice(0, 5).map(([t, n]) => (
          <StatPill key={t} label={t} value={n} color="#fbbf24" />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Name, Space, Eigentümer…" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
          backgroundColor: theme.bg.input, border: `1px solid ${theme.border.default}`,
          borderRadius: 6, color: theme.text.primary, fontSize: 13, padding: '6px 10px',
        }}>
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'Alle Typen' : t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>{filtered.length} Ressourcen</span>
      </div>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Typ', 'Space', 'Organisation', 'Projekt', 'Eigentümer', 'Datum'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ ...cellStyle, color: theme.text.primary, fontWeight: 500 }}>{r.name}</td>
                <td style={{ ...cellStyle, color: '#fbbf24' }}>{r.type || '—'}</td>
                <td style={{ ...cellStyle, color: '#a78bfa' }}>{r.space || '—'}</td>
                <td style={{ ...cellStyle, color: '#60a5fa' }}>{r.org || '—'}</td>
                <td style={cellStyle}>{r.project || '—'}</td>
                <td style={{ ...cellStyle, color: '#34d399' }}>{r.owner || '—'}</td>
                <td style={{ ...cellStyle, color: theme.text.muted }}>{r.date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── OKRs tab ──────────────────────────────────────────────────────────────
function OKRsTab({ data }) {
  const objectives = data.codaObjectives || []
  const keyResults = data.codaKeyResults || []

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <StatPill label="Objectives" value={objectives.length} color="#34d399" />
        <StatPill label="Key Results" value={keyResults.length} color="#60a5fa" />
      </div>
      {objectives.map((obj, i) => {
        const krs = keyResults.filter(kr => kr.objective === obj.objective)
        return (
          <div key={i} style={{ ...sectionStyle, borderLeft: '3px solid #34d399' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.text.primary }}>{obj.objective}</div>
                <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>{obj.quarter}</div>
              </div>
              {obj.achievement != null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>{obj.achievement}%</div>
                  <div style={{ fontSize: 10, color: theme.text.muted }}>Erreichung</div>
                </div>
              )}
            </div>
            {obj.description && (
              <div style={{ fontSize: 12, color: theme.text.secondary, marginBottom: 10, lineHeight: 1.5 }}>{obj.description}</div>
            )}
            {krs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Key Results</div>
                {krs.map((kr, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '8px 12px', backgroundColor: theme.bg.elevated, borderRadius: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: theme.text.primary }}>{kr.keyResult}</div>
                      {kr.description && <div style={{ fontSize: 11, color: theme.text.muted }}>{kr.description}</div>}
                    </div>
                    {kr.progressPct != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                        <div style={{ flex: 1, height: 6, backgroundColor: theme.bg.input, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: 6, backgroundColor: '#60a5fa', borderRadius: 3, width: `${Math.min(kr.progressPct, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#60a5fa', minWidth: 35 }}>{kr.progressPct}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Deals tab ──────────────────────────────────────────────────────────────
const DEAL_PHASE_COLORS = {
  'Abschluss':      '#34d399',
  'Verhandlung':    '#fbbf24',
  'Angebot':        '#60a5fa',
  'Qualifikation':  '#a78bfa',
  'Erstgespräch':   '#fb923c',
  'Prospecting':    '#f87171',
}

function DealsTab({ data }) {
  const deals = data.codaDeals || []

  const totalPipeline = deals.reduce((s, d) => {
    const v = parseFloat((d.estimatedValue || '').replace(/[€.,]/g, (c) => c === ',' ? '.' : '').replace('€', '')) || 0
    return s + v
  }, 0)

  const byPhase = useMemo(() => {
    const m = {}
    deals.forEach(d => { m[d.phase] = (m[d.phase] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [deals])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Deals gesamt" value={deals.length} />
        {byPhase.map(([p, n]) => (
          <StatPill key={p} label={p} value={n} color={DEAL_PHASE_COLORS[p] || '#8b949e'} />
        ))}
      </div>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['ID', 'Titel', 'Organisation', 'Phase', 'Geschätzter Wert', 'MRR', 'Laufzeit', 'Chance', 'Assignee', 'Erstkontakt'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((d, i) => {
              const phaseColor = DEAL_PHASE_COLORS[d.phase] || '#8b949e'
              return (
                <tr key={i}>
                  <td style={{ ...cellStyle, color: theme.text.muted, fontFamily: 'monospace', fontSize: 11 }}>{d.dealId || '—'}</td>
                  <td style={{ ...cellStyle, color: theme.text.primary, fontWeight: 500 }}>{d.title || d.org}</td>
                  <td style={{ ...cellStyle, color: '#60a5fa' }}>{d.org || '—'}</td>
                  <td style={cellStyle}>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, backgroundColor: phaseColor + '20', color: phaseColor, border: `1px solid ${phaseColor}40` }}>
                      {d.phase || '—'}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, color: '#34d399', fontWeight: 600 }}>{d.estimatedValue || '—'}</td>
                  <td style={{ ...cellStyle, color: '#60a5fa' }}>{d.monthlyRevenue ? `€${d.monthlyRevenue.toLocaleString('de-DE')}` : '—'}</td>
                  <td style={{ ...cellStyle, color: theme.text.muted }}>{d.durationMonths ? `${d.durationMonths} Mo.` : '—'}</td>
                  <td style={{ ...cellStyle, color: '#fbbf24' }}>{d.chance != null ? `${d.chance}%` : '—'}</td>
                  <td style={{ ...cellStyle, color: '#a78bfa' }}>{d.assignee || '—'}</td>
                  <td style={{ ...cellStyle, color: theme.text.muted }}>{d.firstContact || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Teams tab ──────────────────────────────────────────────────────────────
function TeamsTab({ data }) {
  const teams = data.codaTeams || []

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <StatPill label="Teams" value={teams.length} />
        <StatPill label="Mitglieder gesamt" value={teams.reduce((s, t) => s + t.members.length, 0)} color="#60a5fa" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {teams.map((t, i) => (
          <div key={i} style={{ ...sectionStyle, borderLeft: '3px solid #60a5fa' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme.text.primary, marginBottom: 12 }}>{t.team}</div>
            {t.members.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {t.members.map(m => (
                  <span key={m} style={{
                    padding: '4px 12px', borderRadius: 9999, fontSize: 12,
                    backgroundColor: theme.bg.elevated, color: theme.text.secondary,
                    border: `1px solid ${theme.border.subtle}`,
                  }}>{m}</span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: theme.text.muted }}>Keine Mitglieder</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main CodaView ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'projects',   label: 'Projekte',    icon: '◫' },
  { id: 'tasks',      label: 'Tasks',       icon: '☑' },
  { id: 'people',     label: 'Personen',    icon: '◇' },
  { id: 'meetings',   label: 'Meetings',    icon: '◎' },
  { id: 'ressources', label: 'Ressourcen',  icon: '◈' },
  { id: 'okrs',       label: 'OKRs',        icon: '◉' },
  { id: 'deals',      label: 'Deals',       icon: '◆' },
  { id: 'teams',      label: 'Teams',       icon: '⊞' },
]

export function CodaView({ data }) {
  const [activeTab, setActiveTab] = useState('projects')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>
          Coda Workspace HQ
        </h1>
        <p style={{ color: theme.text.secondary, marginTop: 6, fontSize: 14 }}>
          Alle Tabellen aus dem Coda Workspace HQ – Projekte, Tasks, Personen, Meetings, Ressourcen, OKRs, Deals und Teams.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Projekte', value: (data.codaProjects || []).length, color: '#60a5fa' },
            { label: 'Tasks', value: (data.codaTasks || []).length, color: '#fbbf24' },
            { label: 'Personen', value: (data.codaPeople || []).length, color: '#a78bfa' },
            { label: 'Meetings', value: (data.codaMeetings || []).length, color: '#34d399' },
            { label: 'Ressourcen', value: (data.codaRessources || []).length, color: '#fb923c' },
            { label: 'Deals', value: (data.codaDeals || []).length, color: '#f87171' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '8px 16px',
              backgroundColor: theme.bg.card,
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: theme.text.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: `1px solid ${theme.border.default}`, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? theme.accent : 'transparent'}`,
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? theme.text.primary : theme.text.secondary,
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.7 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'projects'   && <ProjectsTab data={data} />}
      {activeTab === 'tasks'      && <TasksTab data={data} />}
      {activeTab === 'people'     && <PeopleTab data={data} />}
      {activeTab === 'meetings'   && <MeetingsTab data={data} />}
      {activeTab === 'ressources' && <RessourcesTab data={data} />}
      {activeTab === 'okrs'       && <OKRsTab data={data} />}
      {activeTab === 'deals'      && <DealsTab data={data} />}
      {activeTab === 'teams'      && <TeamsTab data={data} />}
    </div>
  )
}
