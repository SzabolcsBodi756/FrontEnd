// src/services/gameService.js
const API_BASE = 'http://localhost:5118/api/Users'

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
  const resp = await fetch(`${API_BASE}/admin/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  let data = null
  try {
    data = await resp.json()
  } catch {
    const txt = await resp.text().catch(() => '')
    throw new Error(txt || 'Failed to fetch admin user')
  }

  if (!resp.ok) {
    throw new Error(data?.message || 'Failed to fetch admin user')
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

  // Egységesítsük (gameId + highScore)
  const normalized = scores
    .map(s => ({
      gameId: toGuidString(s.gameId ?? s.GameId ?? s.gameID ?? s.GameID ?? null),
      highScore: toNumber(s.highScore ?? s.HighScore ?? s.highscore ?? 0)
    }))
    .filter(x => !!x.gameId)

  // Ha nincs lista, legalább a targetet küldjük (de normál esetben van)
  if (normalized.length === 0) {
    return [{ gameId: targetGameId, highScore: newHighScore }]
  }

  // Target frissítése (ha megtaláljuk)
  let found = false
  const updated = normalized.map(x => {
    if (x.gameId === targetGameId) {
      found = true
      return { gameId: x.gameId, highScore: newHighScore }
    }
    return x
  })

  // Ha valamiért nem volt benne, hozzáadjuk
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

  const resp = await fetch(`${API_BASE}/admin/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
 * Logika:
 * 1) GET /admin/{id} => DB highscore kiolvasás
 * 2) ha új score > DB highscore => frissítjük
 * 3) ha új score <= DB highscore => nem frissítjük
 *
 * FONTOS: a 0-t NEM dobjuk el, tehát 0 is átmehet a logikán.
 * (Ha DB-ben is 0, akkor opcionálisan "megerősíthetjük" a mentést.)
 */
export async function submitScore(gameName, score, userOrId) {
  try {
    const userId =
      typeof userOrId === 'string'
        ? userOrId
        : (userOrId?.id || userOrId?.Id)

    if (!userId) return false

    const s = toNumber(score) // 0 teljesen OK

    const adminUser = await getAdminUser(userId)
    const { highScore: dbHigh, gameId } = extractHighScoreForGame(adminUser, gameName)

    // Ha nincs gameId a GET válaszban, nem tudunk PUT-tal frissíteni.
    if (!gameId) {
      console.warn('[submitScore] Missing gameId in admin GET response for game:', gameName)
      return false
    }

    // Ha az új score nagyobb: frissítünk
    if (s > dbHigh) {
      await updateSingleHighScorePreserveOthers(userId, adminUser, gameId, s)
      return true
    }

    // ✅ 0-t is "fel lehet tölteni" igény szerint:
    // Ha 0 a score, és 0 a dbHigh, akkor is megküldjük egyszer,
    // hogy biztosan rögzítve legyen (pl. init / konzisztencia okból).
    if (s === 0 && dbHigh === 0) {
      await updateSingleHighScorePreserveOthers(userId, adminUser, gameId, 0)
      return true
    }

    // Egyébként nincs mit frissíteni
    return true
  } catch (e) {
    console.warn('submitScore failed', e)
    return false
  }
}
