import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useMemo } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#8b949e']

export function CategoryView({ data, onServiceClick }) {
  const categories = useMemo(() => data.categories || [], [data])

  const chartData = useMemo(() =>
    categories.filter(c => c.tickets > 0).map(c => ({ name: c.name.length > 25 ? c.name.slice(0, 22) + '...' : c.name, fullName: c.name, tickets: c.tickets, services: c.services })),
  [categories])

  const pieData = useMemo(() =>
    categories.filter(c => c.tickets > 0).map(c => ({ name: c.name, value: c.tickets })),
  [categories])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Kategorien</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>{categories.length} Servicekategorien aus dem Coda-Katalog</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Tickets pro Kategorie</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
              <YAxis dataKey="name" type="category" width={180} stroke={theme.text.muted} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="tickets" fill={theme.accent} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Verteilung</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Detail</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Kategorie', 'Services', 'Tickets', 'Incidents', 'Incident-Rate'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`, color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.name} onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.bg.elevated} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[i % colors.length], marginRight: 8 }} />
                  <span style={{ color: theme.text.primary }}>{c.name}</span>
                </td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary }}>{c.services}</td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 600 }}>{c.tickets.toLocaleString()}</td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.semantic.error }}>{c.incidents.toLocaleString()}</td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: c.incidentRate > 30 ? theme.semantic.error : theme.text.muted }}>{c.incidentRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Expand services per category */}
        <div style={{ marginTop: 20 }}>
          {categories.filter(c => c.tickets > 0).map((c, i) => (
            <div key={c.name} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: colors[i % colors.length], marginBottom: 6 }}>{c.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.serviceNames.map(s => (
                  <span key={s} onClick={() => onServiceClick(s)} style={{
                    padding: '3px 10px', borderRadius: 9999, fontSize: 11, cursor: 'pointer',
                    backgroundColor: theme.bg.elevated, color: theme.text.secondary, border: `1px solid ${theme.border.subtle}`,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border.subtle; e.currentTarget.style.color = theme.text.secondary }}
                  >{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
