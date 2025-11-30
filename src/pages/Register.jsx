import React, { useState } from 'react'

function Register({ onNavigate }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()

    // In a real app you'd POST to your API:
    // fetch('/api/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) })

    const raw = localStorage.getItem('mockUsers')
    const users = raw ? JSON.parse(raw) : []
    const exists = users.some((u) => u.username === username)
    if (exists) {
      setMessage({ type: 'error', text: 'A felhasználónév már foglalt' })
      return
    }

    const newUser = { username, password }
    users.push(newUser)
    localStorage.setItem('mockUsers', JSON.stringify(users))
    setMessage({ type: 'success', text: 'Regisztráció sikeres — most bejelentkezhetsz' })
    setUsername('')
    setPassword('')
    // Navigate to login after a short delay so user sees the success message
    setTimeout(() => onNavigate && onNavigate('login'), 800)
  }

  return (
    <div>
      <main style={{ textAlign: 'center', marginTop: 100, padding: 20 }}>
        <h2 style={{ fontFamily: "'Press Start 2P', cursive" }}>Regisztráció</h2>
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
          <button type="submit">Regisztrálás</button>
        </form>

        {message && (
          <div style={{ marginTop: 12, color: message.type === 'error' ? 'salmon' : 'lightgreen' }}>
            {message.text}
          </div>
        )}
      </main>
    </div>
  )
}

export default Register
