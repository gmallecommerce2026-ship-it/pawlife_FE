import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
// SỬA QUAN TRỌNG: Import axiosClient thay vì axios mặc định
import axiosClient from '@/api/axiosClient'; // Đảm bảo đường dẫn này trỏ đúng tới file cấu hình axios của bạn

// Bổ sung import LanguageContext
import { useLanguage } from '@/contexts/LanguageContext';

interface UploadOptions {
  folder: string;         // 'avatars', 'pets', 'posts'...
  aspect?: [number, number]; // [1, 1] cho avatar vuông, [4, 3] cho ảnh thường
  quality?: number;       // 0 -> 1 (0.8 là tối ưu)
}

export const useImageUpload = () => {
  // Khởi tạo ngôn ngữ
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pickAndUploadImage = async (options: UploadOptions): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Mở thư viện ảnh
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: options.aspect || [4, 3],
        quality: options.quality || 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        // (Không cần gọi setIsUploading(false) ở đây nữa vì đã có khối finally lo)
        return null; // User huỷ chọn ảnh
      }

      const fileUri = result.assets[0].uri;

      const fileName = fileUri.split('/').pop() || `image-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(fileName);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const fileType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      // 2. Lấy Presigned URL từ Backend
      const presignedRes = await axiosClient.post('/storage/presigned-url', {
        fileName,
        fileType,
        folder: options.folder,
      });

      const { uploadUrl, fileUrl } = presignedRes.data;

      // 3. Đọc file thành Blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // 4. Upload trực tiếp lên Cloudflare R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': fileType,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to Cloudflare R2 failed: ${uploadRes.status}`);
      }

      // 5. Trả về link ảnh công khai
      return fileUrl;

    } catch (error: any) {
      if (error.response) {
        console.error(isVi ? 'Lỗi Axios chi tiết:' : 'Detailed Axios error:', error.response.status, error.response.data);
      } else {
        console.error(isVi ? 'Lỗi upload ảnh:' : 'Image upload error:', error.message || error);
      }

      // Xử lý song ngữ cho UI Error Message
      setUploadError(isVi ? 'Không thể tải ảnh lên. Vui lòng kiểm tra lại máy chủ!' : 'Cannot upload image. Please check the server!');
      return null;
    } finally {
      // BỔ SUNG KHỐI FINALLY: Đảm bảo luôn tắt loading dù thành công hay thất bại
      setIsUploading(false);
    }
  };
  const uploadOnly = async (uri: string, folder: string = 'pets'): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileName = uri.split('/').pop() || `image-${Date.now()}.jpg`;
      const fileType = 'image/jpeg';

      const presignedRes = await axiosClient.post('/storage/presigned-url', {
        fileName, fileType, folder
      });
      const { uploadUrl, fileUrl } = presignedRes.data;

      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': fileType } });

      if (!uploadRes.ok) throw new Error(`Upload to Cloudflare R2 failed: ${uploadRes.status}`);
      return fileUrl;
    } catch (e: any) {
      console.error('[uploadOnly] error:', e?.response?.data || e?.message || e);
      return null;
    } finally {
      setIsUploading(false);
    }
  };


  return { pickAndUploadImage, uploadOnly, isUploading, uploadError };
};