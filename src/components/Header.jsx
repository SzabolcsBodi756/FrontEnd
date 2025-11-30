import React from 'react'
import '../App.css'

function Header({ title = 'Arcade Mania', muted = false, toggleMute = () => {}, rightLabel, rightOnClick, dropdownItems }) {
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
            <button className="header-action-btn" onClick={rightOnClick}>{rightLabel}</button>
          ) : null}
        </div>
      </header>
    </>
  )
}

export default Header
