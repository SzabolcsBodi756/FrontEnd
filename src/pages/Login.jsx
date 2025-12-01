import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import * as authService from '../services/authService'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const navigate = useNavigate()
  const auth = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Use the authService abstraction. It currently uses a local mock,
    // but when you adapt the service to the real API (see src/services/authService.js),
    // no further changes are required here.
    authService.login(username, password)
      .then((user) => {
        auth.login(user)
        setMessage({ type: 'success', text: 'Sikeres bejelentkezés, átvitel a főoldalra...' })
        navigate('/', { replace: true })
      })
      .catch((err) => {
        setMessage({ type: 'error', text: err.message || 'Hibás felhasználónév vagy jelszó' })
      })
  }

  // (Teszt gomb áthelyezve a Main.jsx-be.)

  return (
    <div>
      <main style={{ textAlign: 'center', marginTop: 100, padding: 20 }}>
        <h2 style={{ fontFamily: "'Press Start 2P', cursive" }}>Bejelentkezés</h2>
        <form onSubmit={handleSubmit} style={{ maxWidth: 360, margin: '0 auto' }}>
          <input
            placeholder="Felhasználónév"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            placeholder="Jelszó"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Bejelentkezés</button>
        </form>

        {/* Direct navigation to main removed — main is protected until login */}

        {message && (
          <div style={{ marginTop: 12, color: message.type === 'error' ? 'salmon' : 'lightgreen' }}>
            {message.text}
          </div>
        )}
      </main>
    </div>
  )
}

export default Login
