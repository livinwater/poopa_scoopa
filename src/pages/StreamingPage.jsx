import { useState } from 'react'
import '../pages/StreamingPage.css'

function StreamingPage({ room, plan, onBack }) {
  const [selectedRobot, setSelectedRobot] = useState('robot-a')
  const [isControlEnabled, setIsControlEnabled] = useState(true)

  const robots = [
    { id: 'robot-a', name: 'Robot A', battery: 85, status: 'idle' },
    { id: 'robot-b', name: 'Robot B', battery: 92, status: 'idle' }
  ]

  const [robotCommands, setRobotCommands] = useState([])

  const handleCommand = (direction) => {
    if (!isControlEnabled) return
    
    const sendTimestamp = new Date().toLocaleTimeString()
    const commandId = `cmd-${Date.now()}`
    
    // Add "sending" command to log immediately
    const sendingCommand = {
      id: commandId,
      timestamp: sendTimestamp,
      command: `🔗 Sending blockchain transaction: ${direction.toUpperCase()}`,
      status: 'sent',
      source: 'blockchain'
    }
    
    setRobotCommands(prev => [sendingCommand, ...prev].slice(0, 20))
    
    // Disable controls during command
    setIsControlEnabled(false)
    
    // Simulate blockchain confirmation
    setTimeout(() => {
      const blockchainSuccess = {
        id: `${commandId}-blockchain`,
        timestamp: new Date().toLocaleTimeString(),
        command: `✅ Blockchain confirmed: ${Math.random().toString(36).substring(7)}`,
        status: 'acknowledged',
        source: 'blockchain'
      }
      setRobotCommands(prev => [blockchainSuccess, ...prev].slice(0, 20))
      
      // Simulate robot command
      const robotCmd = {
        id: `${commandId}-robot`,
        timestamp: new Date().toLocaleTimeString(),
        command: `🤖 Robot command sent: ${direction}`,
        status: 'acknowledged',
        source: 'websocket'
      }
      setRobotCommands(prev => [robotCmd, ...prev].slice(0, 20))
      
      setIsControlEnabled(true)
    }, 1500)
  }

  const handleFireCommand = () => {
    if (!isControlEnabled) return
    
    const sendTimestamp = new Date().toLocaleTimeString()
    const commandId = `scoop-${Date.now()}`
    
    const sendingScoop = {
      id: commandId,
      timestamp: sendTimestamp,
      command: `🪣 Sending SCOOP`,
      status: 'sent',
      source: 'websocket'
    }
    
    setRobotCommands(prev => [sendingScoop, ...prev].slice(0, 20))
    
    setIsControlEnabled(false)
    
    setTimeout(() => {
      const scoopSuccess = {
        id: `${commandId}-success`,
        timestamp: new Date().toLocaleTimeString(),
        command: `✅ SCOOP command sent successfully!`,
        status: 'acknowledged',
        source: 'websocket'
      }
      setRobotCommands(prev => [scoopSuccess, ...prev].slice(0, 20))
      setIsControlEnabled(true)
    }, 1000)
  }

  const isRoomA = room === 'room-a'

  return (
    <div className="streaming-page">
      {/* Header */}
      <div className="streaming-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <div>
          <h1 className="streaming-title">{plan}</h1>
          <p className="streaming-subtitle">{isRoomA ? 'Room A - Stream & Control' : 'Room B - Watch Only'}</p>
        </div>
      </div>

      <div className="streaming-layout">
        {/* Main Video Area */}
        <div className="main-video-area">
          <div className="video-container">
            <div className="video-placeholder">
              <div className="video-icon">📹</div>
              <p>Video Stream</p>
              <span className="room-badge-inline">
                {isRoomA ? '🎮 Stream & Control' : '👁️ Watch Only'}
              </span>
            </div>
          </div>

          {/* Connection Status */}
          <div className="status-overlay">
            <div className="status-item">
              <div className="status-dot online"></div>
              <span>Video: Connected</span>
            </div>
            <div className="status-item">
              <div className="status-dot online"></div>
              <span>Robot: Connected</span>
            </div>
            <div className="status-item">
              <div className="status-dot online"></div>
              <span>{robots.length} Participants</span>
            </div>
          </div>
        </div>

        {/* Control Panel - Only for Room A */}
        {isRoomA && (
          <div className="control-panel">
            <div className="panel-header">
              <h3>Robot Control</h3>
              <p>Navigate robots across the grid</p>
            </div>

            {/* Robot Selection */}
            <div className="robot-selection">
              <label>Selected Robot</label>
              <select 
                value={selectedRobot}
                onChange={(e) => setSelectedRobot(e.target.value)}
                className="robot-select"
              >
                {robots.map(robot => (
                  <option key={robot.id} value={robot.id}>
                    {robot.name} ({robot.battery}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Control Pad */}
            <div className="control-pad">
              <div className="control-row">
                <button 
                  className="control-btn up-btn"
                  onClick={() => handleCommand('up')}
                  disabled={!isControlEnabled}
                >
                  ↑
                </button>
              </div>
              
              <div className="control-row">
                <button 
                  className="control-btn left-btn"
                  onClick={() => handleCommand('left')}
                  disabled={!isControlEnabled}
                >
                  ←
                </button>
                
                <button 
                  className="control-btn fire-btn"
                  onClick={handleFireCommand}
                  disabled={!isControlEnabled}
                >
                  SCOOP
                </button>
                
                <button 
                  className="control-btn right-btn"
                  onClick={() => handleCommand('right')}
                  disabled={!isControlEnabled}
                >
                  →
                </button>
              </div>
              
              <div className="control-row">
                <button 
                  className="control-btn down-btn"
                  onClick={() => handleCommand('down')}
                  disabled={!isControlEnabled}
                >
                  ↓
                </button>
              </div>
            </div>

            {/* Control Status */}
            <div className="control-status">
              <span className={`status-badge ${isControlEnabled ? 'enabled' : 'disabled'}`}>
                {isControlEnabled ? '✓ Ready' : '⏳ Processing...'}
              </span>
            </div>

            {/* Robot Status */}
            <div className="robot-status">
              <h4>Robot Status</h4>
              <div className="robot-list">
                {robots.map(robot => (
                  <div 
                    key={robot.id} 
                    className={`robot-item ${robot.id === selectedRobot ? 'active' : ''}`}
                  >
                    <div className="robot-info">
                      <div className={`robot-indicator ${robot.status}`}></div>
                      <span>{robot.name}</span>
                      {robot.id === selectedRobot && (
                        <span className="active-badge">ACTIVE</span>
                      )}
                    </div>
                    <div className="robot-details">
                      {robot.battery}% • {robot.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Robot Command Log */}
            <div className="robot-commands">
              <h4>Robot Commands</h4>
              <div className="commands-log">
                {robotCommands.length === 0 ? (
                  <div className="no-commands">
                    No commands sent yet
                  </div>
                ) : (
                  <div className="commands-list">
                    {robotCommands.map((cmd) => (
                      <div key={cmd.id} className="command-item">
                        <div className="command-header">
                          <span className="command-time">{cmd.timestamp}</span>
                          <div className="command-status-indicators">
                            <div className={`status-dot-${cmd.status}`}></div>
                            <span className={`status-text-${cmd.status}`}>
                              {cmd.status === 'sent' ? 'Sending' :
                               cmd.status === 'acknowledged' ? 'Confirmed' : 'Failed'}
                            </span>
                            <span className={`source-badge ${cmd.source}`}>
                              {cmd.source === 'websocket' ? 'WS' : 'BC'}
                            </span>
                          </div>
                        </div>
                        <div className="command-text">
                          {cmd.command}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Panel - For Room B */}
        {!isRoomA && (
          <div className="info-panel">
            <div className="panel-header">
              <h3>Stream Info</h3>
              <p>View live robot stream</p>
            </div>

            <div className="info-section">
              <div className="info-item">
                <span className="info-label">Room</span>
                <span className="info-value">Room B</span>
              </div>
              <div className="info-item">
                <span className="info-label">Plan</span>
                <span className="info-value">{plan}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">
                  <span className="status-dot online"></span>
                  Connected
                </span>
              </div>
            </div>

            <div className="viewers-info">
              <h4>Viewers</h4>
              <div className="viewers-count">
                <span className="viewer-count-number">{robots.length + 3}</span>
                <span className="viewer-count-label">active viewers</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StreamingPage
