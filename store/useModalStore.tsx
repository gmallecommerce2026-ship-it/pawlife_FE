import { create } from 'zustand';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onConfirm?: () => void;
  showModal: (params: Omit<ModalState, 'isOpen' | 'showModal' | 'hideModal'>) => void;
  hideModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  buttonText: 'Submit', // Default text
  onConfirm: undefined,
  
  // Action để gọi Modal ở bất kỳ đâu
  showModal: ({ title, message, buttonText, onConfirm }) => 
    set({ isOpen: true, title, message, buttonText: buttonText || 'Submit', onConfirm }),
    
  // Action để đóng Modal
  hideModal: () => set({ isOpen: false, onConfirm: undefined }),
}));