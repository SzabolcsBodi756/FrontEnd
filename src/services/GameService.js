// src/services/gameService.js
import { getToken, logout } from './authService'

const API_BASE = 'http://localhost:5118/api/Users'

// ----------------------------
// Auth fetch helpers
// ----------------------------
async function authFetch(url, options = {}) {
  const token = getToken()
  if (!token) {
    throw new Error('Nincs bejelentkezés. Jelentkezz be újra.')
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }

  const resp = await fetch(url, { ...options, headers })

  if (resp.status === 401) {
    logout()
    throw new Error('Lejárt vagy érvénytelen bejelentkezés. Jelentkezz be újra.')
  }

  return resp
}

async function readJsonOrThrow(resp, defaultErr) {
  const text = await resp.text().catch(() => '')
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    if (!resp.ok) throw new Error(text || defaultErr)
    return null
  }

  if (!resp.ok) {
    throw new Error(data?.message || defaultErr)
  }

  return data
}

// ----------------------------
// NEW API: ME SCORES
// ----------------------------
export async function getMyScores() {
  const resp = await authFetch(`${API_BASE}/me/scores`, { method: 'GET' })
  const data = await readJsonOrThrow(resp, 'Nem sikerült lekérni a pontszámokat.')
  return data?.result || []
}

export async function updateMyScores(scoresArray) {
  const resp = await authFetch(`${API_BASE}/me/scores`, {
    method: 'POST',
    body: JSON.stringify(scoresArray)
  })

  await readJsonOrThrow(resp, 'Nem sikerült frissíteni a pontszámokat.')
  return true
}

// ----------------------------
// Helpers
// ----------------------------
function normalizeName(s) {
  return String(s || '').trim().toLowerCase()
}

function toNumber(x) {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

export function extractHighScoreForGame(scoresArray, gameName) {
  const scores = Array.isArray(scoresArray) ? scoresArray : []
  const target = normalizeName(gameName)

  const s = scores.find((x) => normalizeName(x?.gameName) === target)

  return {
    highScore: toNumber(s?.highScore),
    gameId: s?.gameId || null
  }
}

// ----------------------------
// MAIN: submitScore
// - higher: nagyobb a jobb (snake, fighter)
// - lower: kisebb a jobb (memory), zeroMeansUnset opcióval
// ----------------------------
export async function submitScore(gameName, score, options = {}) {
  const mode = options.mode || 'higher' // 'higher' | 'lower'
  const zeroMeansUnset = options.zeroMeansUnset === true

  try {
    const s = toNumber(score)

    // 1) lekérjük a teljes score listát
    const scores = await getMyScores()

    // 2) kivesszük a cél játékot
    const { highScore: dbHigh, gameId } = extractHighScoreForGame(scores, gameName)

    if (!gameId) {
      console.warn('[submitScore] Missing gameId for game:', gameName)
      return false
    }

    // 3) eldöntjük kell-e update
    let shouldUpdate = false

    if (mode === 'lower') {
      if (zeroMeansUnset && dbHigh === 0) shouldUpdate = true
      else shouldUpdate = (dbHigh > 0 && s < dbHigh)
    } else {
      shouldUpdate = s > dbHigh
    }

    if (!shouldUpdate) return true

    // 4) preserve others: a teljes listát küldjük, csak ezt módosítjuk
    const nextScores = scores.map((x) => ({
      gameId: x.gameId,
      gameName: x.gameName,
      highScore: x.gameId === gameId ? s : toNumber(x.highScore)
    }))

    // 5) POST
    await updateMyScores(nextScores)
    return true
  } catch (e) {
    console.warn('submitScore failed', e)
    return false
  }
}
