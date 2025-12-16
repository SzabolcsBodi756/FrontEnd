// src/services/authService.js

const API_BASE = 'http://localhost:5118/api/Users'
const TOKEN_KEY = 'arcade_token'

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Segédfüggvény POST kérésekhez.
 * - path: pl. "/login" vagy "/register"
 * - body: a JS objektum, amit JSON-ként küldünk
 */
async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  let data
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error('Ismeretlen hiba történt a szerveren.')
    }
    return null
  }

  if (!response.ok) {
    const msg = data?.message || 'Ismeretlen hiba történt.'
    throw new Error(msg)
  }

  return data
}

/**
 * Bejelentkezés
 *
 * Back-end endpoint:
 * POST /api/Users/login
 * Body: { "name": "<felhasználónév>", "password": "<jelszó>" }
 *
 * ÚJ JWT válasz (200):
 * {
 *   "message": "Sikeres bejelentkezés",
 *   "token": "eyJ...",
 *   "result": { ...user... }
 * }
 */
export async function login(username, password) {
  const payload = { name: username, password }

  const data = await postJson('/login', payload)

  // ✅ token mentése (JWT)
  setToken(data?.token)

  // a user objektum ugyanúgy visszamegy, mint eddig
  return data.result
}

/**
 * Regisztráció
 */
export async function register(username, password) {
  const payload = { name: username, password }

  const data = await postJson('/register', payload)
  return data.result
}
