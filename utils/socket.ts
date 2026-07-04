import { BASE_URL } from '@/api/axiosClient';
import * as SecureStore from 'expo-secure-store'; // Thay bằng thư viện bạn đang dùng để lưu token (VD: AsyncStorage)
import { io } from 'socket.io-client';

// 1. CHÚ Ý: Bắt buộc phải thêm '/notifications' vào sau BASE_URL
// 2. Tắt autoConnect để kiểm soát thời điểm kết nối (chỉ kết nối khi đã có token)
export const socket = io(`${BASE_URL}/notifications`, {
  autoConnect: false,
});

// Hàm này dùng để gọi sau khi đăng nhập thành công HOẶC khi app khởi động và check thấy đã login
export const connectSocket = async (token?: string) => {
  try {
    // Nếu gọi lúc login, bạn có thể truyền thẳng token vào. 
    // Nếu gọi lúc app khởi động, tự động lấy từ storage.
    const accessToken = token || await SecureStore.getItemAsync('access_token'); // Đổi lại đúng key lưu token của bạn

    if (accessToken) {
      socket.auth = { token: accessToken }; // Backend lấy token từ đây
      socket.connect();
    } else {
      console.warn("Không tìm thấy token để kết nối socket");
    }
  } catch (error) {
    console.error("Socket connection error:", error);
  }
};

// Hàm này dùng để gọi khi User Logout
export const disconnectSocket = () => {
  if (socket) {
    // 1. Tắt tất cả các sự kiện hiện có trước khi ngắt kết nối
    socket.removeAllListeners();

    // 2. Ngắt kết nối
    if (socket.connected) {
      socket.disconnect();
    }
  }
};