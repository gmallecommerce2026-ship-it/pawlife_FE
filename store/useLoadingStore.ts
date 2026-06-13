// store/useLoadingStore.ts
import { create } from 'zustand';

interface LoadingState {
  isGlobalLoading: boolean;
  showGlobalLoader: () => void;
  hideGlobalLoader: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isGlobalLoading: false,
  showGlobalLoader: () => set({ isGlobalLoading: true }),
  hideGlobalLoader: () => set({ isGlobalLoading: false }),
}));