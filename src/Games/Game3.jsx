import React, { useRef, useEffect, useState } from 'react'
import './Game3.css'
import snakeBack from '../assets/SnakeBack.png'
import { useAuth } from '../auth/AuthProvider'
import { submitScore, getAdminUser, extractHighScoreForGame } from '../services/gameService'
import { useNavigate } from 'react-router-dom'

export default function Game3() {
  const GAME_NAME = 'Snake'

  const centerRef = useRef(null)
  const canvasRef = useRef(null)
  const loopRef = useRef(null)

  const snakeRef = useRef([])
  const dirRef = useRef({ x: 1, y: 0 })
  const foodRef = useRef({ x: 0, y: 0 })
  const colsRef = useRef(0)
  const rowsRef = useRef(0)

  const [running, setRunning] = useState(false)

  // current score
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)

  // high score (DB)
  const [highScore, setHighScore] = useState(0)
  const highScoreRef = useRef(0)

  // game over UI
  const [ended, setEnded] = useState(false)
  const endedRef = useRef(false)

  const CELL = 22
  const BASE_DELAY = 120
  const MAX_SIZE = 1000

  const auth = useAuth()
  const navigate = useNavigate()

  const particlesRef = useRef([])
  const touchStartRef = useRef(null)
  const slowUntilRef = useRef(0)

  // preload background image
  const bgImageRef = useRef(null)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      bgImageRef.current = img
      try { draw() } catch (error) { console.log(error) }
    }
    img.onerror = () => { bgImageRef.current = null }
    img.src = snakeBack

    if (img.complete) {
      bgImageRef.current = img
      try { draw() } catch (error) { console.log(error) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- High score lekérés DB-ből ---
  async function refreshHighScoreFromDb() {
    const user = auth?.user || null
    const userId = user?.id || user?.Id
    if (!userId) {
      setHighScore(0)
      highScoreRef.current = 0
      return
    }

    try {
      const adminUser = await getAdminUser(userId)
      const { highScore: dbHigh } = extractHighScoreForGame(adminUser, GAME_NAME)
      const hs = Number(dbHigh) || 0
      setHighScore(hs)
      highScoreRef.current = hs
    } catch (e) {
      console.warn('Failed to refresh high score', e)
      // UI marad a korábbi értéken
    }
  }

  useEffect(() => {
    initGame({ preserveEnded: false })
    refreshHighScoreFromDb()

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKey, true)

    if (canvasRef.current) {
      try {
        canvasRef.current.setAttribute('tabindex', '0')
        canvasRef.current.focus()
      } catch (error) { console.log(error) }
    }

    return () => {
      stopLoop()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKey, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetCanvasSize() {
    const canvas = canvasRef.current
    const center = centerRef.current
    if (!canvas || !center) return

    const availableWidth = Math.max(100, center.clientWidth)
    const availableHeight = Math.max(100, center.clientHeight)

    // square playfield that always fits
    let size = Math.min(availableWidth, availableHeight, MAX_SIZE)

    // align to CELL (no half-cells)
    size = Math.floor(size / CELL) * CELL
    size = Math.max(10 * CELL, size)

    const dpr = window.devicePixelRatio || 1

    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    canvas.width = Math.floor(size * dpr)
    canvas.height = Math.floor(size * dpr)

    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    colsRef.current = Math.floor(size / CELL)
    rowsRef.current = Math.floor(size / CELL)
  }

  function spawnFood() {
    const typeRoll = Math.random()
    let type = 'normal'
    if (typeRoll > 0.92) type = 'bonus'
    else if (typeRoll > 0.84) type = 'slow'

    return {
      x: Math.floor(Math.random() * Math.max(1, colsRef.current)),
      y: Math.floor(Math.random() * Math.max(1, rowsRef.current)),
      type
    }
  }

  function initGame({ preserveEnded } = { preserveEnded: false }) {
    resetCanvasSize()
    colsRef.current = Math.max(10, colsRef.current)
    rowsRef.current = Math.max(8, rowsRef.current)

    snakeRef.current = [
      { x: Math.floor(colsRef.current / 2), y: Math.floor(rowsRef.current / 2) }
    ]
    dirRef.current = { x: 1, y: 0 }
    foodRef.current = spawnFood()

    scoreRef.current = 0
    setScore(0)

    setRunning(false)

    if (!preserveEnded) {
      setEnded(false)
      endedRef.current = false
    }

    draw()
  }

  function startLoop() {
    if (loopRef.current) return
    setRunning(true)
    scheduleNextTick()
  }

  function stopLoop() {
    if (loopRef.current) {
      clearTimeout(loopRef.current)
      loopRef.current = null
    }
    setRunning(false)
  }

  function getDelayForScore(s) {
    return Math.max(50, BASE_DELAY - s * 4)
  }

  function scheduleNextTick() {
    const now = Date.now()
    const slowPenalty = slowUntilRef.current > now ? 60 : 0
    const delay = getDelayForScore(scoreRef.current) + slowPenalty

    loopRef.current = setTimeout(() => {
      step()
      if (loopRef.current) scheduleNextTick()
    }, delay)
  }

  function handleResize() {
    stopLoop()
    initGame({ preserveEnded: false })
    refreshHighScoreFromDb()
  }

  function handleKey(e) {
    // Space: start / restart
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault()
      if (endedRef.current) {
        restartManual()
        startLoop()
      } else if (!running) {
        startLoop()
      }
      return
    }

    const key = e.key
    const code = e.code
    const mapUp = key === 'ArrowUp' || code === 'ArrowUp' || key === 'w' || key === 'W' || code === 'KeyW'
    const mapDown = key === 'ArrowDown' || code === 'ArrowDown' || key === 's' || key === 'S' || code === 'KeyS'
    const mapLeft = key === 'ArrowLeft' || code === 'ArrowLeft' || key === 'a' || key === 'A' || code === 'KeyA'
    const mapRight = key === 'ArrowRight' || code === 'ArrowRight' || key === 'd' || key === 'D' || code === 'KeyD'

    if (mapUp) {
      e.preventDefault()
      if (!running) startLoop()
      if (dirRef.current.y !== 1) dirRef.current = { x: 0, y: -1 }
      return
    }
    if (mapDown) {
      e.preventDefault()
      if (!running) startLoop()
      if (dirRef.current.y !== -1) dirRef.current = { x: 0, y: 1 }
      return
    }
    if (mapLeft) {
      e.preventDefault()
      if (!running) startLoop()
      if (dirRef.current.x !== 1) dirRef.current = { x: -1, y: 0 }
      return
    }
    if (mapRight) {
      e.preventDefault()
      if (!running) startLoop()
      if (dirRef.current.x !== -1) dirRef.current = { x: 1, y: 0 }
      return
    }
  }

  function changeDirection(newDir) {
    const cur = dirRef.current
    if (cur.x + newDir.x === 0 && cur.y + newDir.y === 0) return
    dirRef.current = newDir
    if (!running) startLoop()
  }

  function spawnParticles(x, y, color) {
    const list = particlesRef.current
    for (let i = 0; i < 10; i++) {
      list.push({
        x: x + CELL / 2,
        y: y + CELL / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 40 + Math.floor(Math.random() * 30),
        color
      })
    }
  }

  async function gameOver() {
    stopLoop()

    setEnded(true)
    endedRef.current = true

    const user = auth?.user || null
    if (user) {
      try {
        await submitScore(GAME_NAME, scoreRef.current, user)
      } catch (e) {
        console.warn('submitScore failed', e)
      }
    }

    await refreshHighScoreFromDb()
  }

  function step() {
    const cols = colsRef.current
    const rows = rowsRef.current
    const snake = snakeRef.current
    const dir = dirRef.current

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }

    // wall
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      gameOver()
      return
    }

    // self collision -> gameOver
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver()
      return
    }

    snake.unshift(head)

    // eat
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      const f = foodRef.current

      if (f.type === 'normal') scoreRef.current += 1
      else if (f.type === 'bonus') scoreRef.current += 3
      else if (f.type === 'slow') {
        slowUntilRef.current = Date.now() + 3000
        scoreRef.current += 1
      }

      setScore(scoreRef.current)

      // ha current score meghaladja a high score-t: UI azonnal frissül + DB update
      if (scoreRef.current > highScoreRef.current) {
        highScoreRef.current = scoreRef.current
        setHighScore(scoreRef.current)

        const user = auth?.user || null
        if (user) {
          // submitScore nálad GET-tel újra ellenőrzi, így biztonságos
          submitScore(GAME_NAME, scoreRef.current, user)
        }
      }

      spawnParticles(f.x * CELL, f.y * CELL, f.type === 'bonus' ? '#ffd86b' : '#ff6b6b')
      foodRef.current = spawnFood()
    } else {
      snake.pop()
    }

    draw()
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const width = parseInt(canvas.style.width, 10) || canvas.width / dpr
    const height = parseInt(canvas.style.height, 10) || canvas.height / dpr

    const bgImg = bgImageRef.current
    if (bgImg && bgImg.complete) {
      ctx.drawImage(bgImg, 0, 0, width, height)
    } else {
      ctx.fillStyle = '#0aa84b'
      ctx.fillRect(0, 0, width, height)
    }

    const f = foodRef.current
    if (f) {
      if (f.type === 'bonus') ctx.fillStyle = '#ffd86b'
      else if (f.type === 'slow') ctx.fillStyle = '#6bb4ff'
      else ctx.fillStyle = '#ff4d4d'
      ctx.fillRect(f.x * CELL + 2, f.y * CELL + 2, CELL - 4, CELL - 4)
    }

    for (let i = 0; i < snakeRef.current.length; i++) {
      const s = snakeRef.current[i]
      if (i === 0) ctx.fillStyle = '#7af77c'
      else if (i === snakeRef.current.length - 1) ctx.fillStyle = '#0b3d12'
      else ctx.fillStyle = '#1f6b2e'
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
    }

    const parts = particlesRef.current
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.12
      p.life--
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, 3, 3)
      if (p.life <= 0) parts.splice(i, 1)
    }
  }

  function restartManual() {
    stopLoop()
    setEnded(false)
    endedRef.current = false
    initGame({ preserveEnded: false })
    refreshHighScoreFromDb()
  }

  return (
    <div className="game3-page">
      <div className="arcade-frame">
        {/* BAL: Score + High (DB) */}
        <div className="score">
          <div>Score: {score}</div>
          <div>High: {highScore}</div>
        </div>

        {/* JOBB: Back */}
        <div
          className="back"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/') }}
        >
          Back
        </div>

        {/* Csíkmentes játéktér */}
        <div
          className="screen-center"
          ref={centerRef}
          onTouchStart={(e) => {
            const t = e.touches && e.touches[0]
            if (t) touchStartRef.current = { x: t.clientX, y: t.clientY }
          }}
          onTouchEnd={(e) => {
            const start = touchStartRef.current
            if (!start) return
            const t = e.changedTouches && e.changedTouches[0]
            if (!t) return

            const dx = t.clientX - start.x
            const dy = t.clientY - start.y
            const absX = Math.abs(dx)
            const absY = Math.abs(dy)
            if (Math.max(absX, absY) < 20) return

            if (absX > absY) {
              if (dx > 0) changeDirection({ x: 1, y: 0 })
              else changeDirection({ x: -1, y: 0 })
            } else {
              if (dy > 0) changeDirection({ x: 0, y: 1 })
              else changeDirection({ x: 0, y: -1 })
            }

            touchStartRef.current = null
          }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            onClick={() => {
              if (!running && !ended) startLoop()
              try { canvasRef.current && canvasRef.current.focus() } catch (error) { console.log(error) } 
            }}
          />

          {!running && (
            <div
              className="start-overlay"
              onClick={() => {
                if (ended) {
                  restartManual()
                  startLoop()
                } else {
                  startLoop()
                }
                try { canvasRef.current && canvasRef.current.focus() } catch (error) { console.log(error) } 
              }}
            >
              <div className="start-text">
                {ended ? `Game Over — Score ${score} (click / Space to restart)` : 'Press Space to Start'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Touch controls */}
      <div className="touch-controls">
        <div className="dpad btn-group-vertical" role="group" aria-label="D-pad">
          <button type="button" className="dpad-btn btn btn-dark" onClick={() => changeDirection({ x: 0, y: -1 })}>▲</button>
          <div className="dpad-row">
            <button type="button" className="dpad-btn btn btn-dark" onClick={() => changeDirection({ x: -1, y: 0 })}>◄</button>
            <button type="button" className="dpad-btn btn btn-dark" onClick={() => changeDirection({ x: 1, y: 0 })}>►</button>
          </div>
          <button type="button" className="dpad-btn btn btn-dark" onClick={() => changeDirection({ x: 0, y: 1 })}>▼</button>
        </div>
      </div>
    </div>
  )
}
