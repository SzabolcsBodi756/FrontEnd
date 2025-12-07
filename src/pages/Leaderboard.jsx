// src/pages/Leaderboard.jsx
import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import { getAllPublicUsers } from '../services/userService'
import '../App.css'

function Leaderboard() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    getAllPublicUsers()
      .then((data) => {
        setUsers(data || [])
        setError(null)
      })
      .catch((err) => {
        setError(err.message || 'Hiba a leaderboard lekérésekor')
      })
  }, [])

  return (
    <>
      <Header title="Arcade Mania" />

      <main className="arcade-main">
        <h2 className="screen-title">Leaderboard</h2>

        {error && (
          <div className="error-text">
            {error}
          </div>
        )}

        <div className="profile-grid">
          {users.map((user, idx) => (
            <div key={idx} className="profile-card">
              {/* Felhasználónév blokk – ugyanúgy, mint a Profil oldalon */}
              <div className="profile-card-section">
                <div className="profile-label">Username:</div>
                <div className="profile-value">{user.name}</div>
              </div>

              {/* Pontszámok blokk – ugyanaz a „táblázat” mint a Profil oldalon */}
              <div className="profile-card-section">

                <div className="score-table">
                  <div className="score-row header">
                    <span style={{marginRight: "15px"}}>Game</span>
                    <span>High&nbsp;Score</span>
                  </div>

                  {(user.scores || []).map((s) => (
                    <div key={s.gameId} className="score-row">
                      <span>{s.gameName}</span>
                      <span>{s.highScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}

export default Leaderboard
