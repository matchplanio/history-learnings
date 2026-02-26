import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { useMemo } from 'react'

export function TrendView({ data }) {
  // yearlyTrend is a dict {year: {total, byType, byProject}}
  const yearlyData = useMemo(() => {
    return Object.entries(data.yearlyTrend)
      .map(([year, info]) => ({ year, count: info.total }))
      .sort((a, b) => a.year.localeCompare(b.year))
  }, [data])

  const topServices = useMemo(() => {
    return data.services
      .filter(s => s.tickets > 0)
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 10)
  }, [data])

  const trendByService = useMemo(() => {
    const years = Object.keys(data.yearlyTrend).sort()
    return years.map(year => {
      const row = { year }
      topServices.forEach(s => {
        row[s.name] = s.yearlyTickets?.[year] || 0
      })
      return row
    })
  }, [data, topServices])

  const totalMatched = data.meta.matchedTickets

  const colors = ['#646cff', '#4ade80', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb923c', '#2dd4bf', '#f472b6', '#94a3b8']

  return (
    <div>
      <div className="trend-chart">
        <h3>Gesamtentwicklung (alle Tickets pro Jahr)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="year" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
            <Bar dataKey="count" fill="#646cff" name="Tickets" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="trend-chart">
        <h3>Top 10 Services im Zeitverlauf</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={trendByService}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="year" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
            <Legend />
            {topServices.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="trend-chart">
        <h3>Alle Services nach Ticket-Volumen</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Service</th>
              <th>Status</th>
              <th>Tickets</th>
              <th>Team</th>
              <th>Anteil</th>
            </tr>
          </thead>
          <tbody>
            {data.services
              .filter(s => s.tickets > 0)
              .sort((a, b) => b.tickets - a.tickets)
              .map((s, i) => (
                <tr key={s.name}>
                  <td>{i + 1}</td>
                  <td>{s.name}</td>
                  <td><span className={`badge badge-${s.status === 'Live' ? 'live' : s.status === 'Entwicklung' ? 'dev' : 'eos'}`}>{s.status}</span></td>
                  <td>{s.tickets.toLocaleString()}</td>
                  <td>{s.topAssignees.length}</td>
                  <td>{((s.tickets / totalMatched) * 100).toFixed(1)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
