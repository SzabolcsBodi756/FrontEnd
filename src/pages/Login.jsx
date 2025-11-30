import React, { useState } from 'react'

function Login({ onNavigate }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const raw = localStorage.getItem('mockUsers')
    const users = raw ? JSON.parse(raw) : []
    const found = users.find((u) => u.username === username && u.password === password)
    if (found) {
      setMessage({ type: 'success', text: 'Sikeres bejelentkezés' })
    } else {
      setMessage({ type: 'error', text: 'Hibás felhasználónév vagy jelszó' })
    }
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

        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => onNavigate && onNavigate('main')}>Ugrás a főoldalra (teszt)</button>
        </div>

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
