// src/services/userService.js
import { getToken, logout } from './authService'

const API_BASE = 'http://localhost:5118/api/Users'

// Közös helper GET + biztonságos JSON olvasásra
async function getJson(url, defaultErrorMessage, useAuth = false) {
  const headers = {
    'Content-Type': 'application/json'
  }

  // ✅ ha kell, hozzáadjuk a Bearer tokent
  if (useAuth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers
  })

  // Ha lejárt/hibás token → 401
  if (response.status === 401) {
    // opcionális: kidob a rendszerből
    logout()
    throw new Error('Lejárt vagy érvénytelen bejelentkezés. Jelentkezz be újra.')
  }

  const text = await response.text()

  if (!text) {
    if (!response.ok) throw new Error(defaultErrorMessage)
    return { message: '', result: null }
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Érvénytelen JSON válasz érkezett a szervertől.')
  }

  if (!response.ok) {
    throw new Error(data.message || defaultErrorMessage)
  }

  return data
}

// Egy user publikus adatai (profil oldal)
export async function getPublicUser(id) {
  const data = await getJson(
    `${API_BASE}/public/${id}`,
    'Hiba a profil lekérésekor',
    false
  )

  return data.result
}

// Összes user publikus adatai (leaderboard)
export async function getAllPublicUsers() {
  const data = await getJson(
    `${API_BASE}/public`,
    'Hiba a leaderboard lekérésekor',
    false
  )

  return data.result
}

/**
 * ✅ ADMIN példa (csak akkor használd, ha kell)
 * Ezek most a backendben [Authorize]-osak, token kell hozzá.
 */
export async function getAllUsersAdmin() {
  const data = await getJson(
    `${API_BASE}/admin`,
    'Hiba az admin lekérdezésnél',
    true
  )
  return data.result
}

export async function getUserAdminById(id) {
  const data = await getJson(
    `${API_BASE}/admin/${id}`,
    'Hiba az admin user lekérdezésnél',
    true
  )
  return data.result
}
