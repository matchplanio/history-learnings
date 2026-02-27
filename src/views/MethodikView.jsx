import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useMemo, useState } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#8b949e']

const pipelineColors = {
  service_matching: '#22d3ee',
  project_categorization: '#fbbf24',
  customer_extraction: '#34d399',
  hersteller_mapping: '#c084fc',
  revenue_mapping: '#f87171',
}

export function MethodikView({ data }) {
  const meth = useMemo(() => data.methodology || {}, [data])
  const pipelines = useMemo(() => meth.pipelines || [], [meth])
  const serviceMatchers = useMemo(() => meth.serviceMatchers || [], [meth])
  const projectCategories = useMemo(() => meth.projectCategories || [], [meth])
  const dataSources = useMemo(() => meth.dataSources || [], [meth])
  const [expandedPipeline, setExpandedPipeline] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const historicRoles = useMemo(() => data.historicRoles || [], [data])
  const observableRoles = useMemo(() => historicRoles.filter(r => r.observable), [historicRoles])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

  // Pipeline match rates for chart
  const pipelineRates = useMemo(() =>
    pipelines.filter(p => p.stats.rate).map(p => ({
      name: p.name.split(' ')[0],
      fullName: p.name,
      rate: p.stats.rate,
      id: p.id,
    })),
  [pipelines])

  // Data source summary
  const totalRecords = useMemo(() => dataSources.reduce((s, d) => s + d.records, 0), [dataSources])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Methodik & Signale</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>
          {pipelines.length} Pipelines, {dataSources.length} Datenquellen, {totalRecords.toLocaleString()} Datensaetze
        </p>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'overview', label: 'Uebersicht' },
          { id: 'services', label: 'Service-Matching' },
          { id: 'projects', label: 'Projekt-Kategorien' },
          { id: 'sources', label: 'Datenquellen' },
          { id: 'historic-roles', label: 'Historic Roles' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{
            padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${activeSection === tab.id ? theme.accent : theme.border.subtle}`,
            backgroundColor: activeSection === tab.id ? theme.accent + '20' : 'transparent',
            color: activeSection === tab.id ? theme.accent : theme.text.secondary,
            fontFamily: 'inherit',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <>
          {/* Pipeline KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pipelines.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
            {pipelines.map(p => (
              <div key={p.id} style={{ ...sectionStyle, borderLeft: `3px solid ${pipelineColors[p.id] || theme.accent}`, cursor: 'pointer' }}
                onClick={() => setExpandedPipeline(expandedPipeline === p.id ? null : p.id)}>
                <div style={{ fontSize: 10, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: pipelineColors[p.id] || theme.accent }}>
                  {p.stats.rate ? p.stats.rate + '%' : Object.values(p.stats)[0]?.toLocaleString?.() || '—'}
                </div>
                <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>
                  {p.stats.matched ? `${p.stats.matched.toLocaleString()} / ${p.stats.total.toLocaleString()}` :
                   p.stats.categorized ? `${p.stats.categorized} / ${p.stats.total}` :
                   p.stats.extracted ? `${p.stats.extracted} / ${p.stats.total}` :
                   `${p.stats.manufacturers || p.stats.revenueGroups} Eintraege`}
                </div>
              </div>
            ))}
          </div>

          {/* Match rate comparison */}
          {pipelineRates.length > 0 && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Zuordnungsraten im Vergleich</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineRates} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis type="number" domain={[0, 100]} stroke={theme.text.muted} fontSize={11} tickFormatter={v => v + '%'} />
                  <YAxis dataKey="name" type="category" width={120} stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [v + '%', p.payload.fullName]} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {pipelineRates.map((p, i) => <Cell key={i} fill={pipelineColors[p.id] || colors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pipeline detail cards */}
          {pipelines.map(p => (
            <div key={p.id} style={{ ...sectionStyle, borderLeft: `3px solid ${pipelineColors[p.id] || theme.accent}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>{p.name}</h3>
                  <p style={{ fontSize: 12, color: theme.text.muted, margin: 0 }}>{p.description}</p>
                </div>
                <button onClick={() => setExpandedPipeline(expandedPipeline === p.id ? null : p.id)} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${theme.border.subtle}`, backgroundColor: 'transparent',
                  color: theme.text.secondary, fontFamily: 'inherit',
                }}>{expandedPipeline === p.id ? 'Weniger' : 'Details'}</button>
              </div>

              {/* Signal badge */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                  backgroundColor: (pipelineColors[p.id] || theme.accent) + '20',
                  color: pipelineColors[p.id] || theme.accent }}>
                  Signal: {p.signal}
                </span>
                {p.inputSources.map(src => (
                  <span key={src} style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11,
                    backgroundColor: theme.bg.elevated, color: theme.text.secondary }}>
                    {src}
                  </span>
                ))}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {Object.entries(p.stats).map(([key, val]) => (
                  <div key={key} style={{ fontSize: 12 }}>
                    <span style={{ color: theme.text.muted }}>{key}: </span>
                    <span style={{ color: theme.text.primary, fontWeight: 600 }}>
                      {typeof val === 'number' ? (key === 'rate' ? val + '%' : val.toLocaleString()) : val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Expanded: Steps */}
              {expandedPipeline === p.id && (
                <div style={{ marginTop: 16, padding: 16, backgroundColor: theme.bg.elevated, borderRadius: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>Verarbeitungsschritte:</div>
                  {p.steps.map((step, i) => (
                    <div key={i} style={{ fontSize: 12, color: theme.text.secondary, marginBottom: 4, paddingLeft: 8 }}>
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Data flow diagram */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Datenfluss</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', padding: '20px 0' }}>
              {/* Sources */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                {dataSources.slice(0, 5).map(d => (
                  <div key={d.name} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    backgroundColor: theme.bg.elevated, color: theme.text.secondary, border: `1px solid ${theme.border.subtle}`,
                    whiteSpace: 'nowrap' }}>
                    {d.name} ({d.records.toLocaleString()})
                  </div>
                ))}
              </div>

              {/* Arrow */}
              <div style={{ fontSize: 24, color: theme.text.muted }}>→</div>

              {/* Processing */}
              <div style={{ padding: '16px 24px', borderRadius: 8, backgroundColor: theme.accent + '15',
                border: `1px solid ${theme.accent}40`, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 4 }}>generate_data.py</div>
                <div style={{ fontSize: 11, color: theme.text.muted }}>ETL Pipeline</div>
                <div style={{ fontSize: 11, color: theme.text.muted }}>{pipelines.length} Zuordnungsschritte</div>
              </div>

              {/* Arrow */}
              <div style={{ fontSize: 24, color: theme.text.muted }}>→</div>

              {/* Output */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                <div style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  backgroundColor: '#34d39920', color: '#34d399', border: `1px solid #34d39940` }}>
                  data.json ({(data.meta?.totalTickets || 0).toLocaleString()} Tickets)
                </div>
                <div style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11,
                  backgroundColor: theme.bg.elevated, color: theme.text.secondary, border: `1px solid ${theme.border.subtle}` }}>
                  {data.meta?.matchedTickets?.toLocaleString() || '—'} matched ({data.meta?.matchRate}%)
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'services' && (
        <>
          {/* Service matching explanation */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>Wie funktioniert Service-Matching?</h3>
            <p style={{ fontSize: 13, color: theme.text.secondary, margin: '0 0 12px 0', lineHeight: 1.6 }}>
              Jedes Jira-Ticket wird gegen {serviceMatchers.length > 0 ? serviceMatchers.reduce((s, m) => s + m.patterns, 0) : '—'} Regex-Pattern
              getestet. Die Pattern sind nach Laenge sortiert (spezifischste zuerst). Jeder Service hat mindestens seinen exakten Namen
              als Match-Pattern, plus optionale Aliases fuer gaengige Varianten, Fehlermeldungen und Alert-Formate.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 16px', borderRadius: 6, backgroundColor: theme.bg.elevated }}>
                <span style={{ fontSize: 11, color: theme.text.muted }}>Match-Felder: </span>
                <span style={{ fontSize: 12, color: theme.accent, fontWeight: 600 }}>Summary + Description</span>
              </div>
              <div style={{ padding: '8px 16px', borderRadius: 6, backgroundColor: theme.bg.elevated }}>
                <span style={{ fontSize: 11, color: theme.text.muted }}>Strategie: </span>
                <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>Longest Pattern First, First Match Wins</span>
              </div>
              <div style={{ padding: '8px 16px', borderRadius: 6, backgroundColor: theme.bg.elevated }}>
                <span style={{ fontSize: 11, color: theme.text.muted }}>MIME-Decoding: </span>
                <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>Ja (=?utf-8?Q?...?=)</span>
              </div>
            </div>
          </div>

          {/* Service matcher table */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>
              Top {serviceMatchers.length} Services nach Ticket-Zuordnung
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Service', 'Tickets', 'Pattern', 'Beispiel-Aliases'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Tickets' || h === 'Pattern' ? 'right' : 'left',
                      padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`,
                      color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serviceMatchers.map(m => {
                  const max = serviceMatchers[0]?.tickets || 1
                  return (
                    <tr key={m.service}>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 500 }}>
                        {m.service}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                          <div style={{ width: 60, height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: 6, backgroundColor: theme.accent, borderRadius: 3, width: `${(m.tickets / max) * 100}%` }} />
                          </div>
                          <span style={{ minWidth: 45, color: theme.accent, fontWeight: 600 }}>{m.tickets.toLocaleString()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, textAlign: 'right', color: theme.text.muted }}>
                        {m.patterns}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted, fontSize: 11, fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.aliases.length > 0 ? m.aliases.join(', ') : '(nur Namens-Match)'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pattern distribution chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top 15 Services (Tickets)</h3>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={serviceMatchers.slice(0, 15).map(m => ({ name: m.service.length > 22 ? m.service.slice(0, 19) + '...' : m.service, tickets: m.tickets }))} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
                  <YAxis dataKey="name" type="category" width={170} stroke={theme.text.muted} fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="tickets" fill={theme.accent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Pattern-Anzahl pro Service</h3>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={serviceMatchers.slice(0, 15).map(m => ({ name: m.service.length > 22 ? m.service.slice(0, 19) + '...' : m.service, patterns: m.patterns }))} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
                  <YAxis dataKey="name" type="category" width={170} stroke={theme.text.muted} fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="patterns" fill="#c084fc" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeSection === 'projects' && (
        <>
          {/* Project categorization explanation */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>Wie funktioniert Projekt-Kategorisierung?</h3>
            <p style={{ fontSize: 13, color: theme.text.secondary, margin: '0 0 12px 0', lineHeight: 1.6 }}>
              SXPP-Projekte werden nach Keywords in der Summary kategorisiert. Die Reihenfolge der Kategorien bestimmt die Prioritaet
              (spezifischere Kategorien wie "Linux-Consulting" kommen vor generischeren wie "Migration/vDC").
              17 Projekte haben manuelle Overrides fuer Faelle, die kein Keyword-Pattern abdeckt.
            </p>
          </div>

          {/* Category rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Kategorien & Keywords</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Kategorie', 'Projekte', 'Keywords'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Projekte' ? 'right' : 'left',
                        padding: '6px 8px', borderBottom: `1px solid ${theme.border.default}`,
                        color: theme.text.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectCategories.map(c => (
                    <tr key={c.category}>
                      <td style={{ padding: '5px 8px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 600 }}>
                        {c.category}
                      </td>
                      <td style={{ padding: '5px 8px', borderBottom: `1px solid ${theme.border.subtle}`, textAlign: 'right', color: theme.accent, fontWeight: 600 }}>
                        {c.count}
                      </td>
                      <td style={{ padding: '5px 8px', borderBottom: `1px solid ${theme.border.subtle}`, fontSize: 10, fontFamily: 'monospace', color: theme.text.muted }}>
                        {c.keywords.length > 0 ? c.keywords.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Verteilung</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={projectCategories.filter(c => c.count > 0)} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={2}>
                    {projectCategories.filter(c => c.count > 0).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer + Hersteller rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 12 }}>Kunden-Extraktion</h3>
              <div style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 12, lineHeight: 1.6 }}>
                Kundennamen werden aus dem Summary-Prefix extrahiert, z.B. "<span style={{ color: '#fbbf24' }}>BARESEL</span>: Migration Exchange..."
              </div>
              <div style={{ padding: 12, backgroundColor: theme.bg.elevated, borderRadius: 6, fontFamily: 'monospace', fontSize: 11, color: theme.text.muted, lineHeight: 1.8 }}>
                <div>Regex: <span style={{ color: theme.accent }}>^([Name]):\s</span></div>
                <div>Filter: System-Prefixe (levigo-Mon, Check_MK)</div>
                <div>Filter: ESX-Hosts (a-esx-01)</div>
                <div>Filter: Prefix &gt; 25 Zeichen</div>
                <div style={{ marginTop: 8, color: '#34d399' }}>
                  Ergebnis: {pipelines.find(p => p.id === 'customer_extraction')?.stats.extracted || '—'} / {pipelines.find(p => p.id === 'customer_extraction')?.stats.total || '—'} Projekte
                  ({pipelines.find(p => p.id === 'customer_extraction')?.stats.rate || '—'}%)
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 12 }}>Hersteller-Mapping</h3>
              <div style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 12, lineHeight: 1.6 }}>
                ERP-Hersteller-IDs werden via Artikelbeschreibungen zu Klartextnamen aufgeloest.
              </div>
              <div style={{ padding: 12, backgroundColor: theme.bg.elevated, borderRadius: 6, fontSize: 12 }}>
                {(meth.herstellerCategories || []).map(c => (
                  <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: theme.text.secondary }}>{c.category}</span>
                    <span style={{ color: theme.text.muted }}>{c.count} Hersteller ({c.members.slice(0, 3).join(', ')}...)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'historic-roles' && (
        <>
          {/* Fragestellung */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>Fragestellung</h3>
            <p style={{ fontSize: 13, color: theme.text.secondary, margin: '0 0 12px 0', lineHeight: 1.7 }}>
              Die offiziellen Coda-Rollen existieren erst seit 2024/2025. Jira-Tickets reichen jedoch bis 2018 zurück.
              Die Kernfrage: <strong style={{ color: theme.text.primary }}>Wer hat vor Einführung der offiziellen Rollen
              bereits implizit in welcher Funktion gearbeitet?</strong> Das zeigt, welche Personen natürliche
              Kompetenzträger für eine Rolle sind — unabhängig davon, ob sie sie je formal inne hatten.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Rollen gesamt', value: historicRoles.length, color: theme.accent },
                { label: 'Mit Jira-Signal', value: observableRoles.length, color: '#34d399' },
                { label: 'Nicht messbar', value: historicRoles.length - observableRoles.length, color: theme.text.muted },
                { label: 'Historische Carrier', value: historicRoles.reduce((s, r) => s + (r.historicCarriers?.length || 0), 0), color: '#fbbf24' },
              ].map(s => (
                <div key={s.label} style={{ padding: '8px 16px', borderRadius: 6, backgroundColor: theme.bg.elevated, border: `1px solid ${theme.border.subtle}` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: theme.text.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-Schritt-Methodik */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Vorgehen in 3 Schritten</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                {
                  step: '1', color: '#22d3ee',
                  title: 'Rollensignal definieren',
                  desc: 'Für jede Coda-Rolle werden charakteristische Jira-Services und Projekte als "Rollensignal" festgelegt. Service Desk Agent → SD-Tickets; ISMS-Berater → Tickets mit ISMS-Keywords.',
                },
                {
                  step: '2', color: '#fbbf24',
                  title: 'Coverage berechnen',
                  desc: 'Für jede Person: Coverage = Rollentickets / Gesamttickets. Eine hohe Coverage bedeutet: die Person arbeitete überwiegend in diesem Bereich. Ergänzt durch Absolut-Schwellen.',
                },
                {
                  step: '3', color: '#34d399',
                  title: 'Carrier ranken & filtern',
                  desc: 'Sortierung nach coverage × min(totalTickets, 5000) — balanciert Qualität und Quantität. Bots, System-Accounts und Personen unter Mindestschwellen werden ausgeschlossen.',
                },
              ].map(s => (
                <div key={s.step} style={{ padding: 16, borderRadius: 6, backgroundColor: theme.bg.elevated, borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 6 }}>Schritt {s.step}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rollensignale Tabelle */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Rollensignale (messbare Rollen)</h3>
            <p style={{ fontSize: 12, color: theme.text.muted, marginBottom: 16 }}>
              Für jede messbare Rolle wurden spezifische Jira-Services/Projekte als Signal definiert sowie Mindestschwellen festgelegt.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Rolle', 'Services / Projekte als Signal', 'Min. Coverage', 'Min. Tickets abs.', 'Signal-Typ'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 10px',
                      borderBottom: `1px solid ${theme.border.default}`,
                      color: theme.text.muted, fontWeight: 600, fontSize: 11,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'Service Desk Agent (CuSe)', signal: 'Service Desk', signalType: 'Service', minCov: '20%', minAbs: '100', typeColor: '#22d3ee' },
                  { role: 'Support Agent 2nd Level (MS)', signal: '13 MS-Services + SD/SDMS', signalType: 'Service + Projekt', minCov: '20%', minAbs: '30', typeColor: '#22d3ee' },
                  { role: 'Support Agent 2nd Level (CP)', signal: '10 CP-Services + IEO', signalType: 'Service + Projekt', minCov: '5%', minAbs: '20', typeColor: '#22d3ee' },
                  { role: 'Operations Engineer (MS)', signal: 'Monitoring, Backup, Infrastruktur, Checkmk, 1Password', signalType: 'Service', minCov: '15%', minAbs: '30', typeColor: '#22d3ee' },
                  { role: 'Operations Engineer (CP)', signal: 'vDC, Housing, WireGuard, TaRZ, Openshift, SRB + IEO', signalType: 'Service + Projekt', minCov: '12%', minAbs: '30', typeColor: '#22d3ee' },
                  { role: 'System Engineer Senior (EnCo)', signal: 'vCIO + SXPP', signalType: 'Service + Projekt', minCov: '5%', minAbs: '50', typeColor: '#fbbf24' },
                  { role: 'System Engineer Junior (EnCo)', signal: 'vCIO + SXPP', signalType: 'Service + Projekt', minCov: '3%', minAbs: '60', typeColor: '#fbbf24' },
                  { role: 'Senior Berater Informationssicherheit', signal: 'ISMS-Keywords (ISO 27001, TISAX, Audit…)', signalType: 'Keyword-Signal', minCov: '0.1%', minAbs: '3', typeColor: '#f87171' },
                  { role: 'Software Engineer Senior (EnCo)', signal: 'IEO', signalType: 'Projekt', minCov: '30%', minAbs: '—', typeColor: '#fbbf24' },
                  { role: 'Administrator Interne IT', signal: 'M365, managed Atlassian, AntiSpam', signalType: 'Service', minCov: '5%', minAbs: '20', typeColor: '#22d3ee' },
                ].map(row => (
                  <tr key={row.role}>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 600 }}>{row.role}</td>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.secondary, fontSize: 11 }}>{row.signal}</td>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.accent, fontWeight: 600, textAlign: 'right' }}>{row.minCov}</td>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted, textAlign: 'right' }}>{row.minAbs}</td>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, fontWeight: 600,
                        backgroundColor: row.typeColor + '20', color: row.typeColor }}>
                        {row.signalType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Entscheidungslog */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Entscheidungslog: Stichproben & Korrekturen</h3>
            <p style={{ fontSize: 12, color: theme.text.muted, marginBottom: 16, lineHeight: 1.6 }}>
              Nach der Erstimplementierung wurden Stichproben durchgeführt. Jede Abweichung wurde analysiert
              und führte zu einer Anpassung der Schwellen oder Signaldefinition.
            </p>
            {[
              {
                issue: 'Zweite Datenquelle: Coda Spaces (Go2Guy)',
                finding: 'Die Jira-Analyse zeigt historische Aktivität, sagt aber nichts darüber aus, wer formal als verantwortlich designiert ist. Coda Workspace HQ enthält eine "db Spaces"-Tabelle mit 40 Spaces (Dienste, Units, Initiativen) und Go2Guy-Zuordnungen.',
                decision: 'Coda Spaces API wird live bei jedem generate_data.py-Lauf abgerufen. Carrier, die für relevante Spaces (z.B. "cmd-r Monitoring") oder ihre Unit ("Unit: Managed Service") als Go2Guy eingetragen sind, erhalten ein ◈-Badge in der Ansicht.',
                color: '#a78bfa',
                icon: '◈',
              },
              {
                issue: 'local-tecuser mit 96–97% Coverage',
                finding: 'System-Account des Monitoring-Bots taucht als "Carrier" für mehrere Rollen auf.',
                decision: 'Zur BOT_ACCOUNTS-Ausschlussliste hinzugefügt.',
                color: '#f87171',
                icon: '✗',
              },
              {
                issue: 'System Engineer (Junior): False Positives (Ralf Keipert, Vincenzo Biasi)',
                finding: 'SXPP (levigo-Beratungsprojekte) wird von Account Managern genutzt, um Kundenprojekte zu tracken — nicht nur von Ingenieuren. Ralf Keipert (41 SXPP-Tickets) und Vincenzo Biasi (39) schafften die erste Schwelle.',
                decision: 'min_role_tickets_abs von 30 → 60 angehoben. AMs haben real deutlich weniger Beratungstickets als Ingenieure.',
                color: '#fbbf24',
                icon: '→',
              },
              {
                issue: 'System Engineer (Senior): Oliver Bausch, Anne Schnee als False Positives',
                finding: 'Gleiche Ursache: SXPP-Nutzung durch GF und Customer Service Unit Lead für Projektkoordination.',
                decision: 'min_role_tickets_abs=50 für Senior eingeführt.',
                color: '#fbbf24',
                icon: '→',
              },
              {
                issue: 'Senior Berater ISMS: 0 Carrier trotz klarer Kandidaten',
                finding: 'Ursprüngliches Signal: SXPP-Projekt + ISMS-Services. Problem: max(SXPP, ISMS) ließ SXPP-Tickets als ISMS-Signal zählen → viele Nicht-ISMS-Leute mit hoher Coverage. Nach Korrektur: min_coverage=1% zu streng — ISMS-Tickets sind 0,4% der Gesamttätigkeit.',
                decision: 'Reines Keyword-Signal: Tickets mit ISMS-Begriffen (ISO 27001, TISAX, Audit, BSI, Informationssicherheit…). SXPP vollständig entfernt. min_coverage=0.1%, min_role_tickets_abs=3 (mindestens 3 ISMS-Keyword-Tickets).',
                color: '#f87171',
                icon: '↺',
              },
              {
                issue: 'Gino-Mario Franciosa (aktueller Service Desk Agent) nicht sichtbar',
                finding: 'Carrier-Cap war bei 15. Gino-Mario Franciosa war auf Rang 16 — knapp unter der Sichtbarkeitsgrenze.',
                decision: 'Carrier-Cap auf 20 erhöht.',
                color: '#34d399',
                icon: '↑',
              },
            ].map((d, i) => (
              <div key={i} style={{
                marginBottom: 12, padding: '12px 16px', borderRadius: 6,
                backgroundColor: theme.bg.elevated, borderLeft: `3px solid ${d.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: d.color, fontWeight: 700 }}>{d.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary }}>{d.issue}</span>
                </div>
                <div style={{ fontSize: 12, color: theme.text.secondary, marginBottom: 6, lineHeight: 1.6 }}>
                  <strong style={{ color: theme.text.muted }}>Befund:</strong> {d.finding}
                </div>
                <div style={{ fontSize: 12, color: '#34d399', lineHeight: 1.6 }}>
                  <strong>Entscheidung:</strong> {d.decision}
                </div>
              </div>
            ))}
          </div>

          {/* Carrier-Algorithmus */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Carrier-Algorithmus</h3>
              <div style={{ padding: 14, backgroundColor: theme.bg.elevated, borderRadius: 6, fontFamily: 'monospace', fontSize: 12, lineHeight: 2, color: theme.text.secondary }}>
                <div><span style={{ color: '#fbbf24' }}>role_tix</span> = svc_tickets + proj_tickets</div>
                <div style={{ color: '#8b949e', fontSize: 11 }}>  (oder: svc_tix + isms_keyword_tix für ISMS-Rolle)</div>
                <div style={{ marginTop: 4 }}><span style={{ color: '#22d3ee' }}>coverage</span> = role_tix / total_tix</div>
                <div style={{ marginTop: 4 }}><span style={{ color: '#34d399' }}>sort_key</span> = coverage × min(total_tix, 5000)</div>
                <div style={{ color: '#8b949e', fontSize: 11 }}>  (Cap bei 5000 dämpft Volumen-Dominanz)</div>
                <div style={{ marginTop: 8, color: '#f87171' }}>Filter: BOT_ACCOUNTS ausschließen</div>
                <div style={{ color: '#f87171' }}>Filter: coverage {'<'} min_coverage → skip</div>
                <div style={{ color: '#f87171' }}>Filter: role_tix {'<'} min_role_tickets_abs → skip</div>
                <div style={{ color: '#f87171' }}>Filter: total_tix {'<'} min_tickets → skip</div>
                <div style={{ marginTop: 8, color: theme.text.muted }}>Cap: top 20 Carrier pro Rolle</div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Nicht-messbare Rollen</h3>
              <p style={{ fontSize: 12, color: theme.text.secondary, marginBottom: 12, lineHeight: 1.6 }}>
                Manche Rollen haben kein direktes Jira-Signal, weil sie strategischer oder kaufmännischer Natur sind.
                Sie werden in der Ansicht als „nicht messbar" markiert.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {historicRoles.filter(r => !r.observable).slice(0, 12).map(r => (
                  <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 4, backgroundColor: theme.bg.elevated }}>
                    <span style={{ fontSize: 12, color: theme.text.secondary }}>{r.role}</span>
                    <span style={{ fontSize: 10, color: theme.text.muted, fontStyle: 'italic' }}>{r.unit}</span>
                  </div>
                ))}
                {historicRoles.filter(r => !r.observable).length > 12 && (
                  <div style={{ fontSize: 11, color: theme.text.muted, textAlign: 'center', padding: 4 }}>
                    +{historicRoles.filter(r => !r.observable).length - 12} weitere
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'sources' && (
        <>
          {/* Data sources table */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Datenquellen</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Quelle', 'Datei', 'Typ', 'Datensaetze', 'Stand'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Datensaetze' ? 'right' : 'left',
                      padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`,
                      color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataSources.map(d => (
                  <tr key={d.name}>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted, fontFamily: 'monospace', fontSize: 11 }}>{d.file}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                      <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600,
                        backgroundColor: d.type === 'JSON' ? '#22d3ee20' : d.type === 'CSV' ? '#34d39920' : '#c084fc20',
                        color: d.type === 'JSON' ? '#22d3ee' : d.type === 'CSV' ? '#34d399' : '#c084fc',
                      }}>{d.type}</span>
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`, textAlign: 'right', color: theme.accent, fontWeight: 600 }}>{d.records.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, fontSize: 12, color: theme.text.muted, textAlign: 'right' }}>
              Gesamt: {totalRecords.toLocaleString()} Datensaetze aus {dataSources.length} Quellen
            </div>
          </div>

          {/* Source type distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Nach Typ</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dataSources} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis dataKey="name" stroke={theme.text.muted} fontSize={10} angle={-20} textAnchor="end" height={50} />
                  <YAxis stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="records" radius={[4, 4, 0, 0]}>
                    {dataSources.map((d, i) => <Cell key={i} fill={d.type === 'JSON' ? '#22d3ee' : d.type === 'CSV' ? '#34d399' : '#c084fc'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Verarbeitungskette</h3>
              <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 2 }}>
                <div><span style={{ color: '#22d3ee', fontWeight: 600 }}>1.</span> Jira JSON → 53.737 Tickets laden</div>
                <div><span style={{ color: '#34d399', fontWeight: 600 }}>2.</span> Coda CSVs → Services, Sales, Staff, Units</div>
                <div><span style={{ color: '#fbbf24', fontWeight: 600 }}>3.</span> Service-Matching (Regex, {data.meta?.matchRate}% Rate)</div>
                <div><span style={{ color: '#f87171', fontWeight: 600 }}>4.</span> Kunden-Extraktion (Prefix-Pattern)</div>
                <div><span style={{ color: '#c084fc', fontWeight: 600 }}>5.</span> Projekt-Kategorisierung (Keywords)</div>
                <div><span style={{ color: '#fb923c', fontWeight: 600 }}>6.</span> PBI DAX → Revenue + Hersteller</div>
                <div><span style={{ color: '#a78bfa', fontWeight: 600 }}>7.</span> Coda Spaces API → Go2Guy-Zuordnungen (Historic Roles)</div>
                <div><span style={{ color: '#60a5fa', fontWeight: 600 }}>8.</span> Aggregation → data.json Output</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
