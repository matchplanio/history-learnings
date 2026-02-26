import { useState, useMemo } from 'react'

export function ServiceDashboard({ data, onServiceClick, onPersonClick }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('tickets')

  const statuses = useMemo(() => [...new Set(data.services.map(s => s.status))], [data])
  const types = useMemo(() => [...new Set(data.services.map(s => s.type))], [data])

  const filtered = useMemo(() => {
    let list = data.services.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    list.sort((a, b) => {
      if (sort === 'tickets') return b.ticketCount - a.ticketCount
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'assignees') return b.topAssignees.length - a.topAssignees.length
      return 0
    })
    return list
  }, [data, statusFilter, typeFilter, search, sort])

  const maxTickets = Math.max(...data.services.map(s => s.ticketCount), 1)

  return (
    <div>
      <div className="filters">
        <span className="filter-label">Status:</span>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Alle</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="filter-label">Typ:</span>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Alle</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="filter-label">Sort:</span>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="tickets">Tickets</option>
          <option value="name">Name</option>
          <option value="assignees">Team</option>
        </select>
        <input placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)} />
        <span className="filter-label">{filtered.length} Services</span>
      </div>
      <div className="service-grid">
        {filtered.map(s => (
          <div key={s.name} className="service-card" onClick={() => onServiceClick(s.name)}>
            <h3>{s.name}</h3>
            <div className="meta">
              <span className={`badge badge-${s.status === 'Live' ? 'live' : s.status === 'Entwicklung' ? 'dev' : s.status === 'Maintenance' || s.status === 'EoS' ? 'eos' : s.status === 'Idea' ? 'idea' : 'dead'}`}>
                {s.status}
              </span>
              {s.type && <span className="badge badge-type">{s.type}</span>}
              {s.kategorie && <span className="badge badge-type">{s.kategorie}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="ticket-count">{s.ticketCount.toLocaleString()}</span>
              <span className="ticket-label">Tickets</span>
            </div>
            {s.ticketCount > 0 && (
              <>
                <div className="mini-trend">
                  {s.yearlyTrend.map((t, i) => (
                    <div key={i} className="mini-bar" style={{ height: `${Math.max(2, (t.count / Math.max(...s.yearlyTrend.map(x => x.count), 1)) * 28)}px` }} title={`${t.year}: ${t.count}`} />
                  ))}
                </div>
                <div className="assignee-list">
                  {s.topAssignees.slice(0, 3).map(a => (
                    <span key={a.name} className="clickable" onClick={e => { e.stopPropagation(); onPersonClick(a.name) }} style={{ marginRight: '0.5rem' }}>
                      {a.name} ({a.count})
                    </span>
                  ))}
                  {s.topAssignees.length > 3 && <span>+{s.topAssignees.length - 3}</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
