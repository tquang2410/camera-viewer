import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
// (BƯỚC 18) 1. Import "vũ khí"
import Peer from 'simple-peer'; 
import './App.css'; 

const SERVER_URL = 'http://localhost:4000';

function App() {
  const [cameraID, setCameraID] = useState('');
  const [password, setPassword] = useState('');
  const [statusText, setStatusText] = useState('Chờ kết nối...');
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const videoRef = useRef(null);
  // (BƯỚC 18) 2. Ref MỚI để lưu kết nối P2P
  const peerRef = useRef(null); 
  const isInitialized = useRef(false);
  
  // (BƯỚC 18) 3. Hàm MỚI: Chủ động tạo cuộc gọi P2P
  const initiateWebRTC = (streamerSocketId) => {
    console.log(`(Viewer) Bắt đầu WebRTC... Gọi tới Streamer ID: ${streamerSocketId}`);
    
    const peer = new Peer({
      initiator: true, // Viewer là người gọi
      trickle: true,
    });
    
    peerRef.current = peer;

    // (A) Khi 'simple-peer' TẠO ra "Tín hiệu" (Offer/ICE)
    peer.on('signal', (data) => {
      // (BƯỚC 18) DÒNG LOG BẠN CHƯA THẤY ĐÂY RỒI:
      console.log('(Viewer) TẠO TÍN HIỆU (Offer/ICE), đang gửi lên Server...');
      socketRef.current.emit('webrtc-signal', {
        signalData: data,
        targetSocketId: streamerSocketId 
      });
    });

    // (B) Khi 'simple-peer' NHẬN được Video Stream
    peer.on('stream', (stream) => {
      console.log('****** (Viewer) ĐÃ NHẬN ĐƯỢC VIDEO STREAM! ******');
      setStatusText('ĐANG XEM!');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    // (C) Xử lý lỗi P2P
    peer.on('error', (err) => {
      console.error('(Viewer) Lỗi WebRTC Peer:', err);
      setStatusText('Lỗi kết nối P2P.');
    });

    // (D) Khi ngắt kết nối P2P
    peer.on('close', () => {
      console.log('(Viewer) Kết nối P2P đã đóng.');
      handleDisconnect();
    });
  };

  // (BƯỚC 18) 4. Hàm "Dừng Xem" (hoàn chỉnh)
  const handleDisconnect = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsConnected(false);
    setStatusText('Offline');
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // (BƯỚC 18) 5. Hàm "Xem Stream" (hoàn chỉnh)
  const handleConnect = () => {
    const idToConnect = cameraID.trim();
    const passToConnect = password.trim();
    if (idToConnect === '' || passToConnect === '') {
      setStatusText('Lỗi: Vui lòng nhập CẢ Mã Camera VÀ Mật khẩu');
      return;
    }
    if (socketRef.current && socketRef.current.connected) return;
    setStatusText(`Đang kết nối tới ${SERVER_URL}...`);

    socketRef.current = io(SERVER_URL);

    // Lắng nghe 'connect'
    socketRef.current.on('connect', () => {
      console.log(`(Viewer) Đã kết nối, ID: ${socketRef.current.id}`);
      socketRef.current.emit('request-stream', { 
        id: idToConnect, 
        pass: passToConnect 
      });
      setStatusText(`Đang xác thực '${idToConnect}'...`);
    });

    // (BƯỚC 18 - SỬA LỖI LỆCH PHA)
    // 1. Lắng nghe 'password-valid' (ĐÚNG TÊN)
    socketRef.current.on('password-valid', (streamerSocketId) => {
      console.log(`(Viewer) Mật khẩu HỢP LỆ! Streamer ID là: ${streamerSocketId}`);
      setStatusText('Mật khẩu đúng! Đang bắt đầu WebRTC...');
      setIsConnected(true);
      
      // GỌI HÀM "CHỦ ĐỘNG"
      initiateWebRTC(streamerSocketId);
    });

    // (BƯỚC 18) 2. Lắng nghe TÍN HIỆU (Answer/ICE) TỪ Streamer
    socketRef.current.on('webrtc-signal', ({ signalData }) => {
      console.log('(Viewer) NHẬN TÍN HIỆU (Answer/ICE) từ Server (do Streamer gửi)...');
      if (peerRef.current) {
        peerRef.current.signal(signalData);
      }
    });

    // (Lắng nghe lỗi - giữ nguyên)
    socketRef.current.on('password-invalid', () => {
      console.error('(Viewer) Lỗi: Mật khẩu SAI!');
      setStatusText('Lỗi: Sai Mật khẩu! Vui lòng thử lại.');
      socketRef.current.disconnect();
    });
    socketRef.current.on('room-not-found', () => {
      console.error('(Viewer) Lỗi: Không tìm thấy phòng!');
      setStatusText('Lỗi: Không tìm thấy Mã Camera này!');
      socketRef.current.disconnect();
    });

    // Lắng nghe 'disconnect' (chung)
    socketRef.current.on('disconnect', () => {
      setStatusText('Offline - Đã ngắt kết nối');
      console.log('(Viewer) Đã ngắt kết nối.');
      setIsConnected(false);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    });
  };

  // (Code useEffect (dọn dẹp), giữ nguyên)
  useEffect(() => {
    if (isInitialized.current === false) {
      isInitialized.current = true;
      console.log('Viewer App Khởi động.');
    }
    return () => {
      handleDisconnect();
    };
  }, []);
  
  // (Code JSX, giữ nguyên)
  return (
    <div className="app-container">
      <div className="connection-controls">
        <input 
          type="text"
          placeholder="Nhập Mã Camera (VD: 'Wang vip 13')"
          value={cameraID}
          onChange={(e) => setCameraID(e.target.value)}
          disabled={isConnected} 
          className="camera-id-input"
        />
        <input 
          type="password"
          placeholder="Nhập Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isConnected} 
          className="password-input" 
        />
        {isConnected ? (
          <button onClick={handleDisconnect} className="disconnect-button">
            Dừng Xem
          </button>
        ) : (
          <button onClick={handleConnect} className="connect-button">
            Xem Stream
          </button>
        )}
        <p className="status-text">Trạng thái: {statusText}</p>
      </div>
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        className="video-player"
      />
    </div>
  );
}

export default App;
