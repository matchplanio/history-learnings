import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useMemo } from 'react'
import { theme } from '../config/theme'

const statusBadge = (status) => {
  const s = theme.status[status] || theme.status.Template
  return { backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600 }
}
const typeBadge = { backgroundColor: theme.bg.elevated, color: theme.text.muted, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 500 }

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 16,
}

export function ServiceDetail({ service, onBack, onPersonClick }) {
  if (!service) return null

  const trend = useMemo(() => {
    if (!service.yearlyTickets) return []
    return Object.entries(service.yearlyTickets).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year))
  }, [service])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  return (
    <div>
      <span onClick={onBack} style={{ color: theme.accent, cursor: 'pointer', fontSize: 13, display: 'inline-block', marginBottom: 12 }}>
        ← Zurueck
      </span>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>{service.name}</h2>
          <a
            href={`https://levigo-bi.vercel.app/#service-mapping`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: theme.text.muted, textDecoration: 'none', fontSize: 11, padding: '3px 10px', borderRadius: 9999, border: `1px solid ${theme.border.subtle}`, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = theme.accent; e.currentTarget.style.borderColor = theme.accent }}
            onMouseLeave={e => { e.currentTarget.style.color = theme.text.muted; e.currentTarget.style.borderColor = theme.border.subtle }}
            title="Revenue-Zuordnung in PBI App"
          >PBI Mapping ↗</a>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={statusBadge(service.status)}>{service.status}</span>
          {service.type && <span style={typeBadge}>{service.type}</span>}
          {service.kategorie && <span style={typeBadge}>{service.kategorie}</span>}
          {service.unit && <span style={typeBadge}>{service.unit}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Ticket Volume */}
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Ticket-Volumen</h4>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: theme.accent }}>{service.tickets.toLocaleString()}</span>
            <span style={{ fontSize: 13, color: theme.text.muted }}>gesamt</span>
          </div>
          {trend.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                <XAxis dataKey="year" stroke={theme.text.muted} fontSize={11} />
                <YAxis stroke={theme.text.muted} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={theme.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team */}
        <div style={sectionStyle}>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Team ({service.topAssignees.length})</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Person', 'Tickets', 'Anteil'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${theme.border.default}`, color: theme.text.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {service.topAssignees.map(a => (
                <tr key={a.name}>
                  <td style={{ padding: '5px 8px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                    <span onClick={() => onPersonClick(a.name)} style={{ cursor: 'pointer', color: theme.accent }}>{a.name}</span>
                  </td>
                  <td style={{ padding: '5px 8px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary }}>{a.count.toLocaleString()}</td>
                  <td style={{ padding: '5px 8px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{service.tickets > 0 ? ((a.count / service.tickets) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* By Type */}
        {service.byType && Object.keys(service.byType).length > 0 && (
          <div style={sectionStyle}>
            <h4 style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Nach Typ</h4>
            {Object.entries(service.byType).sort(([,a], [,b]) => b - a).map(([type, count]) => {
              const max = Math.max(...Object.values(service.byType))
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ width: 130, color: theme.text.secondary }}>{type}</span>
                  <div style={{ flex: 1, height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: 6, backgroundColor: theme.accent, borderRadius: 3, width: `${(count / max) * 100}%` }} />
                  </div>
                  <span style={{ minWidth: 40, textAlign: 'right', color: theme.text.muted }}>{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* By Project */}
        {service.byProject && Object.keys(service.byProject).length > 0 && (
          <div style={sectionStyle}>
            <h4 style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Nach Projekt</h4>
            {Object.entries(service.byProject).sort(([,a], [,b]) => b - a).map(([proj, count]) => {
              const max = Math.max(...Object.values(service.byProject))
              return (
                <div key={proj} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ width: 80, color: theme.text.secondary }}>{proj}</span>
                  <div style={{ flex: 1, height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: 6, backgroundColor: theme.semantic.info, borderRadius: 3, width: `${(count / max) * 100}%` }} />
                  </div>
                  <span style={{ minWidth: 40, textAlign: 'right', color: theme.text.muted }}>{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Samples */}
        {service.samples && service.samples.length > 0 && (
          <div style={{ ...sectionStyle, gridColumn: '1 / -1' }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Beispiel-Tickets ({service.samples.length})</h4>
            {service.samples.map((s, i) => (
              <div key={i} style={{ backgroundColor: theme.bg.elevated, borderRadius: 6, padding: '8px 10px', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: theme.accent, fontWeight: 600, marginRight: 8 }}>{s.key}</span>
                <span style={{ color: theme.text.secondary }}>{s.summary}</span>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {service.beschreibung && (
          <div style={{ ...sectionStyle, gridColumn: '1 / -1' }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Beschreibung (Coda)</h4>
            <p style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 1.6 }}>{service.beschreibung}</p>
          </div>
        )}
      </div>
    </div>
  )
}
