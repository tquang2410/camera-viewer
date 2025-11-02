# Project: Frometou (VIEWER)

---

## 1. Project Overview (Tổng quan Dự án)

**Frometou (Viewer)** là một ứng dụng web (website) được xây dựng bằng React và Vite, đóng vai trò là "Trình xem" (cái Tivi). Nó sẽ được deploy (đẩy) lên Vercel để truy cập từ bất cứ đâu.

Đây là "Người chủ động" (Initiator) trong hệ thống, cho phép người dùng (User) toàn quyền kiểm soát việc kết nối.

### Các tính năng cốt lõi (ĐÃ CẬP NHẬT):

* **Xác thực qua ID & Mật khẩu:** Cung cấp Giao diện (UI) để người dùng nhập "Mã Camera" và "Mật khẩu".
* **Kết nối "Mai mối":** Gửi (emit) `{ id, pass }` đến Server (Project 3) (`request-stream`).
* **Xử lý Phản hồi (Feedback):** Lắng nghe (listen) phản hồi từ Server (Project 3) (`password-valid`, `password-invalid`, `room-not-found`) và thông báo cho người dùng (User).
* **Logic P2P (Chủ động):** (Theo yêu cầu của hội đồng) Sau khi Server `emit` (gửi) '''password-valid''', Viewer (Project 2) sẽ *chủ động* (initiates) tạo "Lời mời P2P" (WebRTC Offer) (sử dụng `simple-peer`).
* **Phát Video:** Lắng nghe (listen) `on('stream')` (từ `simple-peer`) và "bơm" (pipe) luồng video (không âm thanh) vào thẻ `<video>`.
* **Ghi hình (Record):** (Sắp làm) Cung cấp nút "Ghi hình" (Record) (sử dụng `MediaRecorder` API).

---

## 2. Tech Stack (Bộ Công nghệ - ĐÃ CẬP NHẬT)

* **Nền tảng (Framework):** **Vite + React**
* **Công cụ Build (Build Tool):** **Vite**
    * (Cấu hình `vite.config.js` để chạy ở cổng `5174`).
    * (Cấu hình `define: { global: 'window' }` để vá lỗi (polyfill) cho `simple-peer`).
* **Giao tiếp Real-time:** **Socket.IO Client**
    * Dùng để kết nối và "Xác thực" (validate) với Server (Project 3) bằng `{ id, pass }`.
* **Truyền tải P2P:** **`simple-peer`**
    * "Vũ khí" WebRTC (dễ dùng). Dùng để *chủ động* (initiate) tạo "Lời mời" (Offer) P2P gửi đến Streamer (Project 1).

---

## 3. Coding Style & Convention (Phong cách Code)

* **Ngôn ngữ:** JavaScript (ESM - `type: "module"`).
* **Logic:** Toàn bộ logic (Socket.IO, WebRTC/simple-peer) đều nằm trong `App.jsx` (sử dụng React Hooks).
* **Sự kiện (Events):** Tên sự kiện (event names) (ví dụ: '''request-stream''', '''password-valid''') phải *khớp 100%* với Server (Project 3).

---

## 4. Cam kết Phát triển Project (Gemini CLI)

(Phần này giữ nguyên)

### Quy trình Làm việc Lặp (Iterative Workflow)

... (Giữ nguyên nội dung Cam kết Phát triển) ...

---

## 5. File Cấu hình (package.json - ĐÃ CẬP NHẬT)

Đây là `package.json` (ước tính) dựa trên *tất cả* các thư viện chúng ta đã cài đặt (bao gồm `simple-peer` và `socket.io-client`).

```json
{
  "name": "frometou-viewer",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "start": "vite",
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "simple-peer": "^9.11.1",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.36.0",
    "@types/react": "^19.1.16",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.4",
    "eslint": "^9.36.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.22",
    "globals": "^16.4.0",
    "vite": "^7.1.7"
  }
}
```