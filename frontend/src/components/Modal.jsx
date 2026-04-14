import React from 'react'

export default function Modal({ message, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content">
        <div className="modal-text">{message}</div>
        <div className="modal-actions">
          <button className="modal-ok-btn" onClick={onClose}>好的</button>
        </div>
      </div>
    </div>
  )
}
