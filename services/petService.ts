import axiosClient from '../api/axiosClient';

export interface SwipePayload {
  action: 'LIKE' | 'PASS';
}

export const petService = {
  // Đã bỏ tham số userId thừa, chỉ giữ lại limit, lat và lng
  getFeed: async (limit: number = 10, lat?: number, lng?: number) => {
    const response = await axiosClient.get('/pets/feed', {
      params: {
        limit,
        lat,
        lng
      }
    });
    return response.data;
  },

  swipePet: async (petId: string, data: SwipePayload) => {
    try {
      const response = await axiosClient.post(`pets/${petId}/swipe`, data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  favoritePet: async (petId: string) => {
    try {
      const response = await axiosClient.post(`pets/${petId}/favorite`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  unfavoritePet: async (petId: string) => {
    try {
      const response = await axiosClient.delete(`pets/${petId}/favorite`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  getFavorites: async () => {
    try {
      const response = await axiosClient.get('pets/favorites');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  addPet: async (data: any) => {
    try {
      const response = await axiosClient.post('/pets', data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },
  
  getMyPets: async () => {
    const response = await axiosClient.get('/pets/my-pets');
    return response.data;
  },

  searchPets: async (params?: { search?: string; type?: string; limit?: number }) => {
    try {
      const response = await axiosClient.get('/pets', { params });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  getPetById: async (id: string) => {
    try {
      const response = await axiosClient.get(`/pets/${id}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  updatePet: async (id: string, data: any) => {
    try {
      const response = await axiosClient.patch(`/pets/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  deletePet: async (id: string) => {
    try {
      const response = await axiosClient.delete(`/pets/${id}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  toggleLostMode: async (petId: string, isLost: boolean) => {
    try {
      const response = await axiosClient.patch(`/pets/${petId}/lost-mode`, { isLost });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },
};