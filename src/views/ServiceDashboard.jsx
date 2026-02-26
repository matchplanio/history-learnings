import { useState, useMemo } from 'react'
import { theme } from '../config/theme'

const statusBadge = (status) => {
  const s = theme.status[status] || theme.status.Template
  return { backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600 }
}

const typeBadge = { backgroundColor: theme.bg.elevated, color: theme.text.muted, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 500 }

export function ServiceDashboard({ data, onServiceClick, onPersonClick }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('tickets')

  const statuses = useMemo(() => [...new Set(data.services.map(s => s.status))], [data])
  const types = useMemo(() => [...new Set(data.services.map(s => s.type).filter(Boolean))], [data])

  const filtered = useMemo(() => {
    let list = data.services.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    list.sort((a, b) => {
      if (sort === 'tickets') return b.tickets - a.tickets
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'assignees') return b.topAssignees.length - a.topAssignees.length
      return 0
    })
    return list
  }, [data, statusFilter, typeFilter, search, sort])

  const yearlyToArray = (yt) => {
    if (!yt) return []
    return Object.entries(yt).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year))
  }

  const selectStyle = {
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${theme.border.default}`,
    backgroundColor: theme.bg.input,
    color: theme.text.primary,
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Services</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>{data.meta.servicesWithMatches} Services mit Ticket-Matches aus {data.meta.totalTickets.toLocaleString()} Jira-Tickets</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: theme.text.muted }}>Status</span>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">Alle</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: theme.text.muted }}>Typ</span>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="all">Alle</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: theme.text.muted }}>Sort</span>
        <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
          <option value="tickets">Tickets</option>
          <option value="name">Name</option>
          <option value="assignees">Team</option>
        </select>
        <input
          placeholder="Suche..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, width: 160 }}
        />
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>{filtered.length} Services</span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {filtered.map(s => {
          const trend = yearlyToArray(s.yearlyTickets)
          const maxTrend = Math.max(...trend.map(t => t.count), 1)
          return (
            <div
              key={s.name}
              onClick={() => onServiceClick(s.name)}
              style={{
                backgroundColor: theme.bg.card,
                border: `1px solid ${theme.border.default}`,
                borderRadius: 8,
                padding: 16,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = theme.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = theme.border.default}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>{s.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={statusBadge(s.status)}>{s.status}</span>
                {s.type && <span style={typeBadge}>{s.type}</span>}
                {s.kategorie && <span style={typeBadge}>{s.kategorie}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: theme.accent }}>{s.tickets.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: theme.text.muted }}>Tickets</span>
              </div>
              {s.tickets > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28, marginTop: 8 }}>
                    {trend.map((t, i) => (
                      <div key={i} title={`${t.year}: ${t.count}`} style={{
                        backgroundColor: theme.accent,
                        borderRadius: 2,
                        minWidth: 8,
                        opacity: 0.6,
                        height: Math.max(2, (t.count / maxTrend) * 26),
                      }} />
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: theme.text.muted }}>
                    {s.topAssignees.slice(0, 3).map(a => (
                      <span
                        key={a.name}
                        onClick={e => { e.stopPropagation(); onPersonClick(a.name) }}
                        style={{ cursor: 'pointer', color: theme.accent, marginRight: 8 }}
                      >
                        {a.name} ({a.count})
                      </span>
                    ))}
                    {s.topAssignees.length > 3 && <span>+{s.topAssignees.length - 3}</span>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
