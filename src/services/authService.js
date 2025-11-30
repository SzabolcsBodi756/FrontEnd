// authService: central place to switch between mock (localStorage) and real Web API
// Usage:
// import * as authService from '../services/authService'
// const user = await authService.login(username, password)
// await authService.register(username, password)

// Replace the API_BASE with your backend URL when ready (no trailing slash)
const API_BASE = '' // e.g. 'https://api.example.com'

export async function login(username, password) {
  // If you have a backend, uncomment and adapt the fetch below:
  /*
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Login failed')
  }
  const data = await res.json()
  // Expected backend response example: { user: { username }, token: 'jwt-token' }
  // Store token as needed (localStorage, httpOnly cookie via server, etc.)
  if (data.token) localStorage.setItem('authToken', data.token)
  return data.user || { username }
  */

  // --- Mock implementation using localStorage (current project setup) ---
  const raw = localStorage.getItem('mockUsers')
  const users = raw ? JSON.parse(raw) : []
  const found = users.find((u) => u.username === username && u.password === password)
  if (!found) throw new Error('Invalid credentials')
  // Optionally issue a mock token
  const token = 'mock-token-' + username
  localStorage.setItem('authToken', token)
  return { username }
}

export async function register(username, password) {
  // If you have a backend, uncomment and adapt the fetch below:
  /*
  const res = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Register failed')
  }
  return await res.json()
  */

  // --- Mock implementation ---
  const raw = localStorage.getItem('mockUsers')
  const users = raw ? JSON.parse(raw) : []
  const exists = users.some((u) => u.username === username)
  if (exists) throw new Error('Username already exists')
  users.push({ username, password })
  localStorage.setItem('mockUsers', JSON.stringify(users))
  return { username }
}

export function logout() {
  // If you set a token in localStorage, remove it here
  localStorage.removeItem('authToken')
}
