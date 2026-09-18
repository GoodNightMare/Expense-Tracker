import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import axios from 'axios'
import DailyPage from './pages/DailyPage.jsx'
import AddPage from './pages/AddPage.jsx'
import API_URL from './api/index.js'
import { initialDemoData } from './api/mockData.js'

const TOKEN_STORAGE_KEY = 'app_token'
const ACCOUNT_STORAGE_KEY = 'app_account'
const THEME_STORAGE_KEY = 'theme'
const DEMO_STORAGE_KEY = 'is_demo'
const DEMO_DATA_KEY = 'demo_expenses'
const PROFILE_IMAGE_KEY = 'profile_image'
const PROFILE_NAME_KEY = 'profile_name'
const MAX_PROFILE_SOURCE_SIZE = 10 * 1024 * 1024
const PROFILE_IMAGE_DIMENSION = 512

function resizeProfileImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
      const sourceX = (image.naturalWidth - cropSize) / 2
      const sourceY = (image.naturalHeight - cropSize) / 2
      const canvas = document.createElement('canvas')
      canvas.width = PROFILE_IMAGE_DIMENSION
      canvas.height = PROFILE_IMAGE_DIMENSION

      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Canvas is unavailable'))
        return
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        PROFILE_IMAGE_DIMENSION,
        PROFILE_IMAGE_DIMENSION,
      )
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/webp', 0.82))
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Invalid image'))
    }
    image.src = objectUrl
  })
}

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

function getInitialAuthSession() {
  const isDemo = localStorage.getItem(DEMO_STORAGE_KEY) === 'true'
  if (isDemo) {
    return {
      isAuth: true,
      isDemo: true,
      account: { id: 'demo', name: 'บัญชีทดลอง' },
    }
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) return { isAuth: false, isDemo: false, account: null }

  let account = null
  try {
    account = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY))
  } catch {
    localStorage.removeItem(ACCOUNT_STORAGE_KEY)
  }

  setAxiosAuthToken(token)
  return { isAuth: true, isDemo: false, account }
}

function useAuthFromLocalStorage() {
  const [session, setSession] = useState(getInitialAuthSession)

  const login = async (password) => {
    const response = await axios.post(`${API_URL}/login`, { password })
    if (!response?.data?.success) return false

    const token = response.data.token
    const loggedInAccount = response.data.account || { id: 'account1', name: 'บัญชี 1' }
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(loggedInAccount))
    localStorage.setItem(DEMO_STORAGE_KEY, 'false')
    setAxiosAuthToken(token)
    setSession({ isAuth: true, isDemo: false, account: loggedInAccount })
    return true
  }

  const demoLogin = () => {
    localStorage.setItem(DEMO_STORAGE_KEY, 'true')
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(ACCOUNT_STORAGE_KEY)
    if (!localStorage.getItem(DEMO_DATA_KEY)) {
      console.log(initialDemoData)
      localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(initialDemoData))
    }
    setAxiosAuthToken(null)
    setSession({
      isAuth: true,
      isDemo: true,
      account: { id: 'demo', name: 'บัญชีทดลอง' },
    })
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(ACCOUNT_STORAGE_KEY)
    localStorage.removeItem(DEMO_STORAGE_KEY)
    setAxiosAuthToken(null)
    setSession({ isAuth: false, isDemo: false, account: null })
  }

  return { ...session, login, demoLogin, logout }
}

function LoginScreen({ onLogin, onDemo }) {
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
        <div className="demo-divider">หรือ</div>
        <button onClick={onDemo} className="demo-btn">
          ✨ (Demo)
        </button>
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

        .demo-divider {
          margin: 20px 0;
          color: #666;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .demo-divider::before, .demo-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #eee;
        }

        .demo-btn {
          width: 100%;
          padding: 12px;
          background: white;
          color: #2c5364;
          border: 2px solid #2c5364;
          border-radius: 12px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
        }
        .demo-btn:hover {
          background: #f0f7f9;
        }
      `}</style>
    </div>
  )
}

function ProfileMenu({ accountName, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem(PROFILE_IMAGE_KEY))
  const [profileName, setProfileName] = useState(() => localStorage.getItem(PROFILE_NAME_KEY) || accountName || 'บัญชีของฉัน')
  const [nameDraft, setNameDraft] = useState(profileName)
  const [isEditingName, setIsEditingName] = useState(false)
  const [imageError, setImageError] = useState('')
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const closeMenu = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('รองรับเฉพาะไฟล์ JPG, PNG และ WebP')
      return
    }
    if (file.size > MAX_PROFILE_SOURCE_SIZE) {
      setImageError('กรุณาเลือกรูปต้นฉบับขนาดไม่เกิน 10 MB')
      return
    }

    try {
      const resizedImage = await resizeProfileImage(file)
      localStorage.setItem(PROFILE_IMAGE_KEY, resizedImage)
      setProfileImage(resizedImage)
      setImageError('')
    } catch (error) {
      if (error?.name === 'QuotaExceededError') {
        setImageError('พื้นที่จัดเก็บไม่เพียงพอ กรุณาลบข้อมูลเว็บไซต์บางส่วน')
      } else {
        setImageError('ไม่สามารถประมวลผลไฟล์รูปได้')
      }
    }
  }

  const removeImage = () => {
    localStorage.removeItem(PROFILE_IMAGE_KEY)
    setProfileImage(null)
    setImageError('')
  }

  const saveName = (event) => {
    event.preventDefault()
    const nextName = nameDraft.trim()
    if (!nextName) return

    localStorage.setItem(PROFILE_NAME_KEY, nextName)
    setProfileName(nextName)
    setNameDraft(nextName)
    setIsEditingName(false)
  }

  const cancelNameEdit = () => {
    setNameDraft(profileName)
    setIsEditingName(false)
  }

  const initial = profileName.trim().charAt(0).toUpperCase() || 'บ'

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="เปิดเมนูโปรไฟล์"
        aria-expanded={isOpen}
      >
        {profileImage ? <img src={profileImage} alt="รูปโปรไฟล์" /> : <span>{initial}</span>}
      </button>

      {isOpen && (
        <div className="profile-popover">
          <div className="profile-header">
            <div className="profile-preview">
              {profileImage ? <img src={profileImage} alt="รูปโปรไฟล์" /> : <span>{initial}</span>}
            </div>
            <div className="profile-identity">
              {isEditingName ? (
                <form className="profile-name-form" onSubmit={saveName}>
                  <input
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    maxLength={40}
                    aria-label="ชื่อโปรไฟล์"
                    autoFocus
                  />
                  <div className="profile-name-buttons">
                    <button type="submit" disabled={!nameDraft.trim()}>บันทึก</button>
                    <button type="button" onClick={cancelNameEdit}>ยกเลิก</button>
                  </div>
                </form>
              ) : (
                <div className="profile-name-row">
                  <strong>{profileName}</strong>
                  <button type="button" onClick={() => setIsEditingName(true)} aria-label="แก้ไขชื่อ">แก้ไข</button>
                </div>
              )}
              <small>ข้อมูลนี้เก็บเฉพาะเครื่องนี้</small>
            </div>
          </div>

          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} hidden />
          <button type="button" className="profile-action primary" onClick={() => inputRef.current?.click()}>
            {profileImage ? 'เปลี่ยนรูปโปรไฟล์' : 'เพิ่มรูปโปรไฟล์'}
          </button>
          {profileImage && (
            <button type="button" className="profile-action danger" onClick={removeImage}>ลบรูปโปรไฟล์</button>
          )}
          {imageError && <p className="profile-error" role="alert">{imageError}</p>}
          <div className="profile-divider" />
          <button type="button" className="profile-action" onClick={onLogout}>ออกจากระบบ</button>
        </div>
      )}
    </div>
  )
}

function App() {
  const { isAuth, isDemo, account, login, demoLogin, logout } = useAuthFromLocalStorage()
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Axios interceptor for demo mode
  useEffect(() => {
    if (!isDemo) return

    const interceptor = axios.interceptors.request.use(async (config) => {
      if (config.url.includes(`${API_URL}/expenses`)) {
        const method = config.method.toLowerCase()
        const data = JSON.parse(localStorage.getItem(DEMO_DATA_KEY) || '[]')

        let response = { data: null, status: 200, statusText: 'OK', headers: {}, config }

        if (method === 'get') {
          response.data = data
        } else if (method === 'post') {
          const newItem = { ...config.data, id: Date.now() }
          const updatedData = [...data, newItem]
          localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(updatedData))
          response.data = newItem
        } else if (method === 'put') {
          const id = parseInt(config.url.split('/').pop())
          const updatedData = data.map(item => item.id === id ? { ...item, ...config.data } : item)
          localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(updatedData))
          response.data = config.data
        } else if (method === 'delete') {
          const id = parseInt(config.url.split('/').pop())
          const updatedData = data.filter(item => item.id !== id)
          localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(updatedData))
          response.data = { success: true }
        }

        // Return a mock response by throwing an object that we'll catch in the response interceptor
        // Actually, axios doesn't easily allow returning a response from a request interceptor without sending the request.
        // A better way is to use a custom adapter or just handle it in the response interceptor by checking for a flag.
        // But for simplicity, we can just throw the response and catch it.
        return Promise.reject({ mockResponse: response })
      }
      return config
    })

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.mockResponse) {
          return Promise.resolve(error.mockResponse)
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.request.eject(interceptor)
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [isDemo])

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

    return <LoginScreen onLogin={onLogin} onDemo={demoLogin} />
  }

  // ถ้าผ่านแล้ว ให้แสดงหน้าแอปปกติ
  return (
    <div className="app-container">
      {isDemo && (
        <div className="demo-badge">
          ✨ โหมดทดสอบ (Demo) - ข้อมูลจะถูกบันทึกไว้ในเครื่องของคุณเท่านั้น
        </div>
      )}
      <nav className="navbar">
        <div className="nav-main">
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
        </div>
        <ProfileMenu accountName={account?.name} onLogout={logout} />
      </nav>

      <Routes>
        <Route path="/" element={<DailyPage theme={theme} />} />
        <Route path="/add" element={<AddPage theme={theme} />} />
      </Routes>

      <style jsx>{`
        .theme-nav-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 0 10px; opacity: 0.85; }
        .theme-nav-btn:hover { opacity: 1; }
        .demo-badge {
          background: #fef3c7;
          color: #92400e;
          text-align: center;
          padding: 8px;
          font-size: 14px;
          font-weight: bold;
          border-bottom: 1px solid #fde68a;
        }
      `}</style>
    </div>
  )
}

export default App
