import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer'; 
import './App.css'; 

const SERVER_URL = 'https://fromutome-server.onrender.com';
// (BƯỚC 22) 10 phút (tính bằng mili-giây)
const RECORDING_INTERVAL_MS = 10 * 60 * 1000; 

function App() {
  const [cameraID, setCameraID] = useState('');
  const [password, setPassword] = useState('');
  const [statusText, setStatusText] = useState('Chờ kết nối...');
  const [isConnected, setIsConnected] = useState(false);
  
  // (BƯỚC 22) State MỚI cho Ghi hình
  const [isRecording, setIsRecording] = useState(false);
  
  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const peerRef = useRef(null); 
  const isInitialized = useRef(false);
  
  // (BƯỚC 22) Ref MỚI để lưu trữ logic Ghi hình
  const streamRef = useRef(null); // Lưu luồng (stream) video
  const mediaRecorderRef = useRef(null); // Lưu 'MediaRecorder'
  const recordedChunksRef = useRef([]); // Lưu "cục" (chunk) video (RAM)
  const recordingIntervalRef = useRef(null); // Lưu 'setInterval' (10 phút)

  // (BƯỚC 22) HÀM MỚI: "Tải về" (Download) file
  const downloadFile = () => {
    const blob = new Blob(recordedChunksRef.current, {
      type: 'video/webm' // (Như đã thống nhất)
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    // Tên file (VD: 2025-11-02T10-30-05.webm)
    a.download = `frometou_recording_${new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}.webm`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    // Xóa "cục" (chunk) video (RAM)
    recordedChunksRef.current = [];
  };

  // (BƯỚC 22) HÀM MỚI: Chạy khi 10 phút trôi qua
  const handleChunkSave = () => {
    console.log('(Recorder) 10 phút! Đang lưu "cục" (chunk)...');
    if (mediaRecorderRef.current) {
      // 1. Dừng (stop) (để kích hoạt 'onstop' -> 'downloadFile')
      mediaRecorderRef.current.stop();
      // 2. Bắt đầu lại (start) (để ghi 10 phút tiếp theo)
      mediaRecorderRef.current.start(); 
    }
  };

  // (BƯỚC 22) HÀM MỚI: Chạy khi nhấn "Bắt đầu Ghi"
  const handleStartRecording = () => {
    if (!streamRef.current) {
      console.error('Lỗi Ghi hình: Không tìm thấy luồng (stream) video!');
      return;
    }
    
    console.log('(Recorder) Bắt đầu Ghi...');
    setIsRecording(true);
    recordedChunksRef.current = []; // Xóa (clear) RAM
    
    // 1. Khởi tạo (Initialize) MediaRecorder
    mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm'
    });

    // 2. Lắng nghe (Listen) dữ liệu (Data)
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    // 3. Lắng nghe (Listen) "Dừng" (Stop)
    mediaRecorderRef.current.onstop = () => {
      console.log('(Recorder) Đã dừng. Đang Tải về (Downloading)...');
      downloadFile(); // Gọi hàm "Tải về"
    };
    
    // 4. Bắt đầu (Start) Ghi
    mediaRecorderRef.current.start(); // Bắt đầu Ghi

    // 5. Bắt đầu "Đồng hồ 10 phút" (10-min Timer)
    recordingIntervalRef.current = setInterval(
      handleChunkSave, 
      RECORDING_INTERVAL_MS
    );
  };

  // (BƯỚC 22) HÀM MỚI: Chạy khi nhấn "Dừng Ghi"
  const handleStopRecording = () => {
    console.log('(Recorder) Người dùng nhấn Dừng Ghi.');
    setIsRecording(false);
    
    // 1. Dừng "Đồng hồ 10 phút" (10-min Timer)
    clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;

    // 2. Dừng (Stop) Ghi (sẽ kích hoạt 'onstop' -> 'downloadFile')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // (BƯỚC 18) Hàm "Khởi tạo P2P" (Cập nhật)
  const initiateWebRTC = (streamerSocketId) => {
    console.log(`(Viewer) Bắt đầu WebRTC...`);
    const peer = new Peer({ initiator: true, trickle: true });
    peerRef.current = peer;

    peer.on('signal', (data) => {
      console.log('(Viewer) TẠO TÍN HIỆU (Offer/ICE)...');
      socketRef.current.emit('webrtc-signal', {
        signalData: data,
        targetSocketId: streamerSocketId 
      });
    });

    // (BƯỚC 22) CẬP NHẬT: LƯU LUỒNG (STREAM)
    peer.on('stream', (stream) => {
      console.log('****** (Viewer) ĐÃ NHẬN ĐƯỢC VIDEO STREAM! ******');
      setStatusText('ĐANG XEM!');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // (BƯỚC 22) 1. LƯU luồng (stream) vào 'streamRef'
      streamRef.current = stream; 
    });

    peer.on('error', (err) => {
      console.error('(Viewer) Lỗi WebRTC Peer:', err);
      setStatusText('Lỗi kết nối P2P.');
    });
    peer.on('close', () => {
      console.log('(Viewer) Kết nối P2P đã đóng.');
      handleDisconnect();
    });
  };

  // (BƯỚC 18) Hàm "Dừng Xem" (Cập nhật)
  const handleDisconnect = () => {
    if (isRecording) {
      // (BƯỚC 22) Nếu đang Ghi -> Tự động Dừng Ghi
      handleStopRecording();
    }
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
    // (BƯỚC 22) XÓA luồng (stream)
    streamRef.current = null; 
  };

  // (BƯỚC 18) Hàm "Xem Stream" (Không đổi)
  const handleConnect = () => {
    // (Code kết nối, xác thực {id, pass}, giữ nguyên)
    const idToConnect = cameraID.trim();
    const passToConnect = password.trim();
    if (idToConnect === '' || passToConnect === '') {
      setStatusText('Lỗi: Vui lòng nhập CẢ Mã Camera VÀ Mật khẩu');
      return;
    }
    if (socketRef.current && socketRef.current.connected) return;
    setStatusText(`Đang kết nối tới ${SERVER_URL}...`);
    socketRef.current = io(SERVER_URL);
    socketRef.current.on('connect', () => {
      console.log(`(Viewer) Đã kết nối, ID: ${socketRef.current.id}`);
      socketRef.current.emit('request-stream', { 
        id: idToConnect, 
        pass: passToConnect 
      });
      setStatusText(`Đang xác thực '${idToConnect}'...`);
    });
    socketRef.current.on('password-valid', (streamerSocketId) => {
      console.log(`(Viewer) Mật khẩu HỢP LỆ! Streamer ID là: ${streamerSocketId}`);
      setStatusText('Mật khẩu đúng! Đang bắt đầu WebRTC...');
      setIsConnected(true);
      initiateWebRTC(streamerSocketId);
    });
    socketRef.current.on('webrtc-signal', ({ signalData }) => {
      console.log('(Viewer) NHẬN TÍN HIỆU (Answer/ICE) từ Server (do Streamer gửi)...');
      if (peerRef.current) {
        peerRef.current.signal(signalData);
      }
    });

    // (BƯỚC 23) Lắng nghe (listen) nếu Streamer "Tắt app" (disconnect)
    socketRef.current.on('streamer-disconnected', () => {
      console.warn('(Viewer) Lỗi: Streamer (Máy quay) đã ngắt kết nối!');
      setStatusText('Lỗi: Streamer (Máy quay) đã Offline.');
      
      // (BƯỚC 23) Gọi hàm "Dừng Xem" (để "dọn dẹp" (cleanup) P2P)
      handleDisconnect();
    });
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
    socketRef.current.on('disconnect', () => {
      setStatusText('Offline - Đã ngắt kết nối');
      console.log('(Viewer) Đã ngắt kết nối.');
      setIsConnected(false);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      // (BƯỚC 22) XÓA luồng (stream)
      streamRef.current = null; 
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
  
  // (BƯỚC 22) Cập nhật JSX (thêm nút Ghi hình)
  return (
    <div className="app-container">
      <div className="connection-controls">
        {/* (Input (ID) và Input (Pass) giữ nguyên) */}
        <input 
          type="text"
          placeholder="Nhập Mã Camera"
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
        
        {/* (Nút 'Xem Stream' / 'Dừng Xem', giữ nguyên) */}
        {isConnected ? (
          <button onClick={handleDisconnect} className="disconnect-button">
            Dừng Xem
          </button>
        ) : (
          <button onClick={handleConnect} className="connect-button">
            Xem Stream
          </button>
        )}
        
        {/* (BƯỚC 22) NÚT GHI HÌNH MỚI */}
        {/* (Chỉ hiện khi ĐÃ kết nối) */}
        {isConnected && (
          isRecording ? (
            // Nếu ĐANG Ghi -> Hiện nút Dừng (Đỏ)
            <button onClick={handleStopRecording} className="stop-record-button">
              Dừng Ghi (Stop)
            </button>
          ) : (
            // Nếu CHƯA Ghi -> Hiện nút Bắt đầu (Xanh lá)
            <button onClick={handleStartRecording} className="start-record-button">
              Bắt đầu Ghi (Record)
            </button>
          )
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
