// ตรวจสอบว่ารันอยู่ที่ไหน
const isDev = import.meta.env.MODE === 'development';

// ถ้าเป็น Local (Dev) ให้ใช้ /api (เพื่อผ่าน Vite Proxy)
// ถ้าเป็นบน Netlify (Prod) ต้องใส่ URL ของ Render เต็มๆ ห้ามใช้ชื่อ Netlify
const API_URL = isDev 
  ? 'https://expenses-backend-k65e.onrender.com/api' 
  : 'https://expenses-backend-k65e.onrender.com/api'; 

export default API_URL;