import axiosClient from '../api/axiosClient';

export const eventService = {
  // Lấy danh sách sự kiện sắp tới cho màn Home
  getUpcomingEvents: async (limit: number = 5) => {
    const response = await axiosClient.get(`/events/upcoming`, {
      params: { limit }
    });
    return response.data; // { success: true, data: [...] }
  },

  // Lấy chi tiết sự kiện cho EventDetailScreen
  getEventDetail: async (eventId: string, userId?: string) => {
    const response = await axiosClient.get(`/events/${eventId}`, {
      params: { userId }
    });
    return response.data;
  },

  // Gửi action Quan tâm sự kiện (Thay userId bằng auth context nếu có)
  toggleInterest: async (eventId: string, userId: string) => {
    const response = await axiosClient.post(`/events/${eventId}/interest`, { userId });
    return response.data;
  },
  reportEvent: async (eventId: string, userId: string, data: any) => {
    return axiosClient.post(`/events/${eventId}/report`, { userId, ...data });
  },
  hideEvent: async (eventId: string, userId: string) => {
    return axiosClient.post(`/events/${eventId}/hide`, { userId });
  },
  getInterestedEvents: async (userId: string) => {
    const response = await axiosClient.get(`/events/interested/user`, {
      params: { userId }
    });
    return response.data;
  },

  searchEvents: async (params?: { search?: string; limit?: number }) => {
    try {
      const response = await axiosClient.get('/events', { params });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  }
};