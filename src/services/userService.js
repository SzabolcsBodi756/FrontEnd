// src/services/userService.js
const API_BASE = 'http://localhost:5118/api/Users'

// Egy user publikus adatai (profil oldal)
export async function getPublicUser(id) {
  const response = await fetch(`${API_BASE}/public/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Hiba a profil lekérésekor')
  }

  // { name: string, scores: [ { gameId, gameName, highScore } ] }
  return data.result
}

// Összes user publikus adatai (leaderboard)
export async function getAllPublicUsers() {
  const response = await fetch(`${API_BASE}/public`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Hiba a leaderboard lekérésekor')
  }

  // [ { name, scores: [...] }, ... ]
  return data.result
}
