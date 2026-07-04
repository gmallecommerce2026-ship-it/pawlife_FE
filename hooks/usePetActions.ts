import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@/api/axiosClient';

interface ReportPayload {
  petId: string;
  reason: string;
  detail?: string;
  isBlockRequested?: boolean;
}

export const usePetActions = () => {
  const queryClient = useQueryClient();

  // Helper: Xóa pet khỏi cache của Matching Feed (Infinite Query)
  const removePetFromFeedCache = (petId: string) => {
    // Thay 'matching-feed' bằng query key thực tế bạn đang dùng cho danh sách quẹt
    queryClient.setQueryData(['matching-feed'], (oldData: any) => {
      if (!oldData || !oldData.pages) return oldData;
      
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          // Giả định response BE trả về mảng danh sách trong biến `data`[cite: 2]
          data: page.data.filter((pet: any) => pet.id !== petId), 
        })),
      };
    });
  };

  // 1. Mutation Ẩn Pet
  const hidePetMutation = useMutation({
    mutationFn: (petId: string) => axiosClient.post(`/pets/${petId}/hide`),
    onMutate: async (petId) => {
      // Optimistic Update: Xóa ngay khỏi UI trước khi BE phản hồi
      await queryClient.cancelQueries({ queryKey: ['matching-feed'] });
      removePetFromFeedCache(petId);
    },
    onError: (_, __, context: any) => {
      // Rollback nếu cần thiết (cần lưu prev snapshot trong onMutate)
      queryClient.invalidateQueries({ queryKey: ['matching-feed'] });
    }
  });

  // 2. Mutation Report & Block Pet
  const reportPetMutation = useMutation({
    mutationFn: (payload: ReportPayload) => 
      axiosClient.post(`/pets/${payload.petId}/report`, {
        reason: payload.reason,
        detail: payload.detail,
        isBlockRequested: payload.isBlockRequested
      }),
    onMutate: async (payload) => {
      // Nếu user chọn "Report & Block", gỡ pet khỏi feed ngay lập tức
      if (payload.isBlockRequested) {
        await queryClient.cancelQueries({ queryKey: ['matching-feed'] });
        removePetFromFeedCache(payload.petId);
      }
    },
    onSuccess: () => {
      // Đảm bảo đồng bộ lại với các bộ lọc ở backend nếu cần
      queryClient.invalidateQueries({ queryKey: ['search-pets'] });
    }
  });

  return { hidePetMutation, reportPetMutation };
};