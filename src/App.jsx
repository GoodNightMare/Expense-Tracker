import React, { useEffect, useMemo, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import axios from 'axios'
import DailyPage from './pages/DailyPage.jsx'
import AddPage from './pages/AddPage.jsx'
import API_URL from './api/index.js'

const TOKEN_STORAGE_KEY = 'app_token'
const THEME_STORAGE_KEY = 'theme'

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function setAxiosAuthToken(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`
    return
  }
  delete axios.defaults.headers.common.Authorization
}

function useAuthFromLocalStorage() {
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!savedToken) return
    setAxiosAuthToken(savedToken)
    setIsAuth(true)
  }, [])

  const login = async (password) => {
    const response = await axios.post(`${API_URL}/login`, { password })
    if (!response?.data?.success) return false

    const token = response.data.token
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    setAxiosAuthToken(token)
    setIsAuth(true)
    return true
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setAxiosAuthToken(null)
    setIsAuth(false)
  }

  return { isAuth, login, logout }
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(() => password.trim().length > 0 && !isSubmitting, [password, isSubmitting])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      await onLogin(password)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="card login-card">
        <h2>🔒 กรุณาใส่รหัสผ่าน</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password..."
            autoFocus
          />
          <button type="submit" className="login-submit-btn" disabled={!canSubmit}>
            {isSubmitting ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
          </button>
        </form>
      </div>
      <style jsx>{`
        .login-screen {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          position: fixed;
          inset: 0;
          z-index: 9999;
        }

        .login-card {
          width: 90%;
          max-width: 350px;
          text-align: center;
          padding: 40px 30px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .login-card h2 {
          color: #203a43;
          margin-bottom: 10px;
          font-size: 24px;
        }

        .login-input {
          width: 100%;
          padding: 15px;
          margin: 20px 0;
          border-radius: 12px;
          border: 2px solid #e0e0e0;
          font-size: 20px;
          text-align: center;
          transition: all 0.3s;
          outline: none;
        }

        .login-input:focus {
          border-color: #2c5364;
          box-shadow: 0 0 10px rgba(44, 83, 100, 0.2);
        }

        .login-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #203a43, #2c5364);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
        }

        .login-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          filter: none;
        }

        .login-submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  )
}

function App() {
  const { isAuth, login, logout } = useAuthFromLocalStorage()
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  // ถ้ายังไม่ได้ยืนยันตัวตน ให้แสดงหน้าใส่รหัส
  if (!isAuth) {
    const onLogin = async (password) => {
      try {
        const ok = await login(password)
        if (!ok) alert('รหัสผ่านไม่ถูกต้องครับ')
      } catch (error) {
        if (error?.response?.status === 401) {
          alert('รหัสผ่านไม่ถูกต้องครับ')
        } else {
          alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        }
      }
    }

    return <LoginScreen onLogin={onLogin} />
  }

  // ถ้าผ่านแล้ว ให้แสดงหน้าแอปปกติ
  return (
    <div className="app-container">
      <nav className="navbar">
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>📊 สรุปรายวัน</NavLink>
        <NavLink to="/add" className={({ isActive }) => isActive ? 'active' : ''}>✏️ บันทึก</NavLink>
        <button
          type="button"
          className="theme-nav-btn"
          onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          title={theme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง'}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <button onClick={logout} className="logout-nav-btn">🚪</button>
      </nav>

      <Routes>
        <Route path="/" element={<DailyPage theme={theme} />} />
        <Route path="/add" element={<AddPage theme={theme} />} />
      </Routes>

      <style jsx>{`
        .logout-nav-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 0 10px; opacity: 0.7; }
        .logout-nav-btn:hover { opacity: 1; }
        .theme-nav-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 0 10px; opacity: 0.85; }
        .theme-nav-btn:hover { opacity: 1; }
      `}</style>
    </div>
  )
}

export default App