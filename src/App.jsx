import { useRef, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './App.css'
import Main from './pages/Main'
import Login from './pages/Login'
import Register from './pages/Register'
import Header from './components/Header'
import bgMusic from './assets/AI created 8 Bits theme  Retro Gaming Music.mp3'
import { AuthProvider, RequireAuth } from './auth/AuthProvider'

function AppContent() {
  const audioRef = useRef(null)
  const [muted, setMuted] = useState(false)
  const location = useLocation()

  // háttérzene indítása / feloldása kattintásra
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.loop = true
    let resumeMusic = null

    audio.play().catch(() => {
      resumeMusic = () => {
        audio.play()
        if (resumeMusic) {
          document.removeEventListener('click', resumeMusic)
        }
      }
      document.addEventListener('click', resumeMusic)
    })

    return () => {
      if (resumeMusic) {
        document.removeEventListener('click', resumeMusic)
      }
    }
  }, [])

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (muted) {
      audio.play()
      setMuted(false)
    } else {
      audio.pause()
      audio.currentTime = 0
      setMuted(true)
    }
  }

  const headerProps = {
    muted,
    toggleMute,
    title: 'Arcade Mania'
  }

  // 🌐 Csak a login / register oldalon adjuk meg a jobb oldali gombot.
  // A főoldalon ("/") a Header saját auth-alapú menüje jelenik meg
  // (Profile + Logout), ami már hívja az auth.logout()-ot.
  if (location.pathname === '/login') {
    headerProps.rightLabel = 'Regisztráció'
    headerProps.rightTo = '/register'
  } else if (location.pathname === '/register') {
    headerProps.rightLabel = 'Bejelentkezés'
    headerProps.rightTo = '/login'
  }

  return (
    <div>
      <audio ref={audioRef} src={bgMusic} />
      <Header {...headerProps} />

      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Main />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
