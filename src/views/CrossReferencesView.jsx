import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts'
import { useMemo, useState } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#8b949e']
const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }

const tabs = [
  { id: 'cooccurrence', label: 'Service-Netz' },
  { id: 'temporal', label: 'Korrelationen' },
  { id: 'team', label: 'Team-Overlap' },
  { id: 'breadth', label: 'Kundenbreite' },
  { id: 'dependencies', label: 'Abhängigkeiten' },
  { id: 'revenue', label: 'Revenue-Link' },
]

export function CrossReferencesView({ data, onServiceClick }) {
  const [activeTab, setActiveTab] = useState('cooccurrence')
  const cr = useMemo(() => data.crossReferences || {}, [data])
  const stats = cr.stats || {}

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Querbeziehungen</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>
          Logische Verbindungen zwischen Services, Kunden und Team ({stats.cooccurrenceEdges || 0} Kanten, {stats.customersAnalyzed || 0} Kunden analysiert)
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Co-Occurrences', value: stats.cooccurrenceEdges },
          { label: 'Team-Overlaps', value: stats.teamOverlapPairs },
          { label: 'Kunden', value: stats.customersAnalyzed },
          { label: 'Korrelationen', value: stats.temporalCorrelations },
          { label: 'Dep. Chains', value: stats.dependencyChains },
          { label: 'Revenue-Links', value: stats.revenueLinked },
        ].map(s => (
          <div key={s.label} style={{ ...sectionStyle, marginBottom: 0, textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent }}>{s.value || 0}</div>
            <div style={{ fontSize: 11, color: theme.text.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${theme.border.default}`, paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? theme.accent : 'transparent'}`,
            backgroundColor: 'transparent', color: activeTab === tab.id ? theme.text.primary : theme.text.muted,
            fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'cooccurrence' && <CooccurrenceTab cr={cr} onServiceClick={onServiceClick} />}
      {activeTab === 'temporal' && <TemporalTab cr={cr} onServiceClick={onServiceClick} />}
      {activeTab === 'team' && <TeamOverlapTab cr={cr} onServiceClick={onServiceClick} />}
      {activeTab === 'breadth' && <BreadthTab cr={cr} onServiceClick={onServiceClick} />}
      {activeTab === 'dependencies' && <DependencyTab cr={cr} onServiceClick={onServiceClick} />}
      {activeTab === 'revenue' && <RevenueTab cr={cr} data={data} onServiceClick={onServiceClick} />}
    </div>
  )
}

function CooccurrenceTab({ cr, onServiceClick }) {
  const edges = cr.serviceCooccurrence || []
  const top30 = edges.slice(0, 30)

  const chartData = top30.map(e => ({
    name: `${shorten(e.source)} + ${shorten(e.target)}`,
    customers: e.customers,
    source: e.source,
    target: e.target,
  }))

  // Build adjacency for network view
  const nodes = useMemo(() => {
    const nodeMap = {}
    edges.forEach(e => {
      if (!nodeMap[e.source]) nodeMap[e.source] = { name: e.source, connections: 0, totalCustomers: 0 }
      if (!nodeMap[e.target]) nodeMap[e.target] = { name: e.target, connections: 0, totalCustomers: 0 }
      nodeMap[e.source].connections++
      nodeMap[e.source].totalCustomers += e.customers
      nodeMap[e.target].connections++
      nodeMap[e.target].totalCustomers += e.customers
    })
    return Object.values(nodeMap).sort((a, b) => b.totalCustomers - a.totalCustomers)
  }, [edges])

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Service-Paare bei gleichen Kunden</h3>
          <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Wie oft treten zwei Services beim selben Kunden auf?</p>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
              <YAxis dataKey="name" type="category" width={250} stroke={theme.text.muted} fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Kunden']} />
              <Bar dataKey="customers" fill={theme.accent} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Service-Vernetzung</h3>
          <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Je mehr Verbindungen, desto zentraler der Service</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {nodes.slice(0, 20).map((n, i) => (
              <div key={n.name} onClick={() => onServiceClick?.(n.name)} style={{
                padding: '8px 12px', borderRadius: 6,
                backgroundColor: `${colors[i % colors.length]}15`,
                border: `1px solid ${colors[i % colors.length]}40`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors[i % colors.length] }}>{shorten(n.name)}</div>
                <div style={{ fontSize: 10, color: theme.text.muted, marginTop: 2 }}>
                  {n.connections} Verbindungen, {n.totalCustomers} Kunden-Links
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Alle Paare</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border.default}` }}>
              <th style={thStyle}>Service A</th>
              <th style={thStyle}>Service B</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Kunden</th>
              <th style={{ ...thStyle, width: 200 }}>Stärke</th>
            </tr>
          </thead>
          <tbody>
            {top30.map((e, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.border.subtle}` }}>
                <td style={tdStyle}>
                  <span style={{ cursor: 'pointer', color: theme.accent }} onClick={() => onServiceClick?.(e.source)}>{e.source}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ cursor: 'pointer', color: theme.accent }} onClick={() => onServiceClick?.(e.target)}>{e.target}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{e.customers}</td>
                <td style={tdStyle}>
                  <div style={{ height: 8, borderRadius: 4, backgroundColor: theme.border.subtle, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, e.customers / edges[0].customers * 100)}%`, backgroundColor: theme.accent, borderRadius: 4 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TemporalTab({ cr, onServiceClick }) {
  const correlations = cr.temporalCorrelations || []

  const positive = correlations.filter(c => c.correlation > 0)
  const negative = correlations.filter(c => c.correlation < 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Positive Korrelationen</h3>
        <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Services die zeitlich zusammen steigen/fallen (Pearson r)</p>
        {positive.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${theme.border.subtle}` }}>
            <span style={{ fontSize: 12, color: theme.accent, cursor: 'pointer', flex: 1 }} onClick={() => onServiceClick?.(c.serviceA)}>{shorten(c.serviceA)}</span>
            <span style={{ fontSize: 11, color: theme.text.muted }}>↔</span>
            <span style={{ fontSize: 12, color: theme.accent, cursor: 'pointer', flex: 1 }} onClick={() => onServiceClick?.(c.serviceB)}>{shorten(c.serviceB)}</span>
            <CorrelationBar value={c.correlation} />
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.semantic.success, width: 50, textAlign: 'right' }}>r={c.correlation}</span>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Negative Korrelationen</h3>
        <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Services die sich gegenläufig verhalten</p>
        {negative.length === 0 ? (
          <p style={{ fontSize: 12, color: theme.text.muted, fontStyle: 'italic' }}>Keine negativen Korrelationen gefunden (alle Services korrelieren positiv oder neutral)</p>
        ) : negative.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${theme.border.subtle}` }}>
            <span style={{ fontSize: 12, color: theme.accent, cursor: 'pointer', flex: 1 }} onClick={() => onServiceClick?.(c.serviceA)}>{shorten(c.serviceA)}</span>
            <span style={{ fontSize: 11, color: theme.text.muted }}>↔</span>
            <span style={{ fontSize: 12, color: theme.accent, cursor: 'pointer', flex: 1 }} onClick={() => onServiceClick?.(c.serviceB)}>{shorten(c.serviceB)}</span>
            <CorrelationBar value={c.correlation} />
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.semantic.error, width: 50, textAlign: 'right' }}>r={c.correlation}</span>
          </div>
        ))}

        <div style={{ marginTop: 24, padding: 16, backgroundColor: theme.bg.elevated, borderRadius: 6, border: `1px solid ${theme.border.subtle}` }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>Interpretation</h4>
          <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.6 }}>
            <div>r &gt; 0.5: Starke gemeinsame Saisonalität (z.B. Backup + Service Desk)</div>
            <div>r 0.3-0.5: Moderate Korrelation (ähnliche Kundenprofile)</div>
            <div>r &lt; -0.3: Gegenläufig (Substitution oder Technologiewechsel)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamOverlapTab({ cr, onServiceClick }) {
  const overlaps = cr.teamOverlap || []

  const chartData = overlaps.slice(0, 20).map(o => ({
    name: `${shorten(o.serviceA)} / ${shorten(o.serviceB)}`,
    shared: o.sharedMembers,
    ratio: Math.round(o.overlapRatio * 100),
  }))

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Geteilte Teammitglieder</h3>
          <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Service-Paare mit den meisten gemeinsamen Bearbeitern</p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
              <YAxis dataKey="name" type="category" width={230} stroke={theme.text.muted} fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="shared" fill="#34d399" radius={[0, 4, 4, 0]} name="Personen" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Overlap-Ratio</h3>
          <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Anteil geteilter Mitglieder (100% = alle arbeiten in beiden)</p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis type="number" domain={[0, 100]} stroke={theme.text.muted} fontSize={11} unit="%" />
              <YAxis dataKey="name" type="category" width={230} stroke={theme.text.muted} fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Overlap']} />
              <Bar dataKey="ratio" fill="#fbbf24" radius={[0, 4, 4, 0]} name="Overlap %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Detail-Tabelle</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border.default}` }}>
              <th style={thStyle}>Service A</th>
              <th style={thStyle}>Service B</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Shared</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Team A</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Team B</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Overlap</th>
            </tr>
          </thead>
          <tbody>
            {overlaps.slice(0, 30).map((o, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.border.subtle}` }}>
                <td style={tdStyle}><span style={{ cursor: 'pointer', color: theme.accent }} onClick={() => onServiceClick?.(o.serviceA)}>{o.serviceA}</span></td>
                <td style={tdStyle}><span style={{ cursor: 'pointer', color: theme.accent }} onClick={() => onServiceClick?.(o.serviceB)}>{o.serviceB}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{o.sharedMembers}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{o.membersA}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{o.membersB}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{Math.round(o.overlapRatio * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function BreadthTab({ cr, onServiceClick }) {
  const customers = cr.customerBreadth || []

  const scatterData = customers.map(c => ({
    name: c.customer,
    x: c.totalTickets,
    y: c.servicesCount,
    z: c.totalTickets,
  }))

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Kunden-Landschaft</h3>
          <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Tickets vs. Service-Breite pro Kunde</p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
              <XAxis dataKey="x" type="number" name="Tickets" stroke={theme.text.muted} fontSize={11} label={{ value: 'Tickets', position: 'bottom', fill: theme.text.muted, fontSize: 11 }} />
              <YAxis dataKey="y" type="number" name="Services" stroke={theme.text.muted} fontSize={11} label={{ value: 'Services', angle: -90, position: 'insideLeft', fill: theme.text.muted, fontSize: 11 }} />
              <ZAxis dataKey="z" range={[30, 300]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [v, name === 'x' ? 'Tickets' : 'Services']}
                content={({ payload }) => {
                  if (!payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div style={{ ...tooltipStyle, padding: 8 }}>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div>{d.x} Tickets, {d.y} Services</div>
                    </div>
                  )
                }}
              />
              <Scatter data={scatterData} fill={theme.accent} fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div style={sectionStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Breiteste Kunden</h3>
          <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Kunden mit den meisten verschiedenen Services</p>
          {customers.slice(0, 15).map((c, i) => (
            <div key={c.customer} style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border.subtle}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary }}>{c.customer}</span>
                <span style={{ fontSize: 11, color: theme.text.muted }}>{c.servicesCount} Services, {c.totalTickets} Tickets</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                {c.topServices.map(s => (
                  <span key={s.name} onClick={() => onServiceClick?.(s.name)} style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    backgroundColor: `${theme.accent}15`, color: theme.accent,
                    cursor: 'pointer', border: `1px solid ${theme.accent}30`,
                  }}>{shorten(s.name)} ({s.count})</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function DependencyTab({ cr, onServiceClick }) {
  const chains = cr.dependencyChains || []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Service-Abhängigkeiten</h3>
        <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>
          Wenn ein Kunde primär Service A nutzt, welcher Service B kommt dazu?
        </p>
        {chains.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${theme.border.subtle}` }}>
            <span style={{ fontSize: 12, color: theme.accent, cursor: 'pointer', flex: 1 }} onClick={() => onServiceClick?.(d.primary)}>
              {d.primary}
            </span>
            <span style={{ fontSize: 16, color: theme.text.muted }}>→</span>
            <span style={{ fontSize: 12, color: '#34d399', cursor: 'pointer', flex: 1 }} onClick={() => onServiceClick?.(d.secondary)}>
              {d.secondary}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.text.primary, width: 80, textAlign: 'right' }}>{d.customers} Kunden</span>
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Interpretation</h3>
        <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Was bedeuten die Abhängigkeitsketten?</p>
        <div style={{ padding: 16, backgroundColor: theme.bg.elevated, borderRadius: 6, border: `1px solid ${theme.border.subtle}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, marginBottom: 6 }}>Service Desk als Hub</div>
          <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.6 }}>
            Service Desk ist der zentrale Eintrittspunkt. Kunden die primär den Service Desk nutzen,
            bekommen auch Exchange, Backup, Internet-Services. Das zeigt den Upsell-Pfad.
          </div>
        </div>
        <div style={{ padding: 16, backgroundColor: theme.bg.elevated, borderRadius: 6, border: `1px solid ${theme.border.subtle}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, marginBottom: 6 }}>Managed Cluster</div>
          <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.6 }}>
            Backup, Monitoring und Infrastruktur bilden einen natürlichen Cluster.
            Kunden die einen buchen, brauchen oft alle drei.
          </div>
        </div>
        <div style={{ padding: 16, backgroundColor: theme.bg.elevated, borderRadius: 6, border: `1px solid ${theme.border.subtle}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, marginBottom: 6 }}>Korrelation ≠ Kausalität</div>
          <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.6 }}>
            Die Ketten zeigen Nutzungsmuster, keine echten technischen Abhängigkeiten.
            Sie eignen sich für Vertrieb (Cross-Sell) und Kapazitätsplanung.
          </div>
        </div>
      </div>
    </div>
  )
}

function RevenueTab({ cr, data, onServiceClick }) {
  const enriched = cr.revenueEnriched || []
  const revenueMap = cr.revenueServiceMap || {}
  const revenue = data.revenue || []

  // Build service → revenue lookup
  const svcRevenue = {}
  for (const [kg, svcName] of Object.entries(revenueMap)) {
    const rev = revenue.find(r => r.kostengruppe === kg)
    if (rev) {
      if (!svcRevenue[svcName]) svcRevenue[svcName] = { umsatz: 0, db: 0, groups: [] }
      svcRevenue[svcName].umsatz += rev.umsatz
      svcRevenue[svcName].db += rev.db
      svcRevenue[svcName].groups.push(kg)
    }
  }

  const chartData = enriched
    .filter(e => svcRevenue[e.service])
    .map(e => ({
      name: shorten(e.service),
      fullName: e.service,
      tickets: e.tickets,
      umsatz: Math.round((svcRevenue[e.service]?.umsatz || 0) / 1000),
      db: Math.round((svcRevenue[e.service]?.db || 0) / 1000),
    }))
    .sort((a, b) => b.umsatz - a.umsatz)

  const scatterData = chartData.map(d => ({
    name: d.fullName,
    x: d.tickets,
    y: d.umsatz,
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Tickets vs. Umsatz</h3>
        <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Operative Last (Jira) vs. Revenue (PBI) pro Service</p>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
            <XAxis dataKey="x" type="number" name="Tickets" stroke={theme.text.muted} fontSize={11}
              label={{ value: 'Tickets (Jira)', position: 'bottom', fill: theme.text.muted, fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Umsatz" stroke={theme.text.muted} fontSize={11}
              label={{ value: 'Umsatz (T EUR)', angle: -90, position: 'insideLeft', fill: theme.text.muted, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle}
              content={({ payload }) => {
                if (!payload?.[0]) return null
                const d = payload[0].payload
                return (
                  <div style={{ ...tooltipStyle, padding: 8 }}>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div>{d.x.toLocaleString()} Tickets</div>
                    <div>{d.y.toLocaleString()} T EUR Umsatz</div>
                  </div>
                )
              }}
            />
            <Scatter data={scatterData} fill={theme.accent} fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 4 }}>Revenue pro Service</h3>
        <p style={{ fontSize: 11, color: theme.text.muted, marginBottom: 16 }}>Umsatz und DB aus PBI-Kostengruppen, verknüpft mit Jira-Services</p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
            <XAxis type="number" stroke={theme.text.muted} fontSize={11} unit=" T" />
            <YAxis dataKey="name" type="category" width={180} stroke={theme.text.muted} fontSize={10} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v.toLocaleString()} T EUR`]} />
            <Bar dataKey="umsatz" fill={theme.accent} radius={[0, 4, 4, 0]} name="Umsatz" />
            <Bar dataKey="db" fill="#34d399" radius={[0, 4, 4, 0]} name="DB" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...sectionStyle, gridColumn: '1 / -1' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Revenue-Service Mapping</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border.default}` }}>
              <th style={thStyle}>Jira Service</th>
              <th style={thStyle}>PBI Kostengruppe(n)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Tickets</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Umsatz</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>DB</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>EUR/Ticket</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((d, i) => {
              const rev = svcRevenue[d.fullName]
              const perTicket = d.tickets > 0 ? Math.round(rev.umsatz / d.tickets) : 0
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${theme.border.subtle}` }}>
                  <td style={tdStyle}>
                    <span style={{ cursor: 'pointer', color: theme.accent }} onClick={() => onServiceClick?.(d.fullName)}>{d.fullName}</span>
                  </td>
                  <td style={tdStyle}>{rev.groups.join(', ')}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{d.tickets.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{(d.umsatz).toLocaleString()} T</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: theme.semantic.success }}>{(d.db).toLocaleString()} T</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: theme.text.muted }}>{perTicket.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Helpers
function shorten(name) {
  return name.length > 22 ? name.slice(0, 20) + '...' : name
}

function CorrelationBar({ value }) {
  const width = Math.abs(value) * 100
  const color = value > 0 ? theme.semantic.success : theme.semantic.error
  return (
    <div style={{ width: 80, height: 6, borderRadius: 3, backgroundColor: theme.border.subtle, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${width}%`, backgroundColor: color, borderRadius: 3 }} />
    </div>
  )
}

const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase' }
const tdStyle = { padding: '8px 12px', color: theme.text.secondary }
