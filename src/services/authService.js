const API_BASE = 'http://localhost:5118/api/Users' // v. https + port

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: username,
      password: password
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Hibás bejelentkezés')
  }

  // visszaadjuk a user objektumot
  return data.result
}

export async function register(username, password) {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: username,
      password: password
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Regisztráció sikertelen')
  }

  return data.result
}
