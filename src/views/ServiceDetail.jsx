import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function ServiceDetail({ service, onBack, onPersonClick }) {
  if (!service) return null

  return (
    <div>
      <span className="back-link" onClick={onBack}>&larr; Zurueck zur Uebersicht</span>
      <div className="detail-header">
        <h2>{service.name}</h2>
        <div className="meta">
          <span className={`badge badge-${service.status === 'Live' ? 'live' : service.status === 'Entwicklung' ? 'dev' : service.status === 'Maintenance' || service.status === 'EoS' ? 'eos' : 'idea'}`}>
            {service.status}
          </span>
          {service.type && <span className="badge badge-type">{service.type}</span>}
          {service.kategorie && <span className="badge badge-type">{service.kategorie}</span>}
          {service.unit && <span className="badge badge-type">{service.unit}</span>}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Ticket-Volumen</h4>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="ticket-count" style={{ fontSize: '2.5rem' }}>{service.ticketCount.toLocaleString()}</span>
            <span className="ticket-label">Tickets gesamt</span>
          </div>
          {service.yearlyTrend.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={service.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="year" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
                <Bar dataKey="count" fill="#646cff" name="Tickets" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="detail-section">
          <h4>Team ({service.topAssignees.length} Personen)</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Tickets</th>
                <th>Anteil</th>
              </tr>
            </thead>
            <tbody>
              {service.topAssignees.map(a => (
                <tr key={a.name}>
                  <td>
                    <span className="clickable" onClick={() => onPersonClick(a.name)}>
                      {a.name}
                    </span>
                  </td>
                  <td>{a.count.toLocaleString()}</td>
                  <td>{service.ticketCount > 0 ? ((a.count / service.ticketCount) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {service.samples && service.samples.length > 0 && (
          <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
            <h4>Beispiel-Tickets ({service.samples.length})</h4>
            {service.samples.map((s, i) => (
              <div key={i} className="sample">
                <span className="sample-key">{s.key}</span>
                {s.summary}
              </div>
            ))}
          </div>
        )}

        {service.beschreibung && (
          <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
            <h4>Service-Beschreibung (Coda)</h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>{service.beschreibung}</p>
          </div>
        )}
      </div>
    </div>
  )
}
