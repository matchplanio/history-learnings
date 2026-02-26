import { useState, useEffect } from 'react'
import { ServiceDashboard } from './views/ServiceDashboard'
import { TeamView } from './views/TeamView'
import { TrendView } from './views/TrendView'
import { ServiceDetail } from './views/ServiceDetail'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [view, setView] = useState('services')
  const [selectedService, setSelectedService] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)

  useEffect(() => {
    fetch('/data.json').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div className="loading">Lade Daten...</div>

  const nav = (v) => { setView(v); setSelectedService(null); setSelectedPerson(null) }

  return (
    <div className="app">
      <header className="header">
        <h1 onClick={() => nav('services')}>History Learnings</h1>
        <p className="subtitle">
          {data.meta.matchedTickets.toLocaleString()} von {data.meta.totalTickets.toLocaleString()} Tickets
          &rarr; {data.meta.servicesWithMatches} Services ({data.meta.matchRate}%)
        </p>
        <nav>
          {['services', 'team', 'trends'].map(v => (
            <button key={v} className={view === v || (view === 'service-detail' && v === 'services') ? 'active' : ''} onClick={() => nav(v)}>
              {v === 'services' ? 'Services' : v === 'team' ? 'Team' : 'Trends'}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {view === 'services' && (
          <ServiceDashboard data={data}
            onServiceClick={n => { setSelectedService(n); setView('service-detail') }}
            onPersonClick={n => { setSelectedPerson(n); setView('team') }}
          />
        )}
        {view === 'service-detail' && selectedService && (
          <ServiceDetail
            service={data.services.find(s => s.name === selectedService)}
            onBack={() => nav('services')}
            onPersonClick={n => { setSelectedPerson(n); setView('team') }}
          />
        )}
        {view === 'team' && (
          <TeamView data={data} selectedPerson={selectedPerson}
            onServiceClick={n => { setSelectedService(n); setView('service-detail') }}
          />
        )}
        {view === 'trends' && <TrendView data={data} />}
      </main>
    </div>
  )
}

export default App
