import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useMemo, useState } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf']

export function UnitView({ data, onServiceClick }) {
  const units = useMemo(() => (data.units || []).filter(u => u.name !== 'Ohne Unit'), [data])
  const staff = useMemo(() => data.staff || [], [data])
  const [perspective, setPerspective] = useState('kf') // 'catalog' or 'kf'

  const chartData = useMemo(() =>
    units
      .map(u => ({
        name: u.kuerzel || u.name.slice(0, 15),
        fullName: u.name,
        catalogTickets: u.tickets,
        kfTickets: u.kfTickets || 0,
        services: u.services,
        kfServices: u.kfServices || 0,
      }))
      .filter(u => perspective === 'kf' ? u.kfTickets > 0 : u.catalogTickets > 0)
      .sort((a, b) => perspective === 'kf' ? b.kfTickets - a.kfTickets : b.catalogTickets - a.catalogTickets),
  [units, perspective])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  const ticketKey = perspective === 'kf' ? 'kfTickets' : 'catalogTickets'

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Units</h2>
          <p style={{ fontSize: 13, color: theme.text.muted }}>{units.length} Organisationseinheiten, {staff.length} Mitarbeitende</p>
        </div>
        <div style={{ display: 'flex', gap: 4, backgroundColor: theme.bg.elevated, borderRadius: 6, padding: 2 }}>
          {[
            { id: 'kf', label: 'Kernfunktionen' },
            { id: 'catalog', label: 'Katalog' },
          ].map(p => (
            <button key={p.id} onClick={() => setPerspective(p.id)} style={{
              padding: '6px 14px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              backgroundColor: perspective === p.id ? theme.accent : 'transparent',
              color: perspective === p.id ? '#fff' : theme.text.muted,
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {perspective === 'kf' && (
        <div style={{ ...sectionStyle, backgroundColor: theme.accent + '10', borderColor: theme.accent + '30', marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 1.6 }}>
            <strong style={{ color: theme.text.primary }}>Kernfunktionen-Perspektive:</strong> Ordnet Services den Units zu basierend auf der Organisationsstruktur aus dem Betriebshandbuch. Services mit expliziter Katalog-Unit behalten ihre Zuordnung. Services ohne Unit werden anhand von Kernfunktionen-Keywords zugeordnet.
          </div>
        </div>
      )}

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>
          Tickets pro Unit {perspective === 'kf' ? '(Kernfunktionen)' : '(Katalog)'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
            <XAxis dataKey="name" stroke={theme.text.muted} fontSize={11} />
            <YAxis stroke={theme.text.muted} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [v.toLocaleString(), p.payload.fullName]} />
            <Bar dataKey={ticketKey} radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Unit cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 12 }}>
        {units
          .sort((a, b) => perspective === 'kf' ? (b.kfTickets || 0) - (a.kfTickets || 0) : b.tickets - a.tickets)
          .map((u, i) => {
          const unitStaff = staff.filter(s => s.unit === u.name)
          const tickets = perspective === 'kf' ? (u.kfTickets || 0) : u.tickets
          const svcCount = perspective === 'kf' ? (u.kfServices || 0) : u.services
          const kfTopServices = u.kfTopServices || []

          return (
            <div key={u.name} style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colors[i % colors.length] }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: theme.text.primary }}>{u.name}</span>
                {u.kuerzel && <span style={{ fontSize: 11, color: theme.text.muted, backgroundColor: theme.bg.elevated, padding: '1px 6px', borderRadius: 4 }}>{u.kuerzel}</span>}
                {u.kategorie && <span style={{ fontSize: 10, color: theme.accent, backgroundColor: theme.accent + '15', padding: '1px 6px', borderRadius: 4 }}>{u.kategorie}</span>}
              </div>

              {/* Kernfunktionen */}
              {u.kernfunktionen && u.kernfunktionen.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.kernfunktionen.map(kf => (
                      <span key={kf} style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        backgroundColor: theme.accent + '15', color: theme.accent,
                      }}>{kf}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Beschreibung */}
              {u.beschreibung && (
                <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 12, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                  {u.beschreibung.split('\n').filter(l => l.trim().startsWith('*')).slice(0, 3).map((l, i) => (
                    <div key={i}>{l.trim()}</div>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors[i % colors.length] }}>{tickets.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: theme.text.muted }}>Tickets {perspective === 'kf' ? '(KF)' : '(Kat.)'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors[i % colors.length] }}>{svcCount}</div>
                  <div style={{ fontSize: 11, color: theme.text.muted }}>Services</div>
                </div>
                {u.fte && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors[i % colors.length] }}>{u.fte}</div>
                    <div style={{ fontSize: 11, color: theme.text.muted }}>FTE</div>
                  </div>
                )}
                {/* Show project tickets when in KF mode */}
                {perspective === 'kf' && (u.projectTickets || 0) > 0 && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#fbbf24' }}>{u.projectTickets.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: theme.text.muted }}>Projekte</div>
                  </div>
                )}
                {/* Show catalog tickets as reference when in KF mode */}
                {perspective === 'kf' && u.tickets > 0 && u.tickets !== tickets && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: theme.text.muted }}>{u.tickets.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: theme.text.muted }}>Katalog</div>
                  </div>
                )}
              </div>

              {/* Project breakdown (when in KF perspective and has projects) */}
              {perspective === 'kf' && (u.projectTickets || 0) > 0 && (
                <div style={{ marginBottom: 12, padding: '8px 12px', backgroundColor: '#fbbf24' + '10', borderRadius: 6, border: `1px solid ${'#fbbf24'}20` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', marginBottom: 6 }}>
                    Jira-Projekte ({u.projectTickets} Tickets)
                  </div>
                  {u.projectByType && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                      {Object.entries(u.projectByType).map(([typ, cnt]) => (
                        <span key={typ} style={{ fontSize: 11, color: theme.text.secondary }}>
                          {typ}: <strong>{cnt}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  {u.projectTopAssignees && u.projectTopAssignees.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {u.projectTopAssignees.slice(0, 6).map(a => (
                        <span key={a.name} style={{
                          padding: '1px 6px', borderRadius: 9999, fontSize: 10,
                          backgroundColor: theme.bg.elevated, color: theme.text.muted,
                        }}>{a.name} ({a.count})</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* KF Top Services (when in KF perspective) */}
              {perspective === 'kf' && kfTopServices.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Services ({kfTopServices.length})
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    {kfTopServices.slice(0, 10).map(s => {
                      const isFromOther = s.catalogUnit && s.catalogUnit !== u.name
                      return (
                        <div key={s.name} onClick={() => onServiceClick(s.name)} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px',
                          borderRadius: 4, cursor: 'pointer', fontSize: 12,
                          backgroundColor: 'transparent', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.bg.elevated}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ color: theme.text.secondary }}>
                            {s.name}
                            {isFromOther && (
                              <span style={{ fontSize: 10, color: theme.text.muted, marginLeft: 6 }}>
                                (Kat: {s.catalogUnit})
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: 11, color: theme.text.muted, fontVariantNumeric: 'tabular-nums' }}>
                            {s.tickets.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Catalog Services (when in catalog perspective) */}
              {perspective === 'catalog' && u.serviceNames.length > 0 && (
                <>
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
                </>
              )}

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
