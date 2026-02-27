import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { useMemo, useState } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#8b949e']

const LEVEL_COLORS = {
  'Basic':        { bg: '#21262d', text: '#8b949e', border: '#30363d' },
  'Prime':        { bg: '#2d2518', text: '#fbbf24', border: '#92400e' },
  'Flat':         { bg: '#1a2e2a', text: '#34d399', border: '#064e3b' },
  'vDC Standard': { bg: '#1e1a2e', text: '#a78bfa', border: '#4c1d95' },
  'vDC Premium':  { bg: '#1a2040', text: '#60a5fa', border: '#1e3a5f' },
}

function LevelBadge({ level }) {
  const col = LEVEL_COLORS[level] || { bg: '#21262d', text: '#8b949e', border: '#30363d' }
  return (
    <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 4,
      backgroundColor: col.bg, color: col.text, border: `1px solid ${col.border}`,
      whiteSpace: 'nowrap',
    }}>{level}</span>
  )
}

function formatEur(v) {
  if (!v && v !== 0) return '—'
  return '€' + v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function CustomerView({ data, onServiceClick }) {
  const customers = useMemo(() => data.customers || [], [data])
  const meta = useMemo(() => data.customerMeta || {}, [data])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [sortBy, setSortBy] = useState('tickets')
  const [filterMinTickets, setFilterMinTickets] = useState(10)

  const filtered = useMemo(() =>
    customers.filter(c => c.tickets >= filterMinTickets).sort((a, b) => {
      if (sortBy === 'tickets') return b.tickets - a.tickets
      if (sortBy === 'incidents') return b.incidents - a.incidents
      if (sortBy === 'incidentRate') return b.incidentRate - a.incidentRate
      if (sortBy === 'services') return b.servicesCount - a.servicesCount
      if (sortBy === 'mrr') return (b.codaContract?.totalMonthly || 0) - (a.codaContract?.totalMonthly || 0)
      return b.tickets - a.tickets
    }),
  [customers, sortBy, filterMinTickets])

  const top20 = useMemo(() => filtered.slice(0, 20).map(c => ({
    name: c.name.length > 15 ? c.name.slice(0, 12) + '...' : c.name,
    fullName: c.name,
    tickets: c.tickets,
    incidents: c.incidents,
  })), [filtered])

  // Type distribution across all customers
  const typeData = useMemo(() => {
    const types = {}
    for (const c of customers) {
      for (const [t, count] of Object.entries(c.byType || {})) {
        types[t] = (types[t] || 0) + count
      }
    }
    return Object.entries(types).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [customers])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  const detail = selectedCustomer ? customers.find(c => c.name === selectedCustomer) : null

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Kunden</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>
          {meta.totalCustomers} Kunden erkannt, {meta.totalCustomerTickets?.toLocaleString()} Tickets mit Kundenprefix
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Kunden', value: meta.totalCustomers, color: theme.accent },
          { label: 'Kunden-Tickets', value: meta.totalCustomerTickets?.toLocaleString(), color: '#34d399' },
          { label: 'Ø Tickets/Kunde', value: meta.totalCustomers ? Math.round(meta.totalCustomerTickets / meta.totalCustomers) : 0, color: '#fbbf24' },
          { label: 'Aktive Verträge', value: meta.codaActiveContracts || 0, color: '#a78bfa' },
          { label: 'Gesamt MRR', value: formatEur(meta.codaTotalMRR), color: '#60a5fa' },
          { label: 'Gesamt ARR', value: formatEur(meta.codaTotalARR), color: '#2dd4bf' },
        ].map(kpi => (
          <div key={kpi.label} style={sectionStyle}>
            <div style={{ fontSize: 11, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top 20 bar chart */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top 20 Kunden</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={top20} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
              <YAxis dataKey="name" type="category" width={110} stroke={theme.text.muted} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [v.toLocaleString(), p.payload.fullName]} />
              <Bar dataKey="tickets" fill={theme.accent} radius={[0, 4, 4, 0]} />
              <Bar dataKey="incidents" fill={theme.semantic.error} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type pie */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Ticket-Typen (alle Kunden)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={140} paddingAngle={2}>
                {typeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controls */}
      <div style={{ ...sectionStyle, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.text.muted }}>Sortierung:</div>
        {[
          { id: 'tickets', label: 'Tickets' },
          { id: 'incidents', label: 'Incidents' },
          { id: 'incidentRate', label: 'Incident-Rate' },
          { id: 'services', label: 'Services' },
          { id: 'mrr', label: 'MRR' },
        ].map(s => (
          <button key={s.id} onClick={() => setSortBy(s.id)} style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: `1px solid ${sortBy === s.id ? theme.accent : theme.border.subtle}`,
            backgroundColor: sortBy === s.id ? theme.accent + '20' : 'transparent',
            color: sortBy === s.id ? theme.accent : theme.text.secondary,
            fontFamily: 'inherit',
          }}>{s.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: theme.text.muted }}>Min. Tickets:</span>
          {[3, 10, 50, 100].map(n => (
            <button key={n} onClick={() => setFilterMinTickets(n)} style={{
              padding: '4px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
              border: `1px solid ${filterMinTickets === n ? theme.accent : theme.border.subtle}`,
              backgroundColor: filterMinTickets === n ? theme.accent + '20' : 'transparent',
              color: filterMinTickets === n ? theme.accent : theme.text.muted,
              fontFamily: 'inherit',
            }}>{n}+</button>
          ))}
        </div>
      </div>

      {/* Customer table */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>
          Kundenliste ({filtered.length})
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Kunde', 'Vertrag', 'MRR', 'Tickets', 'Incidents', 'Rate', 'Services', 'Match%', 'Aktiv seit'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`, color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const cc = c.codaContract
              return (
                <tr key={c.name}
                  onClick={() => setSelectedCustomer(selectedCustomer === c.name ? null : c.name)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.bg.elevated}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedCustomer === c.name ? theme.accent + '10' : 'transparent'}
                >
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: selectedCustomer === c.name ? 600 : 400 }}>{c.name}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                    {cc ? (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {cc.levels.map(l => <LevelBadge key={l} level={l} />)}
                      </div>
                    ) : <span style={{ color: theme.text.muted, fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: cc ? '#60a5fa' : theme.text.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {cc ? formatEur(cc.totalMonthly) : '—'}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 600 }}>{c.tickets.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.semantic.error }}>{c.incidents.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: c.incidentRate > 30 ? theme.semantic.error : theme.text.muted }}>{c.incidentRate}%</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary }}>{c.servicesCount}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: c.matchRate > 60 ? '#34d399' : theme.text.muted }}>{c.matchRate}%</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{c.activeSince}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Customer detail panel */}
      {detail && (
        <div style={{ ...sectionStyle, borderColor: theme.accent + '60' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: theme.text.primary }}>{detail.name}</h3>
            <button onClick={() => setSelectedCustomer(null)} style={{
              padding: '4px 12px', border: `1px solid ${theme.border.subtle}`, borderRadius: 6,
              backgroundColor: 'transparent', color: theme.text.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
            }}>Schließen</button>
          </div>

          {/* Detail KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Tickets', value: detail.tickets.toLocaleString(), color: theme.accent },
              { label: 'Incidents', value: detail.incidents.toLocaleString(), color: theme.semantic.error },
              { label: 'Incident-Rate', value: detail.incidentRate + '%', color: detail.incidentRate > 30 ? theme.semantic.error : '#34d399' },
              { label: 'Services', value: detail.servicesCount, color: '#fbbf24' },
              { label: 'Match-Rate', value: detail.matchRate + '%', color: detail.matchRate > 60 ? '#34d399' : theme.semantic.warning },
            ].map(kpi => (
              <div key={kpi.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: theme.text.muted }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Yearly chart */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tickets pro Jahr</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={Object.entries(detail.yearlyTickets).map(([y, c]) => ({ year: y, count: c }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis dataKey="year" stroke={theme.text.muted} fontSize={11} />
                  <YAxis stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={theme.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly line */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Monatlicher Verlauf</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={Object.entries(detail.monthlyTickets).map(([m, c]) => ({ month: m.slice(2), count: c }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis dataKey="month" stroke={theme.text.muted} fontSize={9} interval={5} />
                  <YAxis stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke={theme.accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Coda Contract Info */}
          {detail.codaContract && (() => {
            const cc = detail.codaContract
            return (
              <div style={{
                marginTop: 16, padding: '14px 16px',
                backgroundColor: '#1a2040', border: '1px solid #1e3a5f', borderRadius: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  ◈ Coda Vertragsinfo
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                  {[
                    { label: 'Level(s)', value: cc.levels.join(' + ') || '—' },
                    { label: 'MRR', value: formatEur(cc.totalMonthly) },
                    { label: 'ARR', value: formatEur(cc.totalAnnual) },
                    { label: 'Ø Nutzung', value: cc.avgUsage != null ? cc.avgUsage + ' %' : '—' },
                  ].map(kpi => (
                    <div key={kpi.label}>
                      <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 2 }}>{kpi.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa' }}>{kpi.value}</div>
                    </div>
                  ))}
                </div>
                {cc.parts.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 6 }}>VERTRAGSBESTANDTEILE</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {cc.parts.map(p => (
                        <span key={p} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          backgroundColor: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb',
                        }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {cc.contracts.length > 1 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 6 }}>EINZELVERTRÄGE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cc.contracts.map(con => (
                        <div key={con.contractName} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
                          <LevelBadge level={con.level} />
                          <span style={{ color: '#93c5fd' }}>{con.contractName}</span>
                          <span style={{ color: '#60a5fa', marginLeft: 'auto' }}>{formatEur(con.monthlyValue)}/mo</span>
                          {con.avgUsage != null && (
                            <span style={{ color: con.avgUsage > 100 ? '#f87171' : '#8b949e', minWidth: 60, textAlign: 'right' }}>{con.avgUsage} %</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Services + Assignees */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Services</div>
              {detail.services.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {detail.services.map(s => (
                    <span key={s.name} onClick={() => onServiceClick(s.name)} style={{
                      padding: '3px 10px', borderRadius: 9999, fontSize: 11, cursor: 'pointer',
                      backgroundColor: theme.bg.elevated, color: theme.text.secondary, border: `1px solid ${theme.border.subtle}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border.subtle; e.currentTarget.style.color = theme.text.secondary }}
                    >{s.name} ({s.count})</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: theme.text.muted }}>Keine Services zugeordnet</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Bearbeiter</div>
              {detail.topAssignees.map(a => {
                const max = detail.topAssignees[0]?.count || 1
                return (
                  <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                    <span style={{ width: 140, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    <div style={{ flex: 1, height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: 6, backgroundColor: theme.accent, borderRadius: 3, width: `${(a.count / max) * 100}%` }} />
                    </div>
                    <span style={{ minWidth: 40, textAlign: 'right', color: theme.text.muted }}>{a.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
