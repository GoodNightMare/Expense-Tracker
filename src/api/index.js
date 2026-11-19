// Local ใช้ Backend ในเครื่องผ่าน Vite Proxy ส่วนเว็บจริงใช้ Render
const API_URL = import.meta.env.DEV
  ? '/api'
  : 'https://expenses-backend-k65e.onrender.com/api';

export default API_URL;
