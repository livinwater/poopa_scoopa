import { useState, useEffect, useRef, useCallback } from 'react'
import AgoraRTC, { IAgoraRTCClient, IRemoteVideoTrack, IRemoteAudioTrack } from 'agora-rtc-sdk-ng'
import { fetchAgoraToken } from '../utils/agoraToken'
import { GoogleLogin } from '../components/GoogleLogin'
import '../pages/StreamingPage.css'

// Agora configuration from environment variables
const APP_ID = import.meta.env.VITE_AGORA_APP_ID || ''
const APP_CERTIFICATE = import.meta.env.VITE_AGORA_APP_CERTIFICATE || ''
const API_URL = import.meta.env.VITE_API_URL || ''
const CHANNEL_NAME = 'robot-video'

function StreamingPage({ room, plan, onBack }) {
  const mainViewRef = useRef(null)
  const hostVideoRef = useRef(null)
  const localVideoRef = useRef(null)
  const rtcClientRef = useRef(null)
  
  // Persistent video element cache for PiP
  const videoElementCacheRef = useRef(new Map())
  const playingTracksRef = useRef(new Set())
  
  const [selectedRobot, setSelectedRobot] = useState('robot-a')
  const [isControlEnabled, setIsControlEnabled] = useState(true)
  const [isAgoraConnected, setIsAgoraConnected] = useState(false)
  const [localUid, setLocalUid] = useState(null)
  const [remoteUsers, setRemoteUsers] = useState(new Map())
  const [hostUser, setHostUser] = useState(null)
  const [viewerUsers, setViewerUsers] = useState(new Map())
  
  // PiP state
  const [splitScreenUsers, setSplitScreenUsers] = useState([])
  const [primaryUserIndex, setPrimaryUserIndex] = useState(0)
  
  // Create ref to track primaryUserIndex for use in event handlers
  const primaryUserIndexRef = useRef(0)
  
  useEffect(() => {
    primaryUserIndexRef.current = primaryUserIndex
  }, [primaryUserIndex])
  
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

  // Update split screen display with PiP functionality
  const updateSplitScreenDisplay = (users, overridePrimaryIndex) => {
    if (!mainViewRef.current) return
    
    // Clear previous content
    mainViewRef.current.innerHTML = ''
    
    // Create main PiP container
    const pipContainer = document.createElement('div')
    pipContainer.id = 'pip-container'
    pipContainer.className = 'absolute inset-0 w-full h-full bg-black'
    
    // Create a single video container that holds all videos
    const videoContainer = document.createElement('div')
    videoContainer.className = 'absolute inset-0 w-full h-full'
    videoContainer.id = 'video-container'
    
    // Create click area for overlay swapping (invisible overlay)
    const overlayClickArea = document.createElement('div')
    overlayClickArea.className = 'absolute top-4 right-4 w-1/3 h-1/3 cursor-pointer z-20'
    overlayClickArea.id = 'pip-overlay-click'
    
    // Process each user and position their video elements using CSS
    users.forEach((user, index) => {
      const userKey = String(user.uid)
      
      // Try to reuse existing video element from persistent cache
      let videoElement = videoElementCacheRef.current.get(userKey)
      
      if (!videoElement && user.videoTrack) {
        // Create new video element only if we don't have one in cache
        videoElement = document.createElement('video')
        videoElement.autoplay = true
        videoElement.playsInline = true
        videoElement.muted = true
        videoElement.setAttribute('data-uid', userKey)
        videoElement.style.position = 'absolute'
        videoElement.style.objectFit = 'contain'
        videoElement.style.backgroundColor = 'black'
        
        // Store in persistent cache
        videoElementCacheRef.current.set(userKey, videoElement)
        
        // Add to video container ONCE - never move it again
        videoContainer.appendChild(videoElement)
        
        // Play video track only once when creating new element
        const trackKey = `${userKey}-${user.videoTrack.getTrackId()}`
        user.videoTrack.play(videoElement)
        playingTracksRef.current.add(trackKey)
        console.log(`📺 Playing video for user ${user.uid} in PiP position ${index + 1}`)
      } else if (videoElement && user.videoTrack) {
        // Reusing existing video element - avoid calling play() unless it's a new track
        console.log(`♻️ Reusing existing video element for user ${user.uid}`)
        
        // Ensure video is in the container (but don't move if already there)
        if (videoElement.parentNode !== videoContainer) {
          videoContainer.appendChild(videoElement)
        }
        
        // Only play if this is a completely new track (different track ID)
        const currentTrackKey = `${userKey}-${user.videoTrack.getTrackId()}`
        if (!playingTracksRef.current.has(currentTrackKey)) {
          // Clean up old track references for this user
          const oldTracks = Array.from(playingTracksRef.current).filter(trackKey => 
            trackKey.startsWith(`${userKey}-`)
          )
          oldTracks.forEach(trackKey => playingTracksRef.current.delete(trackKey))
          
          // Play new track
          user.videoTrack.play(videoElement)
          playingTracksRef.current.add(currentTrackKey)
          console.log(`🔄 Playing NEW video track for user ${user.uid}`)
        } else {
          console.log(`✅ Video track for user ${user.uid} already playing on cached element`)
        }
      } else {
        // No video element and no video track
        console.log(`⚠️ No video track or element for user ${user.uid}`)
        return // Skip this user
      }
      
      if (!videoElement) return
      
      // Use override index if provided, otherwise use current state
      const effectivePrimaryIndex = overridePrimaryIndex !== undefined ? overridePrimaryIndex : primaryUserIndex
      
      // Determine if this should be the main video based on effective primary index
      const isMainVideo = (effectivePrimaryIndex === 0 && index === 0) || (effectivePrimaryIndex === 1 && index === 1)
      
      // Clear all positioning styles first
      videoElement.style.top = ''
      videoElement.style.left = ''
      videoElement.style.right = ''
      videoElement.style.bottom = ''
      videoElement.style.width = ''
      videoElement.style.height = ''
      videoElement.style.border = ''
      videoElement.style.borderRadius = ''
      
      if (isMainVideo) {
        // Position as main video (full screen)
        videoElement.style.top = '0px'
        videoElement.style.left = '0px'
        videoElement.style.width = '100%'
        videoElement.style.height = '100%'
        videoElement.style.zIndex = '1'
        videoElement.style.display = 'block'
        console.log(`🎯 Positioned user ${user.uid} as MAIN video`)
      } else if (index < 2) {
        // Position as overlay video (top-right corner)
        videoElement.style.top = '16px'
        videoElement.style.right = '16px'
        videoElement.style.left = 'auto'
        videoElement.style.width = '33.333333%'
        videoElement.style.height = '33.333333%'
        videoElement.style.zIndex = '10'
        videoElement.style.display = 'block'
        videoElement.style.border = '2px solid rgba(255, 255, 255, 0.3)'
        videoElement.style.borderRadius = '8px'
        console.log(`🎯 Positioned user ${user.uid} as OVERLAY video`)
      } else {
        // Hide additional users
        videoElement.style.display = 'none'
      }
    })
    
    // Add click handler to overlay area for swapping
    const handleOverlayClick = () => {
      const currentPrimaryIndex = primaryUserIndexRef.current
      console.log('Overlay clicked, current primaryUserIndex:', currentPrimaryIndex)
      const newPrimaryIndex = currentPrimaryIndex === 0 ? 1 : 0
      console.log('Setting new primaryUserIndex:', newPrimaryIndex)
      setPrimaryUserIndex(newPrimaryIndex)
      // Force immediate update after swap with new primary index
      setTimeout(() => {
        updateSplitScreenDisplay(users, newPrimaryIndex)
      }, 50)
    }
    
    overlayClickArea.addEventListener('click', handleOverlayClick)
    
    // Store reference for cleanup
    overlayClickArea._clickHandler = handleOverlayClick
    
    // Add user info overlays
    users.forEach((user, index) => {
      const effectivePrimaryIndex = overridePrimaryIndex !== undefined ? overridePrimaryIndex : primaryUserIndex
      const isMainVideo = (effectivePrimaryIndex === 0 && index === 0) || (effectivePrimaryIndex === 1 && index === 1)
      
      if (isMainVideo) {
        // Main video overlay
        const mainOverlay = document.createElement('div')
        mainOverlay.className = 'absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20'
        mainOverlay.textContent = `${user.uid} (Main)`
        pipContainer.appendChild(mainOverlay)
      } else if (index < 2) {
        // PiP video overlay
        const pipOverlay = document.createElement('div')
        pipOverlay.className = 'absolute top-5 right-5 bg-black/70 text-white px-2 py-0.5 rounded text-xs z-20'
        pipOverlay.textContent = String(user.uid)
        pipContainer.appendChild(pipOverlay)
      }
    })
    
    // Add placeholders
    if (users.length === 0) {
      // Main video placeholder
      const mainPlaceholder = document.createElement('div')
      mainPlaceholder.className = 'absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white'
      mainPlaceholder.innerHTML = `
        <div class="text-center">
          <div class="text-6xl mb-4">📹</div>
          <div class="text-lg font-semibold">Waiting for stream...</div>
          <div class="text-sm text-gray-400 mt-2">Main view will appear here</div>
        </div>
      `
      pipContainer.appendChild(mainPlaceholder)
      
      // PiP overlay placeholder
      const pipPlaceholder = document.createElement('div')
      pipPlaceholder.className = 'absolute top-4 right-4 w-1/3 h-1/3 flex items-center justify-center bg-gray-800/80 text-white/60 border-2 border-white/30 rounded-lg z-10 cursor-pointer'
      pipPlaceholder.innerHTML = `
        <div class="text-center">
          <div class="text-2xl mb-2">⏳</div>
          <div class="text-xs">Click when ready</div>
        </div>
      `
      pipContainer.appendChild(pipPlaceholder)
    } else if (users.length === 1) {
      // Only one user - show placeholder for second slot
      const placeholder = document.createElement('div')
      placeholder.className = 'absolute top-4 right-4 w-1/3 h-1/3 flex items-center justify-center bg-gray-800/80 text-white/60 border-2 border-white/30 rounded-lg z-10'
      placeholder.innerHTML = '<div class="text-center"><div class="text-2xl mb-2">⏳</div><div class="text-xs">Waiting for more users...</div></div>'
      pipContainer.appendChild(placeholder)
    }
    
    // Append video container to main PiP container
    pipContainer.appendChild(videoContainer)
    pipContainer.appendChild(overlayClickArea)
    
    // Add the PiP container to the main view
    mainViewRef.current.appendChild(pipContainer)
    
    console.log(`✅ Split screen updated with ${users.length} users`)
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
            
            // Add user to split screen (first 2 users get split screen)
            setSplitScreenUsers(prev => {
              const updated = [...prev]
              const existingIndex = updated.findIndex(u => u.uid === existingUser.uid)
              
              if (existingIndex >= 0) {
                // Update existing user
                updated[existingIndex] = existingUser
              } else if (updated.length < 2) {
                // Add new user to split screen if space available
                updated.push(existingUser)
                console.log(`📺 Added user ${user.uid} to split screen (position ${updated.length})`)
              }
              
              // Update split screen display
              updateSplitScreenDisplay(updated)
              
              return updated
            })
            
            // Determine if this is the host (first video publisher or has higher authority)
            if (!hostUser) {
              console.log(`👑 User ${user.uid} is now the HOST`)
              existingUser.isHost = true
              setHostUser(existingUser)
            } else {
              console.log(`👥 User ${user.uid} is a VIEWER with video`)
              existingUser.isHost = false
              setViewerUsers(prev => new Map(prev.set(user.uid, existingUser)))
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
          // Remove user from split screen
          setSplitScreenUsers(prev => {
            const updated = prev.filter(u => u.uid !== user.uid)
            updateSplitScreenDisplay(updated)
            return updated
          })
          
          const remoteUser = remoteUsers.get(user.uid)
          if (remoteUser?.isHost) {
            setHostUser(null)
            console.log(`👑❌ Host stopped streaming`)
          }
        }
        
        setRemoteUsers(prev => {
          const newMap = new Map(prev)
          const existingUser = newMap.get(user.uid)
          if (existingUser) {
            if (mediaType === 'video') {
              delete existingUser.videoTrack
              existingUser.hasVideo = false
            }
            if (mediaType === 'audio') {
              delete existingUser.audioTrack
              existingUser.hasAudio = false
            }
            
            // Keep the user in remoteUsers even if they're not publishing
            newMap.set(user.uid, existingUser)
          }
          return newMap
        })
      })
      
      client.on('user-left', (user) => {
        console.log(`🔴 User ${user.uid} left the channel`)
        
        // Clean up video element and playing tracks from cache
        const userKey = String(user.uid)
        const cachedElement = videoElementCacheRef.current.get(userKey)
        if (cachedElement) {
          videoElementCacheRef.current.delete(userKey)
          console.log(`🗑️ Cleaned up cached video element for user ${user.uid}`)
        }
        
        // Clean up playing tracks for this user
        const tracksToRemove = Array.from(playingTracksRef.current).filter(trackKey => 
          trackKey.startsWith(`${userKey}-`)
        )
        tracksToRemove.forEach(trackKey => {
          playingTracksRef.current.delete(trackKey)
          console.log(`🗑️ Cleaned up playing track: ${trackKey}`)
        })
        
        // Remove user from split screen
        setSplitScreenUsers(prev => {
          const updated = prev.filter(u => u.uid !== user.uid)
          updateSplitScreenDisplay(updated)
          return updated
        })
        
        const remoteUser = remoteUsers.get(user.uid)
        if (remoteUser?.isHost) {
          setHostUser(null)
          console.log(`👑🚪 Host left`)
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

  // Update split screen display when splitScreenUsers or primaryUserIndex changes
  // Also render on mount to show placeholder
  useEffect(() => {
    updateSplitScreenDisplay(splitScreenUsers)
  }, [splitScreenUsers, primaryUserIndex])

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
          <div className="video-container" ref={mainViewRef}></div>

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
              <p>Navigate robots</p>
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
