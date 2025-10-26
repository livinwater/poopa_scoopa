import './RoomModal.css'

function RoomModal({ isOpen, plan, onClose, onSelectRoom }) {
  if (!isOpen || !plan) return null

  return (
    <div className="room-modal-overlay">
      <div className="room-modal-backdrop" onClick={onClose}></div>
      
      <div className="room-modal-content">
        <div className="room-modal-inner">
          <div className="room-modal-header">
          <img src="/assets/poopa-scoopa.png" alt="Poopa Scoopa" className="room-modal-icon" />
          <h2 className="room-modal-title">{plan}</h2>
          <p className="room-modal-subtitle">Select your room</p>
        </div>

        <div className="room-modal-rooms">
          <button
            className="room-button room-a"
            onClick={() => onSelectRoom('room-a')}
          >
            <div className="room-icon">🤖</div>
            <div className="room-info">
              <h3>Room A</h3>
              <p>Stream & Control</p>
            </div>
            <div className="room-badge active">Active</div>
          </button>

          <button
            className="room-button room-b"
            onClick={() => onSelectRoom('room-b')}
          >
            <div className="room-icon">📹</div>
            <div className="room-info">
              <h3>Room B</h3>
              <p>Watch Stream</p>
            </div>
            <div className="room-badge active">Active</div>
          </button>
        </div>

          <button
            className="room-modal-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomModal
