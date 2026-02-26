import { useState, useEffect } from 'react'
import { theme } from './config/theme'
import { ServiceDashboard } from './views/ServiceDashboard'
import { TeamView } from './views/TeamView'
import { TrendView } from './views/TrendView'
import { ServiceDetail } from './views/ServiceDetail'
import { CategoryView } from './views/CategoryView'
import { UnitView } from './views/UnitView'
import { UnmatchedView } from './views/UnmatchedView'
import { CustomerView } from './views/CustomerView'
import { ProjectView } from './views/ProjectView'
import { MethodikView } from './views/MethodikView'

const navItems = [
  { id: 'services', label: 'Services', icon: '◆' },
  { id: 'team', label: 'Team', icon: '◇' },
  { id: 'trends', label: 'Trends', icon: '▤' },
  { id: 'categories', label: 'Kategorien', icon: '◈' },
  { id: 'customers', label: 'Kunden', icon: '◎' },
  { id: 'projects', label: 'Projekte', icon: '◫' },
  { id: 'units', label: 'Units', icon: '⊞' },
  { id: 'unmatched', label: 'Unmatched', icon: '⊘' },
  { id: 'methodik', label: 'Methodik', icon: '⚙' },
]

function App() {
  const [data, setData] = useState(null)
  const [currentView, setCurrentView] = useState('services')
  const [selectedService, setSelectedService] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)

  useEffect(() => {
    fetch('/data.json').then(r => r.json()).then(setData)
  }, [])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      if (hash.startsWith('service-')) {
        setSelectedService(decodeURIComponent(hash.slice(8)))
        setCurrentView('service-detail')
      } else {
        setCurrentView(hash)
      }
    }
  }, [])

  const navigate = (id) => {
    window.location.hash = id
    setCurrentView(id)
    setSelectedService(null)
    setSelectedPerson(null)
  }

  const openService = (name) => {
    window.location.hash = 'service-' + encodeURIComponent(name)
    setSelectedService(name)
    setCurrentView('service-detail')
  }

  const openPerson = (name) => {
    window.location.hash = 'team'
    setSelectedPerson(name)
    setCurrentView('team')
  }

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: theme.text.muted }}>
      Lade Daten...
    </div>
  )

  const activeView = currentView === 'service-detail' ? 'services' : currentView

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220,
        flexShrink: 0,
        backgroundColor: theme.bg.sidebar,
        borderRight: `1px solid ${theme.border.default}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 10,
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 16px',
          borderBottom: `1px solid ${theme.border.default}`,
          cursor: 'pointer',
        }} onClick={() => navigate('services')}>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text.primary }}>
            History Learnings
          </div>
          <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Service Analytics
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.subtle}` }}>
          <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>Datenbasis</div>
          <div style={{ fontSize: 13, color: theme.text.primary, fontWeight: 600 }}>
            {data.meta.matchedTickets.toLocaleString()}
            <span style={{ color: theme.text.muted, fontWeight: 400 }}> / {data.meta.totalTickets.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
            {data.meta.servicesWithMatches} Services ({data.meta.matchRate}%)
          </div>
          <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
            {data.meta.totalStaff || 0} Mitarbeitende, {data.meta.activeUnits || 0} Units
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ansichten
          </div>
          {navItems.map(item => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? theme.accent : 'transparent'}`,
                  backgroundColor: isActive ? theme.accent + '15' : 'transparent',
                  color: isActive ? theme.text.primary : theme.text.secondary,
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  borderRadius: 0,
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${theme.border.subtle}`,
          fontSize: 10,
          color: theme.text.muted,
        }}>
          Jira × Coda Servicekatalog
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: 220,
        padding: 24,
        overflowY: 'auto',
        minHeight: '100vh',
      }}>
        {currentView === 'services' && (
          <ServiceDashboard data={data} onServiceClick={openService} onPersonClick={openPerson} />
        )}
        {currentView === 'service-detail' && selectedService && (
          <ServiceDetail
            service={data.services.find(s => s.name === selectedService)}
            onBack={() => navigate('services')}
            onPersonClick={openPerson}
          />
        )}
        {currentView === 'team' && (
          <TeamView data={data} selectedPerson={selectedPerson} onServiceClick={openService} />
        )}
        {currentView === 'trends' && <TrendView data={data} />}
        {currentView === 'categories' && <CategoryView data={data} onServiceClick={openService} />}
        {currentView === 'customers' && <CustomerView data={data} onServiceClick={openService} />}
        {currentView === 'projects' && <ProjectView data={data} onServiceClick={openService} />}
        {currentView === 'units' && <UnitView data={data} onServiceClick={openService} />}
        {currentView === 'unmatched' && <UnmatchedView data={data} />}
        {currentView === 'methodik' && <MethodikView data={data} />}
      </main>
    </div>
  )
}

export default App
