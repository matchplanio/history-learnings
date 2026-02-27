import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useMemo, useState } from 'react'
import { theme } from '../config/theme'

const sectionStyle = {
  backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 8, padding: 20, marginBottom: 16,
}

const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6', '#8b949e']

const statusColors = {
  'Billed': '#34d399',
  'Fertig': '#60a5fa',
  'Geschlossen': '#8b949e',
  'In Arbeit': '#fbbf24',
  'Zu erledigen': '#f87171',
  'Unbilled': '#fb923c',
  'Scheduled': '#c084fc',
  'Offen': '#22d3ee',
  'Deferred': '#6b7280',
}

const categoryColors = {
  'MS365 / Cloud': '#60a5fa',
  'Firewall / Security': '#f87171',
  'Infrastruktur': '#22d3ee',
  'Linux-Consulting': '#c084fc',
  'Migration / vDC': '#fbbf24',
  'Backup / Storage': '#34d399',
  'Netzwerk / WLAN': '#2dd4bf',
  'Managed Services': '#fb923c',
  'Hosting / RZ': '#f472b6',
  'Citrix / VDI': '#a78bfa',
  'Sonstiges': '#8b949e',
}

export function ProjectView({ data }) {
  const proj = useMemo(() => data.projects || {}, [data])
  const projects = useMemo(() => proj.projects || [], [proj])
  const revenue = useMemo(() => data.revenue || [], [data])
  const hersteller = useMemo(() => data.hersteller || [], [data])
  const herstellerCats = useMemo(() => data.herstellerCategories || [], [data])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [selectedProject, setSelectedProject] = useState(null)
  const [activeTab, setActiveTab] = useState('projects')
  const [herstellerFilter, setHerstellerFilter] = useState('all')

  const filtered = useMemo(() => {
    let list = projects
    if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus)
    if (filterCategory !== 'all') list = list.filter(p => p.category === filterCategory)
    return list
  }, [projects, filterStatus, filterCategory])

  // Charts
  const yearlyData = useMemo(() =>
    Object.entries(proj.byYear || {}).map(([y, c]) => ({ year: y, count: c })),
  [proj])

  const statusData = useMemo(() =>
    Object.entries(proj.byStatus || {}).map(([s, c]) => ({ name: s, value: c })),
  [proj])

  const assigneeData = useMemo(() => (proj.byAssignee || []).slice(0, 10), [proj])

  const customerData = useMemo(() => (proj.customers || []).slice(0, 15), [proj])

  const categoryData = useMemo(() =>
    Object.entries(proj.byCategory || {}).map(([name, value]) => ({ name, value })),
  [proj])

  const categoryByYearData = useMemo(() => {
    const catYear = proj.categoryByYear || {}
    const allCats = Object.keys(proj.byCategory || {})
    return Object.entries(catYear).map(([year, cats]) => ({
      year,
      ...Object.fromEntries(allCats.map(c => [c, cats[c] || 0]))
    }))
  }, [proj])

  // Revenue grouped
  const revenueByAG = useMemo(() => {
    const groups = {}
    for (const r of revenue) {
      const ag = r.artikelgruppe
      if (!groups[ag]) groups[ag] = { name: ag, umsatz: 0, db: 0, positionen: 0, groups: [] }
      groups[ag].umsatz += r.umsatz
      groups[ag].db += r.db
      groups[ag].positionen += r.positionen
      groups[ag].groups.push(r)
    }
    return Object.values(groups).sort((a, b) => b.umsatz - a.umsatz)
  }, [revenue])

  const tooltipStyle = { backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}`, borderRadius: 6, fontSize: 12 }
  const fmt = (v) => typeof v === 'number' ? (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'K' : v.toLocaleString()) + ' €' : v

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, marginBottom: 4 }}>Projekte & Revenue</h2>
        <p style={{ fontSize: 13, color: theme.text.muted }}>
          {proj.totalProjects} Kundenprojekte (SXPP), {proj.totalSubTasks} Sub-Tasks, {proj.totalAnfahrten} Anfahrten
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{ id: 'projects', label: 'Projekte' }, { id: 'revenue', label: 'Revenue (ERP)' }, { id: 'hersteller', label: 'Hersteller' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${activeTab === tab.id ? theme.accent : theme.border.subtle}`,
            backgroundColor: activeTab === tab.id ? theme.accent + '20' : 'transparent',
            color: activeTab === tab.id ? theme.accent : theme.text.secondary,
            fontFamily: 'inherit',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Projekte', value: proj.totalProjects, color: theme.accent },
              { label: 'Kategorien', value: categoryData.length, color: '#c084fc' },
              { label: 'Sub-Tasks', value: proj.totalSubTasks?.toLocaleString(), color: '#34d399' },
              { label: 'Kunden', value: (proj.customers || []).length, color: '#fbbf24' },
              { label: 'Anfahrten', value: proj.totalAnfahrten, color: '#f87171' },
            ].map(kpi => (
              <div key={kpi.label} style={sectionStyle}>
                <div style={{ fontSize: 11, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Category overview row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Category pie */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Projektkategorien</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2}>
                    {categoryData.map((c, i) => <Cell key={i} fill={categoryColors[c.name] || colors[i % colors.length]} cursor="pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                {categoryData.map((c) => (
                  <span key={c.name} onClick={() => setFilterCategory(filterCategory === c.name ? 'all' : c.name)}
                    style={{ fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      color: filterCategory === c.name ? theme.accent : theme.text.muted,
                      fontWeight: filterCategory === c.name ? 600 : 400 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: categoryColors[c.name] || '#8b949e' }} />
                    {c.name} ({c.value})
                  </span>
                ))}
              </div>
            </div>

            {/* Category × Year stacked bar */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Kategorien pro Jahr</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryByYearData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis dataKey="year" stroke={theme.text.muted} fontSize={11} />
                  <YAxis stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  {categoryData.map((c) => (
                    <Bar key={c.name} dataKey={c.name} stackId="a" fill={categoryColors[c.name] || '#8b949e'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status + Yearly row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Status pie */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Status-Verteilung</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2}>
                    {statusData.map((s, i) => <Cell key={i} fill={statusColors[s.name] || colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {statusData.map((s, i) => (
                  <span key={s.name} style={{ fontSize: 11, color: theme.text.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: statusColors[s.name] || colors[i % colors.length] }} />
                    {s.name} ({s.value})
                  </span>
                ))}
              </div>
            </div>

            {/* Yearly */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Projekte pro Jahr</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis dataKey="year" stroke={theme.text.muted} fontSize={11} />
                  <YAxis stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={theme.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assignees + Customers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top Projektleiter</h3>
              {assigneeData.map((a, i) => {
                const max = assigneeData[0]?.count || 1
                return (
                  <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ width: 150, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    <div style={{ flex: 1, height: 8, backgroundColor: theme.bg.elevated, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: 8, backgroundColor: colors[i % colors.length], borderRadius: 4, width: `${(a.count / max) * 100}%` }} />
                    </div>
                    <span style={{ minWidth: 30, textAlign: 'right', color: theme.text.muted, fontWeight: 600 }}>{a.count}</span>
                  </div>
                )
              })}
            </div>

            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top Kunden (Projekte)</h3>
              {customerData.map((c) => {
                const max = customerData[0]?.count || 1
                return (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ width: 120, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <div style={{ flex: 1, height: 8, backgroundColor: theme.bg.elevated, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: 8, backgroundColor: '#fbbf24', borderRadius: 4, width: `${(c.count / max) * 100}%` }} />
                    </div>
                    <span style={{ minWidth: 20, textAlign: 'right', color: theme.text.muted, fontWeight: 600 }}>{c.count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filters */}
          <div style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: theme.text.muted, minWidth: 65 }}>Kategorie:</span>
              <button onClick={() => setFilterCategory('all')} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${filterCategory === 'all' ? theme.accent : theme.border.subtle}`,
                backgroundColor: filterCategory === 'all' ? theme.accent + '20' : 'transparent',
                color: filterCategory === 'all' ? theme.accent : theme.text.secondary,
                fontFamily: 'inherit',
              }}>Alle</button>
              {categoryData.map(c => (
                <button key={c.name} onClick={() => setFilterCategory(filterCategory === c.name ? 'all' : c.name)} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${filterCategory === c.name ? (categoryColors[c.name] || theme.accent) : theme.border.subtle}`,
                  backgroundColor: filterCategory === c.name ? (categoryColors[c.name] || theme.accent) + '20' : 'transparent',
                  color: filterCategory === c.name ? (categoryColors[c.name] || theme.accent) : theme.text.secondary,
                  fontFamily: 'inherit',
                }}>{c.name}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: theme.text.muted, minWidth: 65 }}>Status:</span>
              {['all', 'In Arbeit', 'Zu erledigen', 'Billed', 'Fertig', 'Geschlossen'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${filterStatus === s ? theme.accent : theme.border.subtle}`,
                  backgroundColor: filterStatus === s ? theme.accent + '20' : 'transparent',
                  color: filterStatus === s ? theme.accent : theme.text.secondary,
                  fontFamily: 'inherit',
                }}>{s === 'all' ? 'Alle' : s}</button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: theme.text.muted }}>{filtered.length} Projekte</span>
            </div>
          </div>

          {/* Project table */}
          <div style={sectionStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Key', 'Projekt', 'Kategorie', 'Kunde', 'Status', 'Bearbeiter', 'Sub-Tasks', 'Erstellt'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`, color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.key}
                    onClick={() => setSelectedProject(selectedProject === p.key ? null : p.key)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.bg.elevated}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedProject === p.key ? theme.accent + '10' : 'transparent'}
                  >
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.accent, fontFamily: 'monospace', fontSize: 12 }}>{p.key}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.summary}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                        backgroundColor: (categoryColors[p.category] || '#8b949e') + '20',
                        color: categoryColors[p.category] || '#8b949e',
                      }}>{p.category}</span>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: '#fbbf24', fontWeight: 600 }}>{p.customer || '—'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                        backgroundColor: (statusColors[p.status] || '#8b949e') + '20',
                        color: statusColors[p.status] || '#8b949e',
                      }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.secondary }}>{p.assignee}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted, textAlign: 'center' }}>{p.subTasks}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{p.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sub-Task stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Sub-Tasks nach Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(proj.subTasksByStatus || {}).map(([s, c]) => ({ name: s, count: c }))} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
                  <YAxis dataKey="name" type="category" width={100} stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {Object.entries(proj.subTasksByStatus || {}).map(([s], i) => (
                      <Cell key={i} fill={statusColors[s] || colors[i % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top Bearbeiter (Sub-Tasks)</h3>
              {(proj.subTasksByAssignee || []).slice(0, 10).map((a, i) => {
                const max = (proj.subTasksByAssignee || [])[0]?.count || 1
                return (
                  <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ width: 150, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    <div style={{ flex: 1, height: 8, backgroundColor: theme.bg.elevated, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: 8, backgroundColor: colors[i % colors.length], borderRadius: 4, width: `${(a.count / max) * 100}%` }} />
                    </div>
                    <span style={{ minWidth: 30, textAlign: 'right', color: theme.text.muted, fontWeight: 600 }}>{a.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'revenue' && (
        <>
          {/* Revenue KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Gesamt-Umsatz', value: fmt(revenue.reduce((s, r) => s + r.umsatz, 0)), color: theme.accent },
              { label: 'Gesamt-DB', value: fmt(revenue.reduce((s, r) => s + r.db, 0)), color: '#34d399' },
              { label: 'DB-Marge', value: Math.round(revenue.reduce((s, r) => s + r.db, 0) / revenue.reduce((s, r) => s + r.umsatz, 0) * 100) + '%', color: '#fbbf24' },
              { label: 'Positionen', value: revenue.reduce((s, r) => s + r.positionen, 0).toLocaleString(), color: '#60a5fa' },
            ].map(kpi => (
              <div key={kpi.label} style={sectionStyle}>
                <div style={{ fontSize: 11, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue by Artikelgruppe */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {revenueByAG.map(ag => (
              <div key={ag.name} style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.text.primary }}>{ag.name}</h3>
                  <div style={{ fontSize: 13, color: theme.accent, fontWeight: 600 }}>{fmt(ag.umsatz)}</div>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, ag.groups.length * 28)}>
                  <BarChart data={ag.groups.sort((a, b) => b.umsatz - a.umsatz)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                    <XAxis type="number" stroke={theme.text.muted} fontSize={10} tickFormatter={v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? Math.round(v/1000)+'K' : v} />
                    <YAxis dataKey="kostengruppe" type="category" width={160} stroke={theme.text.muted} fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                    <Bar dataKey="umsatz" fill={theme.accent} radius={[0, 4, 4, 0]} name="Umsatz" />
                    <Bar dataKey="db" fill="#34d399" radius={[0, 4, 4, 0]} name="DB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>

          {/* Revenue table */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Alle Kostengruppen</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Artikelgruppe', 'Kostengruppe', 'Umsatz', 'DB', 'DB%', 'Positionen'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Kostengruppe' || h === 'Artikelgruppe' ? 'left' : 'right', padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`, color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...revenue].sort((a, b) => b.umsatz - a.umsatz).map(r => {
                  const margin = r.umsatz > 0 ? Math.round(r.db / r.umsatz * 100) : 0
                  return (
                    <tr key={r.kostengruppe}>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted }}>{r.artikelgruppe}</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 500 }}>{r.kostengruppe}</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.accent, textAlign: 'right', fontWeight: 600 }}>{fmt(r.umsatz)}</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: '#34d399', textAlign: 'right' }}>{fmt(r.db)}</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, textAlign: 'right', color: margin > 80 ? '#34d399' : margin > 40 ? '#fbbf24' : '#f87171' }}>{margin}%</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted, textAlign: 'right' }}>{r.positionen.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'hersteller' && (
        <>
          {/* Hersteller KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Hersteller', value: hersteller.length, color: theme.accent },
              { label: 'Gesamt-Artikel', value: hersteller.reduce((s, h) => s + h.artikelCount, 0).toLocaleString(), color: '#34d399' },
              { label: 'Kategorien', value: herstellerCats.length, color: '#fbbf24' },
              { label: 'Top-Hersteller', value: hersteller[0]?.name || '—', color: '#60a5fa' },
            ].map(kpi => (
              <div key={kpi.label} style={sectionStyle}>
                <div style={{ fontSize: 11, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Category overview + Top chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Categories pie */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Kategorien</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={herstellerCats.map(c => ({ name: c.name, value: c.artikel }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={2}>
                    {herstellerCats.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => v.toLocaleString() + ' Artikel'} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {herstellerCats.map((c, i) => (
                  <span key={c.name} onClick={() => setHerstellerFilter(herstellerFilter === c.name ? 'all' : c.name)}
                    style={{ fontSize: 11, color: herstellerFilter === c.name ? theme.accent : theme.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: herstellerFilter === c.name ? 600 : 400 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors[i % colors.length] }} />
                    {c.name} ({c.hersteller})
                  </span>
                ))}
              </div>
            </div>

            {/* Top 20 bar chart */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>Top 20 nach Artikelanzahl</h3>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  data={hersteller.filter(h => h.name !== 'levigo (intern)').slice(0, 20).map(h => ({
                    name: h.name.length > 18 ? h.name.slice(0, 15) + '...' : h.name,
                    fullName: h.name,
                    count: h.artikelCount,
                  }))}
                  layout="vertical" margin={{ left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.subtle} />
                  <XAxis type="number" stroke={theme.text.muted} fontSize={11} />
                  <YAxis dataKey="name" type="category" width={130} stroke={theme.text.muted} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [v.toLocaleString() + ' Artikel', p.payload.fullName]} />
                  <Bar dataKey="count" fill={theme.accent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filter */}
          <div style={{ ...sectionStyle, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: theme.text.muted }}>Kategorie:</span>
            <button onClick={() => setHerstellerFilter('all')} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${herstellerFilter === 'all' ? theme.accent : theme.border.subtle}`,
              backgroundColor: herstellerFilter === 'all' ? theme.accent + '20' : 'transparent',
              color: herstellerFilter === 'all' ? theme.accent : theme.text.secondary,
              fontFamily: 'inherit',
            }}>Alle</button>
            {herstellerCats.map(c => (
              <button key={c.name} onClick={() => setHerstellerFilter(herstellerFilter === c.name ? 'all' : c.name)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${herstellerFilter === c.name ? theme.accent : theme.border.subtle}`,
                backgroundColor: herstellerFilter === c.name ? theme.accent + '20' : 'transparent',
                color: herstellerFilter === c.name ? theme.accent : theme.text.secondary,
                fontFamily: 'inherit',
              }}>{c.name}</button>
            ))}
          </div>

          {/* Hersteller table */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 16 }}>
              Hersteller-Verzeichnis ({herstellerFilter === 'all' ? hersteller.length : hersteller.filter(h => h.category === herstellerFilter).length})
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['ID', 'Hersteller', 'Kategorie', 'Artikel', 'Beschreibung'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Artikel' || h === 'ID' ? 'right' : 'left', padding: '8px 10px', borderBottom: `1px solid ${theme.border.default}`, color: theme.text.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hersteller
                  .filter(h => herstellerFilter === 'all' || h.category === herstellerFilter)
                  .map(h => {
                    const maxCount = hersteller[0]?.artikelCount || 1
                    return (
                      <tr key={h.id}>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted, fontFamily: 'monospace', fontSize: 11, textAlign: 'right' }}>{h.id}</td>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.primary, fontWeight: 600 }}>{h.name}</td>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 9999, fontSize: 11,
                            backgroundColor: theme.bg.elevated, color: theme.text.secondary,
                          }}>{h.category}</span>
                        </td>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                            <div style={{ width: 80, height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: 6, backgroundColor: theme.accent, borderRadius: 3, width: `${Math.min((h.artikelCount / maxCount) * 100, 100)}%` }} />
                            </div>
                            <span style={{ minWidth: 50, color: theme.text.primary, fontWeight: 500 }}>{h.artikelCount.toLocaleString()}</span>
                          </div>
                        </td>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.border.subtle}`, color: theme.text.muted, fontSize: 12 }}>{h.description}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
