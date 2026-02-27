import { useState, useMemo } from 'react'
import { theme } from '../config/theme'

const UNIT_COLORS = {
  'Managed Services':          { bg: '#1a2040', text: '#60a5fa', border: '#1e3a5f' },
  'Customer Service':          { bg: '#1a2e2a', text: '#34d399', border: '#064e3b' },
  'Engineering & Consulting':  { bg: '#2d2518', text: '#fbbf24', border: '#92400e' },
  'Cloud Platform Services':   { bg: '#1e1a2e', text: '#a78bfa', border: '#4c1d95' },
  'Internal Functions':        { bg: '#21262d', text: '#8b949e', border: '#30363d' },
  'Sales & Marketing':         { bg: '#2a1a1a', text: '#f87171', border: '#7f1d1d' },
  'Geschäftsführung':          { bg: '#1a2518', text: '#86efac', border: '#14532d' },
}

function UnitBadge({ unit }) {
  const col = UNIT_COLORS[unit] || { bg: '#21262d', text: '#8b949e', border: '#30363d' }
  return (
    <span style={{
      fontSize: 10,
      padding: '2px 7px',
      borderRadius: 4,
      backgroundColor: col.bg,
      color: col.text,
      border: `1px solid ${col.border}`,
      whiteSpace: 'nowrap',
    }}>
      {unit}
    </span>
  )
}

function CoverageMeter({ coverage }) {
  const pct = Math.min(coverage, 100)
  const color = pct >= 50 ? theme.semantic.success
    : pct >= 25 ? theme.accent
    : pct >= 10 ? theme.semantic.warning
    : theme.text.muted

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1,
        height: 5,
        borderRadius: 3,
        backgroundColor: theme.bg.input,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 12, color, minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {coverage}%
      </span>
    </div>
  )
}

function CarrierRow({ carrier, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick && onClick(carrier.name)}
      style={{
        padding: '10px 14px',
        borderRadius: 6,
        backgroundColor: hover ? theme.bg.elevated : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${hover ? theme.border.default : 'transparent'}`,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: carrier.isCurrent ? theme.semantic.success : theme.text.primary,
        }}>
          {carrier.name}
        </span>
        {carrier.isCurrent && (
          <span style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            backgroundColor: '#1a2e2a',
            color: theme.semantic.success,
            border: `1px solid #064e3b`,
          }}>
            aktuell
          </span>
        )}
        {carrier.ismsTickets !== undefined && (
          <span style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            backgroundColor: '#2d2518',
            color: '#fbbf24',
            border: `1px solid #92400e`,
          }}>
            {carrier.ismsTickets} ISMS-Tickets
          </span>
        )}
        <span style={{ fontSize: 11, color: theme.text.muted, marginLeft: 'auto' }}>
          {carrier.totalTickets.toLocaleString()} gesamt · {carrier.roleTickets.toLocaleString()} Rollen-Tickets
        </span>
      </div>
      <CoverageMeter coverage={carrier.coverage} />
      {carrier.topServices?.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {carrier.topServices.map(s => (
            <span key={s.name} style={{
              fontSize: 11,
              color: theme.text.secondary,
              backgroundColor: theme.bg.input,
              padding: '1px 7px',
              borderRadius: 4,
              border: `1px solid ${theme.border.subtle}`,
            }}>
              {s.name} <span style={{ color: theme.accent }}>({s.count})</span>
            </span>
          ))}
          {carrier.topProjects?.map(p => (
            <span key={p.name} style={{
              fontSize: 11,
              color: '#a78bfa',
              backgroundColor: '#1e1a2e',
              padding: '1px 7px',
              borderRadius: 4,
              border: `1px solid #4c1d95`,
            }}>
              {p.name} <span style={{ color: theme.text.muted }}>({p.count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RoleCard({ role, onPersonClick }) {
  const [expanded, setExpanded] = useState(false)
  const carriers = role.historicCarriers || []
  const hasCarriers = carriers.length > 0

  return (
    <div style={{
      backgroundColor: theme.bg.card,
      border: `1px solid ${theme.border.default}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.bg.elevated}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {/* Expand toggle */}
        <span style={{
          color: theme.text.muted,
          fontSize: 13,
          marginTop: 2,
          flexShrink: 0,
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▶</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>
              {role.role}
            </span>
            <UnitBadge unit={role.unit} />
            {!role.observable && (
              <span style={{ fontSize: 10, color: theme.text.muted, fontStyle: 'italic' }}>
                nicht messbar (kein Jira-Signal)
              </span>
            )}
          </div>

          {role.kurzbeschreibung && (
            <p style={{ fontSize: 12, color: theme.text.secondary, margin: 0, lineHeight: 1.5 }}>
              {role.kurzbeschreibung.split('\n')[0].slice(0, 180)}
            </p>
          )}

          {/* Metrics row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: theme.text.muted }}>
              FTE: <span style={{ color: theme.text.primary }}>{role.fte || '—'}</span>
            </span>
            {role.currentOccupants?.length > 0 && (
              <span style={{ fontSize: 11, color: theme.text.muted }}>
                Aktuell: <span style={{ color: theme.semantic.success }}>
                  {role.currentOccupants.slice(0, 3).join(', ')}
                  {role.currentOccupants.length > 3 ? ` +${role.currentOccupants.length - 3}` : ''}
                </span>
              </span>
            )}
            {role.observable && (
              <span style={{
                fontSize: 11,
                color: hasCarriers ? theme.accent : theme.text.muted,
                fontWeight: 600,
              }}>
                {hasCarriers ? `${carriers.length} historische Träger` : 'Keine Matches'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${theme.border.subtle}` }}>
          {/* Aufgaben */}
          {role.aufgaben && (
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.subtle}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Aufgaben & Verantwortung
              </div>
              <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {role.aufgaben.slice(0, 400)}
                {role.aufgaben.length > 400 && '…'}
              </div>
            </div>
          )}

          {/* Carriers */}
          {role.observable ? (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.text.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Historische Rollenträger (Jira-Analyse)
              </div>
              {hasCarriers ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {carriers.map(c => (
                    <CarrierRow key={c.name} carrier={c} onClick={onPersonClick} />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: theme.text.muted, fontStyle: 'italic', padding: '8px 0' }}>
                  Keine historischen Tickets mit ausreichendem Rollenbezug gefunden.
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '12px 16px', fontSize: 12, color: theme.text.muted, fontStyle: 'italic' }}>
              Diese Rolle ist aus Jira-Daten nicht direkt ableitbar (z. B. strategische, kaufmännische oder interne Koordinationsrollen).
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function HistoricRolesView({ data, onPersonClick }) {
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [showNonObservable, setShowNonObservable] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const roles = data.historicRoles || []

  const units = useMemo(() => {
    const set = new Set(roles.map(r => r.unit))
    return ['all', ...Array.from(set).sort()]
  }, [roles])

  const filtered = useMemo(() => {
    return roles.filter(r => {
      if (selectedUnit !== 'all' && r.unit !== selectedUnit) return false
      if (!showNonObservable && !r.observable) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return r.role.toLowerCase().includes(q) ||
          r.unit.toLowerCase().includes(q) ||
          r.currentOccupants?.some(p => p.toLowerCase().includes(q)) ||
          r.historicCarriers?.some(c => c.name.toLowerCase().includes(q))
      }
      return true
    })
  }, [roles, selectedUnit, showNonObservable, searchTerm])

  const observableCount = roles.filter(r => r.observable).length
  const totalCarriers = roles.reduce((s, r) => s + (r.historicCarriers?.length || 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>
          Historic Roles
        </h1>
        <p style={{ color: theme.text.secondary, marginTop: 6, fontSize: 14 }}>
          Wer hat vor Einführung der offiziellen Rollen bereits in welcher Rolle gearbeitet?
          Jira-Tickets zeigen, wer historisch welche Funktionen übernommen hat.
        </p>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Rollen gesamt', value: roles.length },
            { label: 'Messbar (Jira)', value: observableCount },
            { label: 'Historische Carrier', value: totalCarriers },
            { label: 'Einzigartige Träger', value: new Set(roles.flatMap(r => r.historicCarriers?.map(c => c.name) || [])).size },
          ].map(s => (
            <div key={s.label} style={{
              padding: '8px 16px',
              backgroundColor: theme.bg.card,
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent }}>{s.value}</div>
              <div style={{ fontSize: 11, color: theme.text.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Suche nach Rolle, Person…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            backgroundColor: theme.bg.input,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            color: theme.text.primary,
            fontSize: 13,
            padding: '6px 12px',
            minWidth: 220,
            outline: 'none',
          }}
        />
        <select
          value={selectedUnit}
          onChange={e => setSelectedUnit(e.target.value)}
          style={{
            backgroundColor: theme.bg.input,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            color: theme.text.primary,
            fontSize: 13,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          {units.map(u => (
            <option key={u} value={u}>{u === 'all' ? 'Alle Units' : u}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: theme.text.secondary }}>
          <input
            type="checkbox"
            checked={showNonObservable}
            onChange={e => setShowNonObservable(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Nicht-messbare Rollen anzeigen
        </label>
        <span style={{ fontSize: 12, color: theme.text.muted, marginLeft: 'auto' }}>
          {filtered.length} Rollen
        </span>
      </div>

      {/* Methodology note */}
      <div style={{
        padding: '10px 14px',
        backgroundColor: '#1a2040',
        border: `1px solid #1e3a5f`,
        borderRadius: 6,
        fontSize: 12,
        color: '#93c5fd',
        marginBottom: 20,
        lineHeight: 1.6,
      }}>
        <strong>Methodik:</strong> Für jede Coda-Rolle wurden spezifische Jira-Services und Projekte
        als Rollensignal definiert. Coverage = Anteil der Rollentickets an den Gesamttickets einer Person.
        Rollen wie Unit Lead, Portfolio Manager oder Marketing-Rollen haben kein direkt messbares Jira-Signal
        und werden als „nicht messbar" markiert.
      </div>

      {/* Role cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(role => (
          <RoleCard key={`${role.unit}-${role.role}`} role={role} onPersonClick={onPersonClick} />
        ))}
      </div>
    </div>
  )
}
