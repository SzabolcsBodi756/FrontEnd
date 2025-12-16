// src/services/gameService.js

const API_BASE = 'http://localhost:5118/api/Users'

// --- ADMIN TOKEN (WPF-mód) ---
const ADMIN_TOKEN_KEY = 'arcade_admin_token'

// 1) Ajánlott: .env-ből (Vite esetén)
const ADMIN_SERVICE_KEY =
  (import.meta?.env?.VITE_ADMIN_SERVICE_KEY) ||
  // 2) Ha nincs .env, akkor ide írd be fixen:
  'ArcadeMania_WPF_ServiceKey_AtLeast_32_Chars!'

async function ensureAdminToken() {
  const existing = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (existing) return existing

  const resp = await fetch(`${API_BASE}/admin-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceKey: ADMIN_SERVICE_KEY })
  })

  const text = await resp.text().catch(() => '')
  if (!resp.ok) {
    throw new Error(text || `Admin token request failed (${resp.status})`)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Admin token válasz nem JSON.')
  }

  const token = data?.token
  if (!token) throw new Error('Admin token válasz nem tartalmaz tokent.')

  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  return token
}

async function adminFetch(url, options = {}, retry = true) {
  const token = await ensureAdminToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }

  const resp = await fetch(url, { ...options, headers })

  // ha 401 → lehet lejárt/rossz token → töröljük, újrakérjük és 1x újrapróbáljuk
  if (resp.status === 401 && retry) {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    const fresh = await ensureAdminToken()

    const headers2 = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${fresh}`
    }

    return fetch(url, { ...options, headers: headers2 })
  }

  return resp
}

// ---------------------------------------------------

function normalizeName(s) {
  return String(s || '').trim().toLowerCase()
}

function toGuidString(x) {
  return x ? String(x) : null
}

function toNumber(x) {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

/**
 * GET: /api/Users/admin/{id}
 * Visszaadja az admin user adatokat + score listát
 */
export async function getAdminUser(userId) {
  const resp = await adminFetch(`${API_BASE}/admin/${userId}`, {
    method: 'GET'
  })

  let data = null
  const text = await resp.text().catch(() => '')

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // ha nem JSON, dobjuk a text-et
    if (!resp.ok) throw new Error(text || 'Failed to fetch admin user')
    return null
  }

  if (!resp.ok) {
    throw new Error(data?.message || text || 'Failed to fetch admin user')
  }

  return data?.result
}

/**
 * Kinyeri a score listát (különböző casing-eket is támogat)
 */
function getScoresArray(adminUserResult) {
  return adminUserResult?.scores || adminUserResult?.Scores || []
}

/**
 * Kinyeri egy adott game highscore-ját az admin user result-ból.
 * Név alapján keresünk, és visszaadjuk a gameId-t is.
 */
export function extractHighScoreForGame(adminUserResult, gameName) {
  const scores = getScoresArray(adminUserResult)
  const g = normalizeName(gameName)

  const byName = scores.find(s =>
    normalizeName(s.gameName) === g ||
    normalizeName(s.GameName) === g ||
    normalizeName(s.name) === g ||
    normalizeName(s.Name) === g ||
    normalizeName(s.game) === g
  )

  if (byName) {
    const hs = toNumber(byName.highScore ?? byName.HighScore ?? byName.highscore ?? 0)
    const gameId = toGuidString(byName.gameId ?? byName.GameId ?? byName.gameID ?? byName.GameID ?? null)
    return { highScore: hs, gameId }
  }

  return { highScore: 0, gameId: null }
}

/**
 * Összerakja a PUT-hoz szükséges scores tömböt úgy,
 * hogy a backend NE törölje a többi játék score-ját.
 * (Minden meglévő score-t elküldünk, és csak a targetet módosítjuk.)
 */
function buildPreservingScoresPayload(adminUserResult, targetGameId, newHighScore) {
  const scores = getScoresArray(adminUserResult)

  const normalized = scores
    .map(s => ({
      gameId: toGuidString(s.gameId ?? s.GameId ?? s.gameID ?? s.GameID ?? null),
      highScore: toNumber(s.highScore ?? s.HighScore ?? s.highscore ?? 0)
    }))
    .filter(x => !!x.gameId)

  if (normalized.length === 0) {
    return [{ gameId: targetGameId, highScore: newHighScore }]
  }

  let found = false
  const updated = normalized.map(x => {
    if (x.gameId === targetGameId) {
      found = true
      return { gameId: x.gameId, highScore: newHighScore }
    }
    return x
  })

  if (!found) {
    updated.push({ gameId: targetGameId, highScore: newHighScore })
  }

  return updated
}

/**
 * PUT: /api/Users/admin/{id}
 * Úgy küldjük, hogy ne törölje a többi score-t:
 * - az összes meglévő score-t elküldjük
 * - csak a cél játék score-ját módosítjuk
 */
export async function updateSingleHighScorePreserveOthers(userId, adminUserResult, gameId, newHighScore) {
  const payload = {
    name: null,
    password: null,
    scores: buildPreservingScoresPayload(adminUserResult, gameId, newHighScore)
  }

  const resp = await adminFetch(`${API_BASE}/admin/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(txt || 'Failed to update high score')
  }

  return true
}

/**
 * A játékok ezt hívják.
 */
export async function submitScore(gameName, score, userOrId, options = {}) {
  try {
    const userId =
      typeof userOrId === 'string'
        ? userOrId
        : (userOrId?.id || userOrId?.Id)

    if (!userId) return false

    const s = toNumber(score)

    const mode = options.mode || 'higher'
    const zeroMeansUnset = options.zeroMeansUnset ?? false

    const adminUser = await getAdminUser(userId)
    const { highScore: dbHigh, gameId } = extractHighScoreForGame(adminUser, gameName)

    if (!gameId) {
      console.warn('[submitScore] Missing gameId in admin GET response for game:', gameName)
      return false
    }

    let shouldUpdate = false

    if (mode === 'lower') {
      if (zeroMeansUnset && dbHigh === 0) {
        shouldUpdate = true
      } else {
        shouldUpdate = (dbHigh > 0 && s < dbHigh)
      }
    } else {
      shouldUpdate = s > dbHigh
    }

    if (shouldUpdate) {
      await updateSingleHighScorePreserveOthers(userId, adminUser, gameId, s)
      return true
    }

    return true
  } catch (e) {
    console.warn('submitScore failed', e)
    return false
  }
}
