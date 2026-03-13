import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import axios from 'axios'
import DailyPage from './pages/DailyPage.jsx'
import AddPage from './pages/AddPage.jsx'
import API_URL from './api/index.js';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [inputPassword, setInputPassword] = useState('');

  // 1. เช็คสถานะการเข้าสู่ระบบเมื่อเปิดแอป
  useEffect(() => {
    const savedToken = localStorage.getItem('app_token');
    if (savedToken) {
      // ถ้ามีรหัสเก็บไว้ ให้ตั้งค่า axios ให้ส่งกุญแจไปในทุก request อัตโนมัติ
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      setIsAuth(true);
    }
  }, []);

// 2. ฟังก์ชันจัดการการ Login
  const handleLogin = async (e) => {
    e.preventDefault(); // สำคัญมาก: ป้องกันหน้าเว็บ Refresh
    try {
      // ใช้ API_URL ที่เราตั้งไว้เป็น /api
      const response = await axios.post(`${API_URL}/login`, { 
        password: inputPassword 
      });

      console.log('inputPassword:', inputPassword);
      console.log("Login Response:", response.data);

      if (response.data.success) {
        const token = response.data.token;
        // เก็บลง localStorage
        localStorage.setItem('app_token', token);
        // ตั้งค่าหัวตารางให้ axios ส่ง token ไปทุกครั้งหลังจากนี้
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setIsAuth(true);
      }
    } catch (error) {
      console.error("Login Error:", error);
      if (error.response && error.response.status === 401) {
        alert("รหัสผ่านไม่ถูกต้องครับ");
      } else {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      }
    }
  };

  // 3. ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    localStorage.removeItem('app_token');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuth(false);
  };

  // ถ้ายังไม่ได้ยืนยันตัวตน ให้แสดงหน้าใส่รหัส
  if (!isAuth) {
    return (
      <div className="login-screen">
        <div className="card login-card">
          <h2>🔒 กรุณาใส่รหัสผ่าน</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              className="login-input"
              value={inputPassword} 
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="Password..."
              autoFocus
            />
            <button type="submit" className="submit-btn">ยืนยัน</button>
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
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
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

          .login-submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            filter: brightness(1.1);
          }
        `}</style>
      </div>
    );
  }

  // ถ้าผ่านแล้ว ให้แสดงหน้าแอปปกติ
  return (
    <div className="app-container">
      <nav className="navbar">
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>📊 สรุปรายวัน</NavLink>
        <NavLink to="/add" className={({ isActive }) => isActive ? 'active' : ''}>✏️ บันทึก</NavLink>
        <button onClick={handleLogout} className="logout-nav-btn">🚪</button>
      </nav>

      <Routes>
        <Route path="/" element={<DailyPage />} />
        <Route path="/add" element={<AddPage />} />
      </Routes>

      <style jsx>{`
        .logout-nav-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 0 10px; opacity: 0.7; }
        .logout-nav-btn:hover { opacity: 1; }
      `}</style>
    </div>
  )
}

export default App