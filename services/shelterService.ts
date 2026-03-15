import axiosClient from '../api/axiosClient';

export const shelterService = {
  // Lấy danh sách trạm (có hỗ trợ search)
  getShelters: async (params?: { search?: string; limit?: number; page?: number }) => {
    try {
      const response = await axiosClient.get('shelters', { params });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  // Lấy chi tiết trạm
  getShelterDetail: async (shelterId: string, petSearch?: string) => {
    try {
      const response = await axiosClient.get(`shelters/${shelterId}`, {
        params: { petSearch } // Gửi query petSearch lên server
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  getFollowedShelters: async () => {
    try {
      // Đảm bảo route này khớp với Backend API sắp tạo
      const response = await axiosClient.get('/shelters/followed');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  searchEvents: async (params?: { search?: string; limit?: number }) => {
    try {
      const response = await axiosClient.get('/events', { params });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  getSheltersNearBy: async (lat: number, lng: number, limit: number = 10) => {
    const response = await axiosClient.get('/shelters/nearby', { // Đảm bảo route này khớp với Backend
      params: { lat, lng, limit }
    });
    return response.data;
  },

  toggleFollow: async (shelterId: string) => {
    try {
      const response = await axiosClient.post(`/shelters/${shelterId}/toggle-follow`);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi toggle follow trạm cứu hộ:', error);
      throw error;
    }
  },
};