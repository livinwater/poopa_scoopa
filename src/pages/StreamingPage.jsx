import { useState, useEffect, useRef } from 'react'
import AgoraRTC, { IAgoraRTCClient, IRemoteVideoTrack, IRemoteAudioTrack } from 'agora-rtc-sdk-ng'
import { fetchAgoraToken } from '../utils/agoraToken'
import { GoogleLogin } from '../components/GoogleLogin'
import '../pages/StreamingPage.css'

// Agora configuration from environment variables
const APP_ID = import.meta.env.VITE_AGORA_APP_ID || ''
const APP_CERTIFICATE = import.meta.env.VITE_AGORA_APP_CERTIFICATE || ''
const API_URL = import.meta.env.VITE_API_URL || ''
const CHANNEL_NAME = 'robot-video'

// Utility function to detect Unity connections vs web viewers
const isUnityConnection = (uid) => {
  return uid >= 100000
}

function StreamingPage({ room, plan, onBack }) {
  const mainViewRef = useRef(null)
  const hostVideoRef = useRef(null)
  const localVideoRef = useRef(null)
  const rtcClientRef = useRef(null)
  
  const [selectedRobot, setSelectedRobot] = useState('robot-a')
  const [isControlEnabled, setIsControlEnabled] = useState(true)
  const [isAgoraConnected, setIsAgoraConnected] = useState(false)
  const [localUid, setLocalUid] = useState(null)
  const [remoteUsers, setRemoteUsers] = useState(new Map())
  const [hostUser, setHostUser] = useState(null)
  const [viewerUsers, setViewerUsers] = useState(new Map())
  
  // Local media state
  const [localVideoTrack, setLocalVideoTrack] = useState(null)
  const [localAudioTrack, setLocalAudioTrack] = useState(null)
  const [isCameraEnabled, setIsCameraEnabled] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(false)

  // User state for Google login
  const [user, setUser] = useState(null)

  const robots = [
    { id: 'robot-a', name: 'Robot A', battery: 85, status: 'idle' },
    { id: 'robot-b', name: 'Robot B', battery: 92, status: 'idle' }
  ]

  const [robotCommands, setRobotCommands] = useState([])

  // Handle user login
  const handleUserLogin = (userData) => {
    setUser(userData)
  }

  // Connect to Agora stream
  const connectToAgoraStream = async () => {
    try {
      console.log('Connecting to Agora stream...')
      
      // Create Agora client
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' })
      rtcClientRef.current = client
      
      // Set up client events
      client.on('user-joined', (user) => {
        console.log(`🟢 User ${user.uid} joined the channel`)
        
        setRemoteUsers(prev => {
          const newMap = new Map(prev)
          const newUser = { uid: user.uid }
          newMap.set(user.uid, newUser)
          return newMap
        })
      })
      
      client.on('user-published', async (user, mediaType) => {
        console.log(`🔔 User ${user.uid} published ${mediaType}`)
        
        if (client.connectionState !== 'CONNECTED') {
          console.log(`⚠️ Skipping subscription - client not connected`)
          return
        }
        
        try {
          await client.subscribe(user, mediaType)
          console.log(`📺 Subscribed to ${mediaType} from user ${user.uid}`)
        } catch (error) {
          console.error(`❌ Failed to subscribe:`, error)
          return
        }
        
        setRemoteUsers(prev => {
          const newMap = new Map(prev)
          const existingUser = newMap.get(user.uid) || { uid: user.uid }
          
          if (mediaType === 'video' && user.videoTrack) {
            existingUser.videoTrack = user.videoTrack
            existingUser.hasVideo = true
            
            const isUnityUser = isUnityConnection(user.uid)
            const isFirstRobot = !hostUser
            const shouldBeHost = isUnityUser && isFirstRobot
            
            if (shouldBeHost) {
              console.log(`👑 User ${user.uid} becoming host`)
              
              existingUser.isHost = true
              setHostUser(existingUser)
              
              // Create host video container
              if (mainViewRef.current) {
                const mainContainer = document.createElement('div')
                mainContainer.id = `main-host-${user.uid}`
                mainContainer.className = 'w-full h-full bg-black flex items-center justify-center'
                
                const hostVideo = document.createElement('video')
                hostVideo.className = 'max-w-full max-h-full'
                hostVideo.style.width = 'auto'
                hostVideo.style.height = 'auto'
                hostVideo.autoplay = true
                hostVideo.playsInline = true
                hostVideo.muted = true
                hostVideo.id = `host-video-${user.uid}`
                hostVideoRef.current = hostVideo
                
                mainContainer.appendChild(hostVideo)
                mainViewRef.current.innerHTML = ''
                mainViewRef.current.appendChild(mainContainer)
                
                try {
                  user.videoTrack.play(hostVideo)
                  console.log(`✅ Host video playing`)
                } catch (error) {
                  console.error(`❌ Error playing video:`, error)
                }
              }
            } else {
              console.log(`👥 User ${user.uid} is a viewer`)
              existingUser.isHost = false
              setViewerUsers(prev => new Map(prev.set(user.uid, existingUser)))
              
              // For viewers, if there's no host yet, show this as the main video
              if (!hostUser && mainViewRef.current) {
                console.log(`📺 Displaying viewer ${user.uid} as main video (no host yet)`)
                
                const mainContainer = document.createElement('div')
                mainContainer.id = `viewer-video-${user.uid}`
                mainContainer.className = 'w-full h-full bg-black flex items-center justify-center'
                
                const viewerVideo = document.createElement('video')
                viewerVideo.className = 'max-w-full max-h-full'
                viewerVideo.style.width = 'auto'
                viewerVideo.style.height = 'auto'
                viewerVideo.autoplay = true
                viewerVideo.playsInline = true
                viewerVideo.muted = true
                viewerVideo.id = `video-${user.uid}`
                
                mainContainer.appendChild(viewerVideo)
                mainViewRef.current.innerHTML = ''
                mainViewRef.current.appendChild(mainContainer)
                
                try {
                  user.videoTrack.play(viewerVideo)
                  console.log(`✅ Viewer video playing`)
                } catch (error) {
                  console.error(`❌ Error playing viewer video:`, error)
                }
              }
            }
          }
          
          if (mediaType === 'audio' && user.audioTrack) {
            existingUser.audioTrack = user.audioTrack
            existingUser.hasAudio = true
            user.audioTrack.play()
          }
          
          newMap.set(user.uid, existingUser)
          return newMap
        })
      })
      
      client.on('user-unpublished', (user, mediaType) => {
        console.log(`🔇 User ${user.uid} unpublished ${mediaType}`)
        
        if (mediaType === 'video') {
          const remoteUser = remoteUsers.get(user.uid)
          if (remoteUser?.isHost) {
            const mainContainer = document.getElementById(`main-host-${user.uid}`)
            if (mainContainer) {
              mainContainer.remove()
            }
            setHostUser(null)
          }
        }
        
        setRemoteUsers(prev => {
          const newMap = new Map(prev)
          const existingUser = newMap.get(user.uid)
          if (existingUser) {
            if (mediaType === 'video') delete existingUser.videoTrack
            if (mediaType === 'audio') delete existingUser.audioTrack
            newMap.set(user.uid, existingUser)
          }
          return newMap
        })
      })
      
      client.on('user-left', (user) => {
        console.log(`🔴 User ${user.uid} left the channel`)
        
        const remoteUser = remoteUsers.get(user.uid)
        if (remoteUser?.isHost) {
          const mainContainer = document.getElementById(`main-host-${user.uid}`)
          if (mainContainer) {
            mainContainer.remove()
          }
          setHostUser(null)
        }
        
        setRemoteUsers(prev => {
          const newMap = new Map(prev)
          newMap.delete(user.uid)
          return newMap
        })
        
        setViewerUsers(prev => {
          const newMap = new Map(prev)
          newMap.delete(user.uid)
          return newMap
        })
      })
      
      // Generate UID
      const uid = Math.floor(Math.random() * 100000)
      const clientRole = 'audience' // Viewers are audience
      
      await client.setClientRole(clientRole)
      setLocalUid(uid)
      
      // Fetch token from API (null if unavailable - dev mode)
      const token = await fetchAgoraToken(CHANNEL_NAME, uid, clientRole)
      
      if (!APP_ID) {
        throw new Error('AGORA_APP_ID is not set. Please add VITE_AGORA_APP_ID to your .env file')
      }
      
      await client.join(APP_ID, CHANNEL_NAME, token, uid)
      console.log(`Joined channel ${CHANNEL_NAME} with UID ${uid}`)
      
      setIsAgoraConnected(true)
      console.log('✅ Connected to Agora stream')
      
    } catch (error) {
      console.error('Error connecting to stream:', error)
    }
  }

  // Auto-connect on mount
  useEffect(() => {
    connectToAgoraStream()
    
    return () => {
      if (localVideoTrack) {
        localVideoTrack.stop()
        localVideoTrack.close()
      }
      if (localAudioTrack) {
        localAudioTrack.stop()
        localAudioTrack.close()
      }
      if (rtcClientRef.current) {
        rtcClientRef.current.leave()
      }
    }
  }, [])

  const handleCommand = (direction) => {
    if (!isControlEnabled) return
    
    const sendTimestamp = new Date().toLocaleTimeString()
    const commandId = `cmd-${Date.now()}`
    
    const sendingCommand = {
      id: commandId,
      timestamp: sendTimestamp,
      command: `🔗 Sending command: ${direction.toUpperCase()}`,
      status: 'sent',
      source: 'blockchain'
    }
    
    setRobotCommands(prev => [sendingCommand, ...prev].slice(0, 20))
    setIsControlEnabled(false)
    
    setTimeout(() => {
      const blockchainSuccess = {
        id: `${commandId}-blockchain`,
        timestamp: new Date().toLocaleTimeString(),
        command: `✅ Blockchain confirmed: ${Math.random().toString(36).substring(7)}`,
        status: 'acknowledged',
        source: 'blockchain'
      }
      setRobotCommands(prev => [blockchainSuccess, ...prev].slice(0, 20))
      
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
        <div className="header-actions">
          {isRoomA && (
            <div className="header-ready-status">
              <span className={`status-badge-header ${isControlEnabled ? 'enabled' : 'disabled'}`}>
                {isControlEnabled ? '✓ Ready' : '⏳ Processing...'}
              </span>
            </div>
          )}
          <GoogleLogin onUserLogin={handleUserLogin} />
        </div>
      </div>

      <div className="streaming-layout">
        {/* Main Video Area */}
        <div className="main-video-area">
          <div className="video-container" ref={mainViewRef}>
            {!hostUser && !isAgoraConnected && (
              <div className="video-placeholder">
                <div className="video-icon">📹</div>
                <p>Waiting for stream...</p>
                <span className="room-badge-inline">
                  {isRoomA ? '🎮 Stream & Control' : '👁️ Watch Only'}
                </span>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="status-overlay">
            <div className="status-item">
              <div className={`status-dot ${isAgoraConnected ? 'online' : ''}`}></div>
              <span>Video: {isAgoraConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="status-item">
              <div className="status-dot online"></div>
              <span>Robot: Connected</span>
            </div>
            <div className="status-item">
              <div className="status-dot online"></div>
              <span>{remoteUsers.size} Participants</span>
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
