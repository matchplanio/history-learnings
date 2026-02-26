import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { useMemo } from 'react'
import { theme } from '../config/theme'

const statusBadge = (status) => {
  const s = theme.status[status] || theme.status.Template
  return { backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '1px 6px', borderRadius: 9999, fontSize: 10, fontWeight: 600 }
}

export function TrendView({ data }) {
  const yearlyData = useMemo(() => {
    return Object.entries(data.yearlyTrend)
      .map(([year, info]) => ({ year, count: info.total }))
      .sort((a, b) => a.year.localeCompare(b.year))
  }, [data])

  const topServices = useMemo(() => {
    return data.services.filter(s => s.tickets > 0).sort((a, b) => b.tickets - a.tickets).slice(0, 10)
  }, [data])

  const trendByService = useMemo(() => {
    const years = Object.keys(data.yearlyTrend).sort()
    return years.map(year => {
      const row = { year }
      topServices.forEach(s => { row[s.name] = s.yearlyTickets?.[year] || 0 })
      return row
    })
  }, [data, topServices])

  const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#8b949e']

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  const sectionStyle = {
    backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Trends</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>Ticket-Entwicklung ueber {yearlyData.length} Jahre</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Gesamtentwicklung</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
            <XAxis dataKey="year" stroke={theme.text.muted} fontSize={12} />
            <YAxis stroke={theme.text.muted} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill={theme.accent} name="Tickets" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top 10 Services</h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={trendByService}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
            <XAxis dataKey="year" stroke={theme.text.muted} fontSize={12} />
            <YAxis stroke={theme.text.muted} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {topServices.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={colors[i]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Ranking</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['#', 'Service', 'Status', 'Tickets', 'Team', 'Anteil'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`, color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.services.filter(s => s.tickets > 0).sort((a, b) => b.tickets - a.tickets).map((s, i) => (
              <tr key={s.name} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.bg.elevated} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{i + 1}</td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary }}>{s.name}</td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}><span style={statusBadge(s.status)}>{s.status}</span></td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary }}>{s.tickets.toLocaleString()}</td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{s.topAssignees.length}</td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{((s.tickets / data.meta.matchedTickets) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
