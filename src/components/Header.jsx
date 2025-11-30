import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import '../App.css'

function Header({ title = 'Arcade Mania', muted = false, toggleMute = () => {}, rightLabel, rightTo, dropdownItems }) {
  const location = useLocation()
  const auth = useAuth()
  const navigate = useNavigate()

  const handleRight = () => {
    if (rightTo) navigate(rightTo)
  }

  const handleLogout = () => {
    auth && auth.logout && auth.logout()
    navigate('/login')
  }

  return (
    <>
      <div className="side-bar left" />
      <div className="side-bar right" />

      <header className="arcade-header">
        <div>
          <button className="mute-btn" onClick={toggleMute} title="Mute/Unmute">{muted ? '❌' : '🎵'}</button>
        </div>
        <div className="arcade-title">{title}</div>
        <div className="header-actions">
          {dropdownItems && dropdownItems.length > 0 ? (
            <div className="dropdown">
              <button className="dropdown-btn">☰</button>
              <div className="dropdown-content">
                {dropdownItems.map((it, idx) => (
                  <a key={idx} href="#" onClick={(e) => { e.preventDefault(); it.onClick && it.onClick() }}>{it.label}</a>
                ))}
              </div>
            </div>
          ) : rightLabel ? (
            <button className="header-action-btn" onClick={handleRight}>{rightLabel}</button>
          ) : auth && auth.user ? (
            <div className="dropdown">
              <button className="dropdown-btn">☰</button>
              <div className="dropdown-content">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/') }}>Profile</a>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout() }}>Logout</a>
              </div>
            </div>
          ) : null}
        </div>
      </header>
    </>
  )
}

export default Header
