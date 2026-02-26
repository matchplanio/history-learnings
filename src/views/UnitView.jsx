import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useMemo } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf']

export function UnitView({ data, onServiceClick }) {
  const units = useMemo(() => data.units || [], [data])
  const staff = useMemo(() => data.staff || [], [data])

  const chartData = useMemo(() =>
    units.filter(u => u.tickets > 0).map(u => ({
      name: u.kuerzel || u.name.slice(0, 15),
      fullName: u.name,
      tickets: u.tickets,
      services: u.services,
      people: u.people,
    })),
  [units])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Units</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>{units.length} Organisationseinheiten, {staff.length} Mitarbeitende</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Tickets pro Unit</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
            <XAxis dataKey="name" stroke={theme.text.muted} fontSize={11} />
            <YAxis stroke={theme.text.muted} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [v.toLocaleString(), p.payload.fullName]} />
            <Bar dataKey="tickets" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <rect key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Unit cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 12 }}>
        {units.map((u, i) => {
          const unitStaff = staff.filter(s => s.unit === u.name)
          return (
            <div key={u.name} style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colors[i % colors.length] }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: theme.text.primary }}>{u.name}</span>
                {u.kuerzel && <span style={{ fontSize: 11, color: theme.text.muted, backgroundColor: theme.bg.elevated, padding: '1px 6px', borderRadius: 4 }}>{u.kuerzel}</span>}
              </div>

              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors[i % colors.length] }}>{u.tickets.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: theme.text.muted }}>Tickets</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors[i % colors.length] }}>{u.services}</div>
                  <div style={{ fontSize: 11, color: theme.text.muted }}>Services</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors[i % colors.length] }}>{u.people}</div>
                  <div style={{ fontSize: 11, color: theme.text.muted }}>Team</div>
                </div>
                {u.fte && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors[i % colors.length] }}>{u.fte}</div>
                    <div style={{ fontSize: 11, color: theme.text.muted }}>FTE</div>
                  </div>
                )}
              </div>

              {/* Services */}
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Services</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {u.serviceNames.map(s => (
                  <span key={s} onClick={() => onServiceClick(s)} style={{
                    padding: '2px 8px', borderRadius: 9999, fontSize: 11, cursor: 'pointer',
                    backgroundColor: theme.bg.elevated, color: theme.text.secondary, transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = theme.accent}
                  onMouseLeave={e => e.currentTarget.style.color = theme.text.secondary}
                  >{s}</span>
                ))}
              </div>

              {/* Staff */}
              {unitStaff.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Mitarbeitende ({unitStaff.length})</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {unitStaff.map(s => (
                      <span key={s.name} style={{
                        padding: '2px 8px', borderRadius: 9999, fontSize: 11,
                        backgroundColor: theme.bg.elevated, color: theme.text.muted,
                      }}>{s.name} ({s.wochenstunden}h)</span>
                    ))}
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
