// src/Games/Game2.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import './Game2.css'

import arcadeBg from '../assets/arcade.png'
import cardFrontImg from '../assets/kartya.jpg'

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { submitScore, getAdminUser, extractHighScoreForGame } from '../services/gameService'

export default function Game2() {
  const GAME_NAME = 'Memory'

  const navigate = useNavigate()
  const auth = useAuth()

  const [running, setRunning] = useState(false)
  const [ended, setEnded] = useState(false)

  // Score = flip count (minél kisebb, annál jobb)
  const [flips, setFlips] = useState(0)
  const flipsRef = useRef(0)

  // High score (kisebb = jobb)
  // UI: ha null -> '-'
  // belül: highScoreDbRef -> a DB raw értéke (0 is lehet)
  const [highScore, setHighScore] = useState(null)
  const highScoreRef = useRef(null)
  const highScoreDbRef = useRef(0)

  // Game state
  const [deck, setDeck] = useState([]) // { id, value }
  const [faceUp, setFaceUp] = useState([]) // max 2 index
  const [matched, setMatched] = useState(() => new Set()) // Set<index>
  const lockRef = useRef(false)

  // deck settings
  const GRID = 6
  const PAIRS = 18 // 6x6 = 36 lap = 18 pár

  const makeDeck = () => {
    const values = []
    for (let i = 1; i <= PAIRS; i++) values.push(i, i)

    // shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[values[i], values[j]] = [values[j], values[i]]
    }

    return values.map((v, idx) => ({
      id: `${idx}-${v}-${Math.random()}`,
      value: v
    }))
  }

  async function refreshHighScoreFromDb() {
    const user = auth?.user || null
    const userId = user?.id || user?.Id
    if (!userId) {
      setHighScore(null)
      highScoreRef.current = null
      highScoreDbRef.current = 0
      return
    }

    try {
      const adminUser = await getAdminUser(userId)
      const { highScore: dbHigh } = extractHighScoreForGame(adminUser, GAME_NAME)

      const raw = Number(dbHigh) || 0
      highScoreDbRef.current = raw

      // UI-ban: 0-t nem mutatunk, mert az "még nem játszott"
      if (raw === 0) {
        setHighScore(null)
        highScoreRef.current = null
        return
      }

      // pozitív érték
      setHighScore(raw)
      highScoreRef.current = raw
    } catch (e) {
      console.warn('Failed to refresh high score', e)
    }
  }

  function resetGame({ preserveHigh = true } = {}) {
    setDeck(makeDeck())
    setFaceUp([])
    setMatched(new Set())
    lockRef.current = false

    flipsRef.current = 0
    setFlips(0)

    setRunning(false)
    setEnded(false)

    if (!preserveHigh) {
      setHighScore(null)
      highScoreRef.current = null
      highScoreDbRef.current = 0
    }
  }

  async function finishGame() {
    setRunning(false)
    setEnded(true)

    const user = auth?.user || null
    if (!user) return

    const current = flipsRef.current
    const dbHighRaw = highScoreDbRef.current // 0 is lehet

    // szabály: ha DB=0 => mindig mentsünk; különben csak ha current < dbHigh
    const shouldUpdate = (dbHighRaw === 0) || (current < dbHighRaw)

    if (shouldUpdate) {
      try {
        // Memory: lower is better, DB=0 -> mindig ments
        await submitScore(GAME_NAME, current, user, { mode: 'lower', zeroMeansUnset: true })

        // UI frissítés azonnal
        setHighScore(current)
        highScoreRef.current = current
        highScoreDbRef.current = current
      } catch (e) {
        console.warn('submitScore failed', e)
        // ha hiba volt, legalább olvassuk vissza, mi van a DB-ben
        await refreshHighScoreFromDb()
      }
    } else {
      // nincs javulás, de frissítjük a DB-ből (biztonság)
      await refreshHighScoreFromDb()
    }
  }

  function onCardClick(index) {
    if (lockRef.current) return
    if (ended) return
    if (!running) setRunning(true)

    if (matched.has(index)) return
    if (faceUp.includes(index)) return
    if (faceUp.length >= 2) return

    flipsRef.current += 1
    setFlips(flipsRef.current)

    const nextFaceUp = [...faceUp, index]
    setFaceUp(nextFaceUp)

    if (nextFaceUp.length === 2) {
      lockRef.current = true

      const [a, b] = nextFaceUp
      const va = deck[a]?.value
      const vb = deck[b]?.value

      window.setTimeout(async () => {
        if (va != null && va === vb) {
          setMatched((prev) => {
            const n = new Set(prev)
            n.add(a)
            n.add(b)
            return n
          })
          setFaceUp([])

          // ⚠️ matched state frissítése aszinkron, ezért itt számolunk kézzel:
          const willBeMatchedCount = matched.size + 2

          if (willBeMatchedCount >= deck.length) {
            lockRef.current = false
            await finishGame()
            return
          }
        } else {
          setFaceUp([])
        }

        lockRef.current = false
      }, 650)
    }
  }

  // Space: start / restart
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        if (ended) {
          resetGame({ preserveHigh: true })
          setRunning(true)
        } else if (!running) {
          setRunning(true)
        }
      }
    }

    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [ended, running])

  useEffect(() => {
    resetGame({ preserveHigh: true })
    refreshHighScoreFromDb()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pageStyle = useMemo(() => ({ '--game2-bg': `url(${arcadeBg})` }), [])

  return (
    <div className="game2-page" style={pageStyle}>
      <div className="arcade-frame">
        {/* BAL: score + high */}
        <div className="score">
          <div>Score: {flips}</div>
          <div>High: {highScore == null ? '-' : highScore}</div>
        </div>

        {/* JOBB: back */}
        <div
          className="back"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/') }}
        >
          Back
        </div>

        {/* Playfield */}
        <div className="screen-center">
          <div
            className="memory-board"
            style={{
              gridTemplateColumns: `repeat(${GRID}, var(--card-w))`,
              gridAutoRows: `var(--card-h)`
            }}
          >
            {deck.map((card, idx) => {
              const isUp = faceUp.includes(idx) || matched.has(idx)
              const isMatched = matched.has(idx)

              return (
                <button
                  key={card.id}
                  className={`card ${isUp ? 'up' : ''} ${isMatched ? 'matched' : ''}`}
                  onClick={() => onCardClick(idx)}
                  type="button"
                >
                  <div className="card-inner">
                    {/* BACK */}
                    <div className="card-face back-face" />

                    {/* FRONT */}
                    <div className="card-face front-face">
                      <div
                        className="front-texture"
                        style={{ backgroundImage: `url(${cardFrontImg})` }}
                      />
                      <div className="front-value">{card.value}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Overlay */}
          {!running && (
            <div
              className="start-overlay"
              onClick={() => {
                if (ended) {
                  resetGame({ preserveHigh: true })
                  setRunning(true)
                } else setRunning(true)
              }}
            >
              <div className="start-text">
                {ended
                  ? `You won — Flips ${flips} (click / Space to restart)`
                  : 'Press Space to Start'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
