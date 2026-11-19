import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 1. อนุญาตทุก Host
    allowedHosts: "all",
    // 2. บังคับให้ Vite ฟังทุก IP (สำคัญสำหรับการต่อจากมือถือ)
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        // ไม่ต้องมี rewrite เพราะ Backend ของคุณมี /api อยู่แล้ว
      },
    },
  },
});
