import { useState, useMemo } from 'react'

export function TeamView({ data, selectedPerson, onServiceClick }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('tickets')

  const team = useMemo(() => {
    let list = data.teamProfiles.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    list.sort((a, b) => {
      if (sort === 'tickets') return b.totalTickets - a.totalTickets
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'services') return b.services.length - a.services.length
      return 0
    })
    return list
  }, [data, search, sort])

  const maxTickets = Math.max(...data.teamProfiles.map(p => p.totalTickets), 1)

  return (
    <div>
      <div className="filters">
        <span className="filter-label">Sort:</span>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="tickets">Tickets</option>
          <option value="name">Name</option>
          <option value="services">Services</option>
        </select>
        <input placeholder="Person suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        <span className="filter-label">{team.length} Personen</span>
      </div>
      <div className="team-grid">
        {team.map(p => (
          <div key={p.name} className={`team-card${selectedPerson === p.name ? ' selected' : ''}`}>
            <h3>{p.name}</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <div>
                <span className="ticket-count" style={{ fontSize: '1.4rem' }}>{p.totalTickets.toLocaleString()}</span>
                <span className="ticket-label"> Tickets</span>
              </div>
              <div>
                <span className="ticket-count" style={{ fontSize: '1.4rem' }}>{p.services.length}</span>
                <span className="ticket-label"> Services</span>
              </div>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              {p.services.slice(0, 8).map(s => {
                const maxSvc = Math.max(...p.services.map(x => x.count), 1)
                return (
                  <div key={s.name} className="service-bar" onClick={() => onServiceClick(s.name)}>
                    <span style={{ width: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <div className="bar-bg">
                      <div className="bar-fill" style={{ width: `${(s.count / maxSvc) * 100}%` }} />
                    </div>
                    <span style={{ minWidth: '35px', textAlign: 'right' }}>{s.count}</span>
                  </div>
                )
              })}
              {p.services.length > 8 && (
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                  +{p.services.length - 8} weitere Services
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
