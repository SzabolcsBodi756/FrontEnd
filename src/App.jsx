import { useState, useRef, useEffect } from 'react'
import './App.css'
import Main from './pages/Main'
import Login from './pages/Login'
import Register from './pages/Register'
import Header from './components/Header'
import bgMusic from './assets/AI created 8 Bits theme  Retro Gaming Music.mp3'

function App() {
  const [page, setPage] = useState('login') // 'main' | 'login' | 'register'
  const audioRef = useRef(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.loop = true
    let resumeMusic = null
    audio.play().catch(() => {
      resumeMusic = () => {
        audio.play()
        if (resumeMusic) document.removeEventListener('click', resumeMusic)
      }
      document.addEventListener('click', resumeMusic)
    })
    return () => {
      if (resumeMusic) document.removeEventListener('click', resumeMusic)
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

  // Header right action depends on current page
  const headerProps = {
    muted,
    toggleMute,
    title: 'Arcade Mania',
  }

  if (page === 'main') {
    headerProps.dropdownItems = [
      { label: 'Profile', onClick: () => console.log('Profile') },
      { label: 'Logout', onClick: () => console.log('Logout') },
    ]
  }

  if (page === 'login') {
    headerProps.rightLabel = 'Regisztráció'
    headerProps.rightOnClick = () => setPage('register')
  }

  if (page === 'register') {
    headerProps.rightLabel = 'Bejelentkezés'
    headerProps.rightOnClick = () => setPage('login')
  }

  return (
    <div>
      <audio ref={audioRef} src={bgMusic} />
      <Header {...headerProps} />

      {page === 'main' && <Main onNavigate={(p) => setPage(p)} />}
      {page === 'login' && <Login onNavigate={(p) => setPage(p)} />}
      {page === 'register' && <Register onNavigate={(p) => setPage(p)} />}
    </div>
  )
}

export default App
