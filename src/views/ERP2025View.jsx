import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useMemo, useState } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#8b949e']

const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

function matchColor(rate) {
  if (rate > 80) return theme.semantic.success
  if (rate >= 40) return theme.semantic.warning
  return theme.semantic.error
}

function MatchBar({ rate, height = 6 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, backgroundColor: theme.bg.elevated, borderRadius: height / 2, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height, backgroundColor: matchColor(rate), borderRadius: height / 2, width: `${rate}%`, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, color: matchColor(rate), fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{rate}%</span>
    </div>
  )
}

function ServicePills({ services, max = 5, onServiceClick }) {
  const visible = services.slice(0, max)
  const remaining = services.length - max
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {visible.map((s, i) => (
        <span
          key={s.name}
          onClick={(e) => { e.stopPropagation(); onServiceClick?.(s.name) }}
          style={{
            padding: '2px 8px', borderRadius: 9999, fontSize: 10, cursor: 'pointer',
            backgroundColor: colors[i % colors.length] + '20', color: colors[i % colors.length],
            border: `1px solid ${colors[i % colors.length]}40`,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors[i % colors.length]; e.currentTarget.style.backgroundColor = colors[i % colors.length] + '30' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors[i % colors.length] + '40'; e.currentTarget.style.backgroundColor = colors[i % colors.length] + '20' }}
        >
          {s.name} ({s.count})
        </span>
      ))}
      {remaining > 0 && (
        <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, color: theme.text.muted, backgroundColor: theme.bg.elevated }}>
          +{remaining}
        </span>
      )}
    </div>
  )
}

export function ERP2025View({ data, profiles, onServiceClick }) {
  const meta = profiles?.meta || {}
  const projects = useMemo(() => profiles?.projectProfiles || [], [profiles])
  const customers = useMemo(() => profiles?.customerProfiles || [], [profiles])

  const [sortBy, setSortBy] = useState('tickets')
  const [filterMinTickets, setFilterMinTickets] = useState(5)
  const [expandedCustomer, setExpandedCustomer] = useState(null)

  // Aggregated stats
  const stats = useMemo(() => {
    const totalTickets = meta.totalTickets || 0
    const totalMatched = Math.round(totalTickets * (meta.overallMatchRate || 0) / 100)
    const totalUnmatched = totalTickets - totalMatched
    return { totalTickets, totalMatched, totalUnmatched, matchRate: meta.overallMatchRate || 0 }
  }, [meta])

  // Filtered and sorted customers
  const filtered = useMemo(() =>
    customers
      .filter(c => c.tickets2025 >= filterMinTickets)
      .sort((a, b) => {
        if (sortBy === 'tickets') return b.tickets2025 - a.tickets2025
        if (sortBy === 'matchRate') return b.matchRate - a.matchRate
        if (sortBy === 'unmatched') return (b.tickets2025 - b.matched) - (a.tickets2025 - a.matched)
        return b.tickets2025 - a.tickets2025
      }),
  [customers, sortBy, filterMinTickets])

  // Coverage gap: top 20 by unmatched count
  const gapData = useMemo(() =>
    [...customers]
      .map(c => ({
        name: c.name.length > 15 ? c.name.slice(0, 12) + '...' : c.name,
        fullName: c.name,
        matched: c.matched,
        unmatched: c.tickets2025 - c.matched,
      }))
      .sort((a, b) => b.unmatched - a.unmatched)
      .slice(0, 20),
  [customers])

  const expandedDetail = expandedCustomer ? customers.find(c => c.name === expandedCustomer) : null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>
          ERP 2025 - Jira Service Coverage
        </h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>
          {meta.totalTickets?.toLocaleString()} Tickets | {meta.totalCustomers} Kunden | {meta.totalProjects} Projekte | {meta.overallMatchRate}% Match Rate
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: '2025 Tickets', value: stats.totalTickets.toLocaleString(), color: theme.accent },
          { label: 'Matched', value: stats.totalMatched.toLocaleString(), color: theme.semantic.success },
          { label: 'Unmatched', value: stats.totalUnmatched.toLocaleString(), color: theme.semantic.error },
          { label: 'Match Rate', value: stats.matchRate + '%', color: matchColor(stats.matchRate) },
        ].map(kpi => (
          <div key={kpi.label} style={sectionStyle}>
            <div style={{ fontSize: 11, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Project Profiles */}
      <div style={{ ...sectionStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${theme.border.subtle}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, margin: 0 }}>Jira-Projekte</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {projects.map((proj, pi) => {
            const monthlyData = Object.entries(proj.monthly || {}).map(([m, c]) => ({ month: m.slice(5), count: c }))
            const topServices = (proj.services || []).slice(0, 5)
            const topCustomers = (proj.topCustomers || []).slice(0, 5)
            return (
              <div key={proj.name} style={{
                padding: 20,
                borderRight: pi < 2 ? `1px solid ${theme.border.subtle}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: theme.text.primary }}>{proj.name}</span>
                  <span style={{ fontSize: 12, color: theme.text.muted }}>{proj.tickets2025.toLocaleString()} Tickets</span>
                </div>

                <MatchBar rate={proj.matchRate} height={8} />

                {/* Monthly sparkline */}
                {monthlyData.length > 0 && (
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <ResponsiveContainer width="100%" height={60}>
                      <LineChart data={monthlyData}>
                        <XAxis dataKey="month" hide />
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Tickets']} labelFormatter={(l) => '2025-' + l} />
                        <Line type="monotone" dataKey="count" stroke={colors[pi]} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top Services */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Top Services</div>
                  <ServicePills services={topServices} max={5} onServiceClick={onServiceClick} />
                </div>

                {/* Top Customers */}
                <div>
                  <div style={{ fontSize: 10, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Top Kunden</div>
                  {topCustomers.map((c, ci) => {
                    const maxCount = topCustomers[0]?.count || 1
                    return (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 11 }}>
                        <span style={{ width: 90, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <div style={{ flex: 1, height: 4, backgroundColor: theme.bg.elevated, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: 4, backgroundColor: colors[pi], borderRadius: 2, width: `${(c.count / maxCount) * 100}%`, opacity: 1 - ci * 0.12 }} />
                        </div>
                        <span style={{ minWidth: 30, textAlign: 'right', color: theme.text.muted, fontSize: 10 }}>{c.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div style={{ ...sectionStyle, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.text.muted }}>Sortierung:</div>
        {[
          { key: 'tickets', label: 'Tickets' },
          { key: 'matchRate', label: 'Match Rate' },
          { key: 'unmatched', label: 'Unmatched' },
        ].map(s => (
          <button key={s.key} onClick={() => setSortBy(s.key)} style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: `1px solid ${sortBy === s.key ? theme.accent : theme.border.subtle}`,
            backgroundColor: sortBy === s.key ? theme.accent + '20' : 'transparent',
            color: sortBy === s.key ? theme.accent : theme.text.secondary,
            fontFamily: 'inherit',
          }}>{s.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: theme.text.muted }}>Min. Tickets:</span>
          {[5, 10, 25, 50].map(n => (
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

      {/* Customer Table */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>
          Kundenliste ({filtered.length})
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Kunde', 'Tickets', 'Matched', 'Match%', 'Top Services', 'Unmatched'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`,
                  color: theme.text.muted, fontWeight: 600, fontSize: 12,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const unmatched = c.tickets2025 - c.matched
              const isExpanded = expandedCustomer === c.name
              return [
                <tr
                  key={c.name}
                  onClick={() => setExpandedCustomer(isExpanded ? null : c.name)}
                  style={{ cursor: 'pointer', backgroundColor: isExpanded ? theme.accent + '10' : 'transparent' }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = theme.bg.elevated }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: isExpanded ? 600 : 400 }}>
                    <span style={{ marginRight: 6, fontSize: 10, color: theme.text.muted }}>{isExpanded ? '▾' : '▸'}</span>
                    {c.name}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 600 }}>{c.tickets2025.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.semantic.success }}>{c.matched.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, minWidth: 120 }}>
                    <MatchBar rate={c.matchRate} />
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, maxWidth: 300 }}>
                    <ServicePills services={c.services} max={3} onServiceClick={onServiceClick} />
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: unmatched > 0 ? theme.semantic.error : theme.text.muted, fontWeight: unmatched > 0 ? 600 : 400 }}>
                    {unmatched}
                  </td>
                </tr>,
                isExpanded && expandedDetail && (
                  <tr key={c.name + '-detail'}>
                    <td colSpan={6} style={{ padding: 0, borderBottom: `1px solid ${theme.border.subtle}` }}>
                      <div style={{ padding: '16px 20px', backgroundColor: theme.bg.elevated }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                          {/* Services breakdown */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Services</div>
                            {expandedDetail.services.length > 0 ? expandedDetail.services.map((s, si) => {
                              const maxCount = expandedDetail.services[0]?.count || 1
                              return (
                                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
                                  <span
                                    onClick={(e) => { e.stopPropagation(); onServiceClick?.(s.name) }}
                                    style={{ width: 140, color: colors[si % colors.length], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                  >{s.name}</span>
                                  <div style={{ flex: 1, height: 5, backgroundColor: theme.bg.card, borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: 5, backgroundColor: colors[si % colors.length], borderRadius: 3, width: `${(s.count / maxCount) * 100}%` }} />
                                  </div>
                                  <span style={{ minWidth: 30, textAlign: 'right', color: theme.text.muted, fontSize: 10 }}>{s.count}</span>
                                </div>
                              )
                            }) : (
                              <div style={{ fontSize: 12, color: theme.text.muted }}>Keine Services zugeordnet</div>
                            )}
                          </div>

                          {/* Ticket types */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Ticket-Typen</div>
                            {Object.entries(expandedDetail.types || {}).sort(([, a], [, b]) => b - a).map(([type, count], ti) => (
                              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: theme.text.secondary }}>
                                <span>{type}</span>
                                <span style={{ color: theme.text.muted, fontWeight: 600 }}>{count}</span>
                              </div>
                            ))}
                          </div>

                          {/* Unmatched samples */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                              Unmatched Samples ({expandedDetail.unmatchedSamples?.length || 0})
                            </div>
                            {(expandedDetail.unmatchedSamples || []).length > 0 ? (
                              expandedDetail.unmatchedSamples.slice(0, 5).map((sample, si) => (
                                <div key={si} style={{
                                  fontSize: 10, color: theme.text.muted, padding: '4px 8px', marginBottom: 3,
                                  backgroundColor: theme.bg.card, borderRadius: 4, border: `1px solid ${theme.border.subtle}`,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }} title={sample}>
                                  {sample}
                                </div>
                              ))
                            ) : (
                              <div style={{ fontSize: 12, color: theme.semantic.success }}>Alle Tickets gematcht</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
      </div>

      {/* Coverage Gap Analysis */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Coverage Gap Analysis - Top 20 Kunden nach Unmatched</h3>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={gapData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
            <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
            <YAxis dataKey="name" type="category" width={110} stroke={theme.text.muted} fontSize={11} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, name, p) => [v.toLocaleString(), name === 'matched' ? 'Matched' : 'Unmatched']}
              labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
            />
            <Bar dataKey="matched" stackId="a" fill={theme.accent} radius={[0, 0, 0, 0]} name="matched" />
            <Bar dataKey="unmatched" stackId="a" fill={theme.semantic.error} radius={[0, 4, 4, 0]} name="unmatched" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
