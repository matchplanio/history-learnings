import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useMemo } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

export function UnmatchedView({ data }) {
  const u = data.unmatched

  const typeData = useMemo(() =>
    Object.entries(u.byType).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  [u])

  const yearlyData = useMemo(() =>
    Object.entries(u.yearlyTickets).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year)),
  [u])

  const monthlyData = useMemo(() =>
    Object.entries(u.monthlyTickets).map(([month, count]) => ({ month: month.slice(2), count })).sort((a, b) => a.month.localeCompare(b.month)),
  [u])

  const statusData = useMemo(() =>
    Object.entries(u.byStatus).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  [u])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  const unmatchedPct = ((u.count / data.meta.totalTickets) * 100).toFixed(1)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Unmatched Tickets</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>{u.count.toLocaleString()} Tickets ({unmatchedPct}%) konnten keinem Service zugeordnet werden</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Unmatched', value: u.count.toLocaleString(), color: theme.semantic.warning },
          { label: 'Anteil', value: unmatchedPct + '%', color: theme.semantic.error },
          { label: 'Ticket-Typen', value: Object.keys(u.byType).length, color: theme.accent },
          { label: 'Top Assignees', value: u.topAssignees.length, color: theme.semantic.info },
        ].map(kpi => (
          <div key={kpi.label} style={sectionStyle}>
            <div style={{ fontSize: 11, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* By Type */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Nach Typ</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
              <YAxis dataKey="name" type="category" width={130} stroke={theme.text.muted} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={theme.semantic.warning} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Status */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Nach Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
              <YAxis dataKey="name" type="category" width={130} stroke={theme.text.muted} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={theme.semantic.info} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Yearly trend */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Jaehrliche Entwicklung</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis dataKey="year" stroke={theme.text.muted} fontSize={11} />
              <YAxis stroke={theme.text.muted} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={theme.semantic.warning} name="Unmatched" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly trend */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Monatlicher Verlauf</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis dataKey="month" stroke={theme.text.muted} fontSize={9} interval={5} />
              <YAxis stroke={theme.text.muted} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke={theme.semantic.warning} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top Assignees */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top Bearbeiter (unmatched)</h3>
          {u.topAssignees.map(a => {
            const max = u.topAssignees[0]?.count || 1
            return (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                <span style={{ width: 160, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <div style={{ flex: 1, height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: 6, backgroundColor: theme.semantic.warning, borderRadius: 3, width: `${(a.count / max) * 100}%` }} />
                </div>
                <span style={{ minWidth: 50, textAlign: 'right', color: theme.text.muted }}>{a.count.toLocaleString()}</span>
              </div>
            )
          })}
        </div>

        {/* Top Words (Service Discovery) */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Haeufige Begriffe</h3>
          <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 12 }}>Potenzielle neue Services oder fehlende Aliases</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {u.topWords.map(w => {
              const maxC = u.topWords[0]?.count || 1
              const opacity = 0.4 + (w.count / maxC) * 0.6
              const size = 11 + (w.count / maxC) * 6
              return (
                <span key={w.word} style={{
                  fontSize: size, color: theme.accent, opacity,
                  padding: '2px 6px', cursor: 'default',
                }} title={`${w.count} Treffer`}>
                  {w.word}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
