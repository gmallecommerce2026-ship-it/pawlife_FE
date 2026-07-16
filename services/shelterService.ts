import axiosClient from '../api/axiosClient';

export const shelterService = {
  getShelters: async (params?: { search?: string; limit?: number; page?: number; userId?: string }) => {
    try {
      const response = await axiosClient.get('shelters', { params });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },
  getBlockedShelters: async () => {
    const response = await axiosClient.get('/interactions/blocked-shelters');
    return response.data.data;
  },

  unblockShelter: async (shelterId: string) => {
    const response = await axiosClient.post('/interactions/unblock-shelter', { shelterId });
    return response.data;
  },
  getOrganizerProfile: async (shelterId: string, userId?: string) => {
    try {
      const response = await axiosClient.get(`shelters/${shelterId}/organizer-profile`, {
        params: { userId }
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  // 2. Thêm userId vào hàm Detail
  getShelterDetail: async (shelterId: string, userId?: string, petSearch?: string) => {
    try {
      const response = await axiosClient.get(`shelters/${shelterId}`, {
        params: { userId, petSearch }
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },
  blockShelter: async (shelterId: string) => {
    try {
      const response = await axiosClient.post(`/shelters/${shelterId}/block`);
      return response.data;
    } catch (error: any) {
      console.error('Lỗi khi chặn trạm cứu hộ:', error);
      throw error.response?.data || { message: error.message };
    }
  },
  reportShelter: async (shelterId: string, reportData: { reason: string, detail: string }) => {
    try {
      const response = await axiosClient.post(`/shelters/${shelterId}/report`, reportData);
      return response.data;
    } catch (error: any) {
      console.error('Lỗi khi gửi báo cáo:', error);
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