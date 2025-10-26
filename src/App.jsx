import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import './App.css'
import RoomModal from './components/RoomModal'
import StreamingPage from './pages/StreamingPage'

function HomePage() {
  const navigate = useNavigate()
  const [isRoomModalOpen, setRoomModalOpen] = useState(false)
  const [selectedPlanName, setSelectedPlanName] = useState(null)

  const handleCardClick = (planName) => {
    setSelectedPlanName(planName)
    setRoomModalOpen(true)
  }

  const handleSelectRoom = (room) => {
    setRoomModalOpen(false)
    // Pass room and plan data via navigation state
    navigate('/streaming', { state: { room, plan: selectedPlanName } })
  }

  return (
    <>
      <div className="app">
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">Poopa Scoopa</h1>
            <p className="header-subtitle">Select a plan to get started</p>
          </div>
          <button className="btn-google">G Continue with Google</button>
        </div>

        <div className="cards-container">
          <div className="card disabled">
            <div className="card-image-placeholder">
              <div className="lock-icon">🔒</div>
              <span className="status-badge unavailable">Not Available</span>
            </div>
            <div className="card-content">
              <h2 className="card-title">Robo Delivery</h2>
              <p className="card-requirement">This plan requires outdoor setup</p>
              <div className="card-stats">
                <span className="stat">46ms</span>
                <span className="stat">70%</span>
                <span className="stat">0 Active</span>
              </div>
            </div>
            <button className="card-button disabled" disabled>Coming Soon</button>
          </div>

          <div className="card" onClick={() => handleCardClick('Basic Plan')}>
            <div className="card-image-active">
              <img src="/assets/poopa-scoopa.png" alt="Poopa Scoopa Robot" className="robot-image" />
              <span className="status-badge">Available</span>
            </div>
            <div className="card-content">
              <h2 className="card-title">Basic Plan</h2>
              <span className="card-tag">Indoor Only</span>
              <div className="card-stats">
                <span className="stat">37ms</span>
                <span className="stat">74%</span>
                <span className="stat">0 Active</span>
              </div>
            </div>
            <button className="card-button">Get Started</button>
          </div>

          <div className="card disabled">
            <div className="card-image-active premium">
              <img src="/assets/poopa-scoopa.png" alt="Poopa Scoopa Robot" className="robot-image premium-robot" />
              <span className="status-badge">Coming Soon</span>
            </div>
            <div className="card-content">
              <h2 className="card-title">Premium Plan</h2>
              <span className="card-tag">Indoor + Outdoor</span>
              <div className="card-stats">
                <span className="stat">39ms</span>
                <span className="stat">89%</span>
                <span className="stat">0 Active</span>
              </div>
            </div>
            <button className="card-button disabled" disabled>Coming Soon</button>
          </div>
        </div>

        <footer className="app-footer">
          <p>© 2024 Poopa Scoopa. Taking the dirty work out of pet ownership.</p>
        </footer>
      </div>

      <RoomModal
        isOpen={isRoomModalOpen}
        plan={selectedPlanName}
        onClose={() => setRoomModalOpen(false)}
        onSelectRoom={handleSelectRoom}
      />
    </>
  )
}

function StreamingPageWrapper() {
  const location = useLocation()
  const navigate = useNavigate()
  const { room, plan } = location.state || { room: 'room-a', plan: 'Basic Plan' }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <StreamingPage 
      room={room} 
      plan={plan}
      onBack={handleBack}
    />
  )
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/streaming" element={<StreamingPageWrapper />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  )
}

export default App
