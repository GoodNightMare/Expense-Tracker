// ตรวจสอบว่าเป็นโหมดพัฒนา (Local) หรือโหมดใช้งานจริง (Production)
const isDev = import.meta.env.MODE === 'development';

// ถ้าเป็น Local ให้ใช้ /api (ผ่าน Vite Proxy)
// ถ้าเป็นเว็บจริง ให้ระบุ URL เต็มของ Render
const API_URL = isDev 
  ? '/api' 
  : 'https://expenses-backend-k65e.onrender.com/api';

export default API_URL;