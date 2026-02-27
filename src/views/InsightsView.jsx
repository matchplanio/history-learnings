import { useState, useMemo } from 'react'
import { theme } from '../config/theme'

function formatEur(v) {
  if (!v && v !== 0) return '—'
  return '€' + v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const SEVERITY = {
  critical: { bg: '#2a1a1a', border: '#7f1d1d', badge: '#f87171', label: 'Kritisch' },
  warning:  { bg: '#2d2518', border: '#92400e', badge: '#fbbf24', label: 'Warnung' },
  info:     { bg: '#1a2040', border: '#1e3a5f', badge: '#60a5fa', label: 'Info' },
}

function SeverityBadge({ level }) {
  const s = SEVERITY[level]
  return (
    <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 4,
      backgroundColor: s.bg, color: s.badge, border: `1px solid ${s.border}`,
    }}>{s.label}</span>
  )
}

function Section({ title, severity, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const s = SEVERITY[severity]
  return (
    <div style={{
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '14px 16px',
          backgroundColor: s.bg,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ color: theme.text.muted, fontSize: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: theme.text.primary, flex: 1 }}>{title}</span>
        <span style={{
          fontSize: 18, fontWeight: 700, color: s.badge,
          minWidth: 32, textAlign: 'right',
        }}>{count}</span>
        <SeverityBadge level={severity} />
      </div>
      {open && (
        <div style={{ backgroundColor: theme.bg.card }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Row({ cols, highlight }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: cols.map(c => c.width || '1fr').join(' '),
        gap: 12,
        padding: '8px 16px',
        borderBottom: `1px solid ${theme.border.subtle}`,
        backgroundColor: hover ? theme.bg.elevated : highlight ? theme.accent + '08' : 'transparent',
        alignItems: 'center',
        transition: 'background 0.1s',
      }}
    >
      {cols.map((col, i) => (
        <div key={i} style={{ fontSize: col.fontSize || 13, color: col.color || theme.text.primary, fontWeight: col.bold ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {col.value}
        </div>
      ))}
    </div>
  )
}

function TableHeader({ cols }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols.map(c => c.width || '1fr').join(' '),
      gap: 12,
      padding: '8px 16px',
      borderBottom: `1px solid ${theme.border.default}`,
      backgroundColor: theme.bg.elevated,
    }}>
      {cols.map((col, i) => (
        <div key={i} style={{ fontSize: 11, color: theme.text.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: col.width }}>
          {col.label}
        </div>
      ))}
    </div>
  )
}

// ── Section 1: High-activity customers without a contract ──
function NoContractSection({ items }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() =>
    items.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
  , [items, search])

  const cols = [
    { label: 'Kunde', width: '2fr' },
    { label: 'Tickets', width: '80px' },
    { label: 'Incidents', width: '80px' },
    { label: 'Inc.-Rate', width: '80px' },
    { label: 'Aktiv seit', width: '80px' },
    { label: 'Top Services', width: '3fr' },
  ]

  return (
    <div>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border.subtle}`, backgroundColor: theme.bg.elevated }}>
        <p style={{ fontSize: 12, color: '#fca5a5', margin: '0 0 8px 0' }}>
          Diese Kunden generieren signifikanten Jira-Aufwand, haben aber keinen formellen Betreuungsvertrag in Coda.
          Mögliche Ursachen: historische Altverträge nicht digitalisiert, ad-hoc Betreuung, oder Vertragslücke.
        </p>
        <input
          placeholder="Suche…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ backgroundColor: theme.bg.input, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 12, padding: '4px 10px', outline: 'none', width: 200 }}
        />
        <span style={{ fontSize: 11, color: theme.text.muted, marginLeft: 8 }}>{filtered.length} von {items.length}</span>
      </div>
      <TableHeader cols={cols} />
      {filtered.slice(0, 30).map(c => (
        <Row key={c.name} highlight={c.tickets > 500} cols={[
          { value: c.name, bold: true, color: c.tickets > 500 ? '#fca5a5' : theme.text.primary, width: '2fr' },
          { value: c.tickets.toLocaleString(), bold: true, color: theme.accent, width: '80px' },
          { value: c.incidents.toLocaleString(), color: theme.semantic.error, width: '80px' },
          { value: c.incidentRate + '%', color: c.incidentRate > 30 ? theme.semantic.error : theme.text.muted, width: '80px' },
          { value: c.activeSince || '—', color: theme.text.muted, fontSize: 11, width: '80px' },
          { value: c.topServices?.map(s => s.name).join(', ') || '—', color: theme.text.secondary, fontSize: 11, width: '3fr' },
        ]} />
      ))}
      {filtered.length > 30 && (
        <div style={{ padding: '8px 16px', fontSize: 12, color: theme.text.muted, fontStyle: 'italic' }}>
          + {filtered.length - 30} weitere…
        </div>
      )}
    </div>
  )
}

// ── Section 2: Contracts with no Jira visibility ──
function ContractNoJiraSection({ items }) {
  const cols = [
    { label: 'Organisation', width: '2fr' },
    { label: 'Level', width: '120px' },
    { label: 'MRR', width: '100px' },
    { label: 'ARR', width: '100px' },
    { label: 'Ø Nutzung', width: '80px' },
    { label: 'Jira-Tickets', width: '90px' },
    { label: 'Vertragsbestandteile', width: '3fr' },
  ]

  return (
    <div>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border.subtle}`, backgroundColor: theme.bg.elevated }}>
        <p style={{ fontSize: 12, color: '#fde68a', margin: 0 }}>
          Aktive Verträge in Coda, die im Jira-System kaum oder gar nicht sichtbar sind.
          Mögliche Ursachen: anderes Ticketsystem, Kunden-Prefix nicht standardisiert, inaktiver Vertrag, oder Dienstleistung außerhalb von Jira.
        </p>
      </div>
      <TableHeader cols={cols} />
      {items.map(c => (
        <Row key={c.org + c.level} highlight={c.monthlyValue > 5000} cols={[
          { value: c.org, bold: true, color: c.monthlyValue > 5000 ? '#fde68a' : theme.text.primary, width: '2fr' },
          { value: c.level || '—', color: '#a78bfa', fontSize: 12, width: '120px' },
          { value: formatEur(c.monthlyValue), bold: c.monthlyValue > 1000, color: '#60a5fa', width: '100px' },
          { value: formatEur(c.annualValue), color: '#2dd4bf', fontSize: 12, width: '100px' },
          { value: c.avgUsage != null ? c.avgUsage + ' %' : '—', color: theme.text.muted, fontSize: 12, width: '80px' },
          { value: c.jiraTickets === 0 ? '⚠ 0' : c.jiraTickets, color: c.jiraTickets === 0 ? '#f87171' : theme.text.muted, width: '90px' },
          { value: c.parts?.join(', ') || '—', color: theme.text.secondary, fontSize: 11, width: '3fr' },
        ]} />
      ))}
    </div>
  )
}

// ── Section 3: Over-usage ──
function OverUsageSection({ items }) {
  const cols = [
    { label: 'Organisation', width: '2fr' },
    { label: 'Level', width: '120px' },
    { label: 'Nutzung', width: '100px' },
    { label: 'Überschreitung', width: '120px' },
    { label: 'MRR', width: '100px' },
    { label: 'Jira-Tickets', width: '90px' },
  ]

  return (
    <div>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border.subtle}`, backgroundColor: theme.bg.elevated }}>
        <p style={{ fontSize: 12, color: '#fca5a5', margin: 0 }}>
          Kunden mit einer Vertragsnutzung über 100 %. Das deutet auf Nachverhandlungsbedarf,
          mögliche Zusatzabrechnung oder Upgrade-Potenzial hin.
        </p>
      </div>
      <TableHeader cols={cols} />
      {items.map(c => {
        const excess = Math.round(c.avgUsage - 100)
        return (
          <Row key={c.org + c.level} highlight cols={[
            { value: c.org, bold: true, color: '#fca5a5', width: '2fr' },
            { value: c.level || '—', color: '#a78bfa', fontSize: 12, width: '120px' },
            { value: c.avgUsage + ' %', bold: true, color: c.avgUsage > 150 ? '#f87171' : '#fbbf24', width: '100px' },
            { value: '+' + excess + ' %', color: '#fb923c', bold: true, width: '120px' },
            { value: formatEur(c.monthlyValue), color: '#60a5fa', width: '100px' },
            { value: c.jiraTickets.toLocaleString(), color: theme.text.muted, width: '90px' },
          ]} />
        )
      })}
    </div>
  )
}

// ── Section 4: High incident rate without contract ──
function HighRiskSection({ items }) {
  const cols = [
    { label: 'Kunde', width: '2fr' },
    { label: 'Incident-Rate', width: '110px' },
    { label: 'Tickets', width: '80px' },
    { label: 'Incidents', width: '80px' },
    { label: 'Aktiv seit', width: '80px' },
    { label: 'Top Services', width: '3fr' },
  ]

  return (
    <div>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border.subtle}`, backgroundColor: theme.bg.elevated }}>
        <p style={{ fontSize: 12, color: '#fca5a5', margin: 0 }}>
          Kunden ohne Vertrag, bei denen über 40 % der Tickets als Incidents klassifiziert sind.
          Hohe Incident-Rate ohne Vertrag bedeutet: Aufwand entsteht, wird aber nicht vertraglich gedeckt.
        </p>
      </div>
      <TableHeader cols={cols} />
      {items.map(c => (
        <Row key={c.name} highlight cols={[
          { value: c.name, bold: true, color: '#fca5a5', width: '2fr' },
          { value: c.incidentRate + ' %', bold: true, color: c.incidentRate > 60 ? '#f87171' : '#fb923c', width: '110px' },
          { value: c.tickets.toLocaleString(), color: theme.text.primary, width: '80px' },
          { value: c.incidents.toLocaleString(), color: theme.semantic.error, width: '80px' },
          { value: c.activeSince || '—', color: theme.text.muted, fontSize: 11, width: '80px' },
          { value: c.topServices?.map(s => s.name).join(', ') || '—', color: theme.text.secondary, fontSize: 11, width: '3fr' },
        ]} />
      ))}
    </div>
  )
}

// ── Section 5: Coda staff not visible in Jira ──
function StaffGapSection({ items }) {
  const meaningful = items.filter(p =>
    !['Alex Automation', 'Thomas Tester', 'Projektraum'].includes(p.name) &&
    !p.name.toLowerCase().includes('besprechung')
  )

  return (
    <div>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border.subtle}`, backgroundColor: theme.bg.elevated }}>
        <p style={{ fontSize: 12, color: '#93c5fd', margin: 0 }}>
          Interne Coda-Personen, die keinem Jira-Assignee zugeordnet werden konnten.
          Mögliche Ursachen: neues Teammitglied, anderer Namens-Alias in Jira, oder Rolle außerhalb von Jira.
        </p>
      </div>
      {meaningful.length === 0 ? (
        <div style={{ padding: 16, fontSize: 12, color: theme.text.muted, fontStyle: 'italic' }}>
          Alle internen Coda-Personen konnten Jira-Assignees zugeordnet werden.
        </div>
      ) : meaningful.map(p => (
        <div key={p.name} style={{ padding: '8px 16px', borderBottom: `1px solid ${theme.border.subtle}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', flex: 1 }}>{p.name}</span>
          {p.team && <span style={{ fontSize: 11, color: theme.text.muted }}>Team: {p.team}</span>}
          {p.email && <span style={{ fontSize: 11, color: theme.text.muted }}>{p.email}</span>}
        </div>
      ))}
    </div>
  )
}

// ── Main View ──
export function InsightsView({ data }) {
  const ins = data.insights || {}
  const stats = ins.stats || {}

  const totalFindings = (stats.noContractHighActivity || 0)
    + (stats.contractNoJira || 0)
    + (stats.overUsage || 0)
    + (stats.highRiskNoContract || 0)

  // Revenue at risk: MRR of invisible contracts
  const revenueAtRisk = (ins.contractNoJira || []).reduce((s, c) => s + (c.monthlyValue || 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>
          Insights & Lückenanalyse
        </h1>
        <p style={{ color: theme.text.secondary, marginTop: 6, fontSize: 14 }}>
          Widersprüche und Blindspots zwischen Jira-Aktivität, Coda-Verträgen und Organisations-Daten.
        </p>

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Findings gesamt', value: totalFindings, color: '#f87171' },
            { label: 'Kunden ohne Vertrag (aktiv)', value: stats.noContractHighActivity, color: '#fbbf24' },
            { label: 'Verträge ohne Jira-Spur', value: stats.contractNoJira, color: '#f87171' },
            { label: 'MRR ohne Jira-Sichtbarkeit', value: '€' + Math.round(revenueAtRisk).toLocaleString('de-DE'), color: '#fb923c' },
            { label: 'Übernutzungen', value: stats.overUsage, color: '#f87171' },
            { label: 'Hochrisiko ohne Vertrag', value: stats.highRiskNoContract, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '8px 16px',
              backgroundColor: theme.bg.card,
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: theme.text.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <Section
        title="Verträge ohne Jira-Sichtbarkeit"
        severity="critical"
        count={stats.contractNoJira}
        defaultOpen
      >
        <ContractNoJiraSection items={ins.contractNoJira || []} />
      </Section>

      <Section
        title="Übernutzung: Kunden über Vertragskontingent"
        severity="critical"
        count={stats.overUsage}
        defaultOpen
      >
        <OverUsageSection items={ins.overUsage || []} />
      </Section>

      <Section
        title="Hochrisiko-Kunden ohne Betreuungsvertrag"
        severity="critical"
        count={stats.highRiskNoContract}
      >
        <HighRiskSection items={ins.highRiskNoContract || []} />
      </Section>

      <Section
        title="Aktive Kunden ohne Betreuungsvertrag"
        severity="warning"
        count={stats.noContractHighActivity}
      >
        <NoContractSection items={ins.noContractHighActivity || []} />
      </Section>

      <Section
        title="Interne Coda-Personen ohne Jira-Aktivität"
        severity="info"
        count={stats.codaStaffNotInJira}
      >
        <StaffGapSection items={ins.codaStaffNotInJira || []} />
      </Section>
    </div>
  )
}
