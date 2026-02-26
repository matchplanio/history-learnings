import { useState, useMemo } from 'react'
import { theme } from '../config/theme'

export function TeamView({ data, selectedPerson, onServiceClick }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('tickets')

  const teamList = useMemo(() => {
    return Object.entries(data.teamProfiles).map(([name, profile]) => ({
      name,
      totalTickets: profile.totalTickets,
      services: profile.topServices || [],
    }))
  }, [data])

  const filtered = useMemo(() => {
    let list = teamList.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    list.sort((a, b) => {
      if (sort === 'tickets') return b.totalTickets - a.totalTickets
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'services') return b.services.length - a.services.length
      return 0
    })
    return list
  }, [teamList, search, sort])

  const selectStyle = {
    padding: '6px 10px', borderRadius: 6, border: `1px solid ${theme.border.default}`,
    backgroundColor: theme.bg.input, color: theme.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Team</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>Service-Kompetenzprofile basierend auf Ticket-Zuweisungen</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: theme.text.muted }}>Sort</span>
        <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
          <option value="tickets">Tickets</option>
          <option value="name">Name</option>
          <option value="services">Services</option>
        </select>
        <input placeholder="Person suchen..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...selectStyle, width: 180 }} />
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>{filtered.length} Personen</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
        {filtered.map(p => {
          const isSelected = selectedPerson === p.name
          const maxSvc = Math.max(...p.services.map(x => x.count), 1)
          return (
            <div key={p.name} style={{
              backgroundColor: theme.bg.card,
              border: `${isSelected ? 2 : 1}px solid ${isSelected ? theme.accent : theme.border.default}`,
              borderRadius: 8,
              padding: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: theme.accent }}>{p.totalTickets.toLocaleString()}</span>
                  <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 4 }}>Tickets</span>
                </div>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: theme.accent }}>{p.services.length}</span>
                  <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 4 }}>Services</span>
                </div>
              </div>
              <div>
                {p.services.slice(0, 8).map(s => (
                  <div
                    key={s.name}
                    onClick={() => onServiceClick(s.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12,
                      cursor: 'pointer', color: theme.text.secondary, transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = theme.accent}
                    onMouseLeave={e => e.currentTarget.style.color = theme.text.secondary}
                  >
                    <span style={{ width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <div style={{ flex: 1, height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: 6, backgroundColor: theme.accent, borderRadius: 3, width: `${(s.count / maxSvc) * 100}%` }} />
                    </div>
                    <span style={{ minWidth: 35, textAlign: 'right', color: theme.text.muted }}>{s.count}</span>
                  </div>
                ))}
                {p.services.length > 8 && (
                  <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>+{p.services.length - 8} weitere</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
