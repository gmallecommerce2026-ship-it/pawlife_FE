import { BASE_URL } from '@/api/axiosClient';
import * as SecureStore from 'expo-secure-store'; // Thay bằng thư viện bạn đang dùng để lưu token (VD: AsyncStorage)
import { io } from 'socket.io-client';

// 1. CHÚ Ý: Bắt buộc phải thêm '/notifications' vào sau BASE_URL
// 2. Tắt autoConnect để kiểm soát thời điểm kết nối (chỉ kết nối khi đã có token)
console.log('[socket] Connecting to:', `${BASE_URL}/notifications`);
const SOCKET_ORIGIN = 'https://api.p3tid.com';
export const socket = io(`${SOCKET_ORIGIN}/notifications`, {
  autoConnect: false,
});
socket.on('connect', () => console.log(`🟢 [${new Date().toISOString()}] connected, id=`, socket.id));
socket.on('connect_error', (err) => console.log(`🔴 [${new Date().toISOString()}] connect_error:`, err.message));
socket.on('disconnect', (reason) => console.log(`⚠️ [${new Date().toISOString()}] disconnected:`, reason));

export const connectSocket = async (token?: string) => {
  try {
    const accessToken = token || await SecureStore.getItemAsync('access_token');
    if (accessToken) {
      socket.auth = { token: accessToken };
      socket.connect();
    } else {
      console.warn("Không tìm thấy token để kết nối socket");
    }
  } catch (error) {
    console.error("Socket connection error:", error);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    if (socket.connected) {
      socket.disconnect();
    }
  }
};